import { Client, RemoteAuth } from "whatsapp-web.js";
import {
  emitContactsStatus,
  emitWhatsAppStatus,
  WhatsAppStatus,
} from "../lib/socket";
import { getWhatsAppStore } from "../lib/whatsapp-store";
import { Contact } from "../models/Contact";
import { IIntegration, Integration } from "../models/Integration";
import { Message } from "../models/Message";

let client: Client | null = null;
let qrCode: string | null = null;
let connectionState: "loading" | "ready" | "disconnected" | "error" =
  "disconnected";
let isAddingContacts = false;
let isAddingMessages = false;
let currentIntegration: IIntegration | null = null;

const saveContacts = async (client: Client) => {
  try {
    isAddingContacts = true;
    emitContactsStatus({ isAddingContacts: true });

    if (!currentIntegration) {
      console.error("No integration is currently connected");
      return;
    }

    const contacts = await client.getContacts();

    for (const contact of contacts) {
      if (contact.number) {
        await Contact.findOneAndUpdate(
          { phone: contact.number, integration: currentIntegration._id },
          {
            name: contact.name || contact.number,
            phone: contact.number,
            integration: currentIntegration._id,
          },
          { upsert: true, new: true }
        );
      }
    }

    console.log(
      `Successfully saved ${contacts.length} contacts to the database for user ${currentIntegration.userName}`
    );
  } catch (error) {
    console.error("Error saving contacts:", error);
  } finally {
    isAddingContacts = false;
    emitContactsStatus({ isAddingContacts: false });
  }
};

const saveMessages = async (client: Client) => {
  try {
    isAddingMessages = true;
    emitContactsStatus({ isAddingContacts: false, isAddingMessages: true });

    if (!currentIntegration) {
      console.error("No integration is currently connected");
      return;
    }

    // Get all chats
    const chats = await client.getChats();
    console.log(`Found ${chats.length} chats to process`);

    let totalMessages = 0;
    const processedContacts = new Set();

    // Process each chat
    for (const chat of chats) {
      // Skip group chats
      if (chat.isGroup) continue;

      // Try to find the contact based on the chat ID (which is a phone number with some formatting)
      const contactId = chat.id.user;

      // Find the contact in our database
      const contact = await Contact.findOne({
        phone: contactId,
        integration: currentIntegration._id,
      });

      if (!contact || !contact._id) {
        console.log(`No contact found for chat ${chat.name} (${contactId})`);
        continue;
      }

      processedContacts.add(contact._id.toString());

      // Fetch messages for this chat
      const messages = await chat.fetchMessages({ limit: 100 });
      console.log(
        `Found ${messages.length} messages for contact ${contact.name}`
      );

      // Save messages to database
      for (const msg of messages) {
        // Skip if message is not valid (no body or ID)
        if (!msg.id || (!msg.body && !msg.hasMedia)) continue;

        // Create or update message record
        await Message.findOneAndUpdate(
          { messageId: msg.id._serialized },
          {
            messageId: msg.id._serialized,
            body: msg.body || "(Media message)",
            from: msg.from,
            to: msg.to,
            fromMe: msg.fromMe,
            contact: contact._id,
            integration: currentIntegration._id,
            timestamp: msg.timestamp
              ? new Date(msg.timestamp * 1000)
              : new Date(),
          },
          { upsert: true, new: true }
        );

        totalMessages++;
      }

      // Update contact with message count and last message date
      const messageCount = await Message.countDocuments({
        contact: contact._id,
      });
      const lastMessage = await Message.findOne({ contact: contact._id }).sort({
        timestamp: -1,
      });

      await Contact.findByIdAndUpdate(contact._id, {
        messageCount,
        lastMessageDate: lastMessage?.timestamp || new Date(),
      });
    }

    // Process all contacts that have messages in the database
    // but weren't updated in the loop above
    const contactsWithMessages = await Message.distinct("contact", {
      integration: currentIntegration._id,
    });

    for (const contactId of contactsWithMessages) {
      const contactIdStr = contactId.toString();
      if (!processedContacts.has(contactIdStr)) {
        const messageCount = await Message.countDocuments({
          contact: contactId,
        });
        const lastMessage = await Message.findOne({ contact: contactId }).sort({
          timestamp: -1,
        });

        await Contact.findByIdAndUpdate(contactId, {
          messageCount,
          lastMessageDate: lastMessage?.timestamp || new Date(),
        });
      }
    }

    console.log(
      `Successfully saved ${totalMessages} messages for user ${currentIntegration.userName}`
    );
  } catch (error) {
    console.error("Error saving messages:", error);
  } finally {
    isAddingMessages = false;
    emitContactsStatus({ isAddingContacts: false, isAddingMessages: false });
  }
};

export const initializeWhatsApp = async (
  userName?: string,
  userPhone?: string
) => {
  if (client) return client;

  try {
    const store = await getWhatsAppStore();

    client = new Client({
      authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 300000, // Sync every 5 minutes
      }),
      puppeteer: {
        args: ["--no-sandbox"],
      },
    });

    client.on("qr", (qr) => {
      qrCode = qr;
      emitWhatsAppStatus({
        qrCode,
        isConnected: false,
        connectionState,
      });
    });

    client.on("ready", async () => {
      console.log("Client is ready!");
      connectionState = "ready";
      qrCode = null;

      if (!client || !client.info) {
        console.error("Client info not available");
        return;
      }

      const clientInfo = client.info;

      if (userName && userPhone) {
        // Check if an integration already exists for this phone number
        const existingIntegration = await Integration.findOne({ userPhone });

        const integration = await Integration.findOneAndUpdate(
          { userPhone },
          {
            userName,
            userPhone,
            whatsappId: clientInfo.wid._serialized,
            isConnected: true,
            lastConnection: new Date(),
          },
          { upsert: true, new: true }
        );

        if (integration) {
          currentIntegration = integration;
          if (!existingIntegration) {
            console.log(
              `New user ${integration.userName} connected with WhatsApp ID: ${integration.whatsappId}`
            );
          } else {
            console.log(
              `Existing user ${integration.userName} reconnected with WhatsApp ID: ${integration.whatsappId}`
            );
          }
        }
      }

      const status: WhatsAppStatus = {
        qrCode: null,
        isConnected: true,
        connectionState,
      };

      if (currentIntegration) {
        status.userName = currentIntegration.userName;
        status.userPhone = currentIntegration.userPhone;
      }

      emitWhatsAppStatus(status);

      if (client && currentIntegration) {
        await saveContacts(client);
        await saveMessages(client);
      }
    });

    client.on("disconnected", async () => {
      console.log("Client disconnected");
      connectionState = "disconnected";

      if (currentIntegration) {
        await Integration.findByIdAndUpdate(currentIntegration._id, {
          isConnected: false,
        });
        currentIntegration = null;
      }

      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState,
      });
    });

    client.on("auth_failure", async () => {
      console.log("Authentication failed");
      connectionState = "error";

      if (currentIntegration) {
        await Integration.findByIdAndUpdate(currentIntegration._id, {
          isConnected: false,
        });
        currentIntegration = null;
      }

      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState,
      });
    });

    client.on("change_state", (state) => {
      console.log("Client state changed:", state);
    });

    client.on("message", async (msg) => {
      if (!currentIntegration) return;

      try {
        // Find contact from the sender
        const phone = msg.from.split("@")[0];

        const contact = await Contact.findOne({
          phone,
          integration: currentIntegration._id,
        });

        if (!contact || !contact._id) {
          console.log(`Received message from unknown contact: ${phone}`);
          return;
        }

        // Save the message
        await Message.findOneAndUpdate(
          { messageId: msg.id._serialized },
          {
            messageId: msg.id._serialized,
            body: msg.body || "(Media message)",
            from: msg.from,
            to: msg.to,
            fromMe: msg.fromMe,
            contact: contact._id,
            integration: currentIntegration._id,
            timestamp: msg.timestamp
              ? new Date(msg.timestamp * 1000)
              : new Date(),
          },
          { upsert: true, new: true }
        );

        // Update contact message count
        const messageCount = await Message.countDocuments({
          contact: contact._id,
        });

        await Contact.findByIdAndUpdate(contact._id, {
          messageCount,
          lastMessageDate: new Date(),
        });
      } catch (error) {
        console.error("Error processing incoming message:", error);
      }
    });

    client.initialize();

    return client;
  } catch (error) {
    console.error("Error initializing WhatsApp client:", error);
    connectionState = "error";
    emitWhatsAppStatus({
      qrCode: null,
      isConnected: false,
      connectionState,
    });
  }
};

export const getQrCode = () => {
  return qrCode;
};

export const getConnectionState = () => {
  return connectionState;
};

export const getIsAddingContacts = () => {
  return isAddingContacts;
};

export const getIsAddingMessages = () => {
  return isAddingMessages;
};

export const getCurrentIntegration = () => {
  return currentIntegration;
};
