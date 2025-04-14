import { Client, LocalAuth } from "whatsapp-web.js";
import { prisma } from "../lib/prisma";
import {
  emitContactsStatus,
  emitWhatsAppStatus,
  WhatsAppStatus,
} from "../lib/socket";

let client: Client | null = null;
let qrCode: string | null = null;
let connectionState: "loading" | "ready" | "disconnected" | "error" =
  "disconnected";
let isAddingContacts = false;
let isAddingMessages = false;

let isConnected = false;

const saveContacts = async (client: Client) => {
  try {
    isAddingContacts = true;
    emitContactsStatus({ isAddingContacts: true });

    if (!isConnected) {
      console.error("No WhatsApp connection is active");
      return;
    }

    const contacts = await client.getContacts();

    for (const contact of contacts) {
      if (contact.number) {
        // Check if contact already exists
        const existingContact = await prisma.contact.findUnique({
          where: {
            phone: contact.number,
          },
        });

        if (existingContact) {
          // Update existing contact
          await prisma.contact.update({
            where: {
              id: existingContact.id,
            },
            data: {
              name: contact.name || contact.number,
            },
          });
        } else {
          // Create new contact
          await prisma.contact.create({
            data: {
              name: contact.name || contact.number,
              phone: contact.number,
            },
          });
        }
      }
    }

    console.log(
      `Successfully saved ${contacts.length} contacts to the database for user`
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

    if (!isConnected) {
      console.error("No WhatsApp connection is active");
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
      const contact = await prisma.contact.findFirst({
        where: {
          phone: contactId,
        },
      });

      if (!contact || !contact.id) {
        console.log(`No contact found for chat ${chat.name} (${contactId})`);
        continue;
      }

      processedContacts.add(contact.id);

      // Fetch messages for this chat
      const messages = await chat.fetchMessages({ limit: 100 });
      console.log(
        `Found ${messages.length} messages for contact ${contact.name}`
      );

      // Save messages to database
      for (const msg of messages) {
        // Skip if message is not valid (no body or ID)
        if (!msg.id || (!msg.body && !msg.hasMedia)) continue;

        // Check if message already exists
        const existingMessage = await prisma.message.findUnique({
          where: {
            messageId: msg.id._serialized,
          },
        });

        if (existingMessage) {
          // Update existing message
          await prisma.message.update({
            where: {
              id: existingMessage.id,
            },
            data: {
              body: msg.body || "(Media message)",
              from: msg.from,
              to: msg.to,
              fromMe: msg.fromMe,
              timestamp: msg.timestamp
                ? new Date(msg.timestamp * 1000)
                : new Date(),
            },
          });
        } else {
          // Create new message
          await prisma.message.create({
            data: {
              messageId: msg.id._serialized,
              body: msg.body || "(Media message)",
              from: msg.from,
              to: msg.to,
              fromMe: msg.fromMe,
              contactId: contact.id,
              timestamp: msg.timestamp
                ? new Date(msg.timestamp * 1000)
                : new Date(),
            },
          });
        }

        totalMessages++;
      }

      // Update contact with message count and last message date
      const messageCount = await prisma.message.count({
        where: {
          contactId: contact.id,
        },
      });

      const lastMessage = await prisma.message.findFirst({
        where: {
          contactId: contact.id,
        },
        orderBy: {
          timestamp: "desc",
        },
      });

      await prisma.contact.update({
        where: {
          id: contact.id,
        },
        data: {
          messageCount,
          lastMessageDate: lastMessage?.timestamp || new Date(),
        },
      });
    }

    // Process all contacts that have messages in the database
    // but weren't updated in the loop above
    const contactsWithMessages = await prisma.message.findMany({
      distinct: ["contactId"],
      select: {
        contactId: true,
      },
    });

    for (const { contactId } of contactsWithMessages) {
      if (!processedContacts.has(contactId)) {
        const messageCount = await prisma.message.count({
          where: {
            contactId,
          },
        });

        const lastMessage = await prisma.message.findFirst({
          where: {
            contactId,
          },
          orderBy: {
            timestamp: "desc",
          },
        });

        await prisma.contact.update({
          where: {
            id: contactId,
          },
          data: {
            messageCount,
            lastMessageDate: lastMessage?.timestamp || new Date(),
          },
        });
      }
    }

    console.log(`Successfully saved ${totalMessages} messages for user`);
  } catch (error) {
    console.error("Error saving messages:", error);
  } finally {
    isAddingMessages = false;
    emitContactsStatus({ isAddingContacts: false, isAddingMessages: false });
  }
};

export const initializeWhatsApp = async () => {
  if (client) return client;

  try {
    const auth = new LocalAuth();
    client = new Client({
      authStrategy: auth,
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
      isConnected = true;

      if (!client || !client.info) {
        console.error("Client info not available");
        return;
      }

      const status: WhatsAppStatus = {
        qrCode: null,
        isConnected: true,
        connectionState,
      };

      emitWhatsAppStatus(status);

      if (client) {
        await saveContacts(client);
        await saveMessages(client);
      }
    });

    client.on("disconnected", async () => {
      console.log("Client disconnected");
      connectionState = "disconnected";
      isConnected = false;

      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState,
      });
    });

    client.on("auth_failure", async () => {
      console.log("Authentication failed");
      connectionState = "error";
      isConnected = false;

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
      if (!isConnected) return;

      try {
        // Find contact from the sender
        const phone = msg.from.split("@")[0];

        const contact = await prisma.contact.findFirst({
          where: {
            phone,
          },
        });

        if (!contact || !contact.id) {
          console.log(`Received message from unknown contact: ${phone}`);
          return;
        }

        // Check if message already exists
        const existingMessage = await prisma.message.findUnique({
          where: {
            messageId: msg.id._serialized,
          },
        });

        if (existingMessage) {
          // Update existing message
          await prisma.message.update({
            where: {
              id: existingMessage.id,
            },
            data: {
              body: msg.body || "(Media message)",
              from: msg.from,
              to: msg.to,
              fromMe: msg.fromMe,
              timestamp: msg.timestamp
                ? new Date(msg.timestamp * 1000)
                : new Date(),
            },
          });
        } else {
          // Create new message
          await prisma.message.create({
            data: {
              messageId: msg.id._serialized,
              body: msg.body || "(Media message)",
              from: msg.from,
              to: msg.to,
              fromMe: msg.fromMe,
              contactId: contact.id,
              timestamp: msg.timestamp
                ? new Date(msg.timestamp * 1000)
                : new Date(),
            },
          });
        }

        // Update contact message count
        const messageCount = await prisma.message.count({
          where: {
            contactId: contact.id,
          },
        });

        await prisma.contact.update({
          where: {
            id: contact.id,
          },
          data: {
            messageCount,
            lastMessageDate: new Date(),
          },
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

export const getCurrentUser = () => {
  if (!isConnected) return null;

  return {
    isConnected,
  };
};
