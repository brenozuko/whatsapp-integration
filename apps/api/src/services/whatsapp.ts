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

const isPhoneNumber = (str: string): boolean => {
  // Remove any non-digit characters
  const digits = str.replace(/\D/g, "");
  // Check if the string contains only digits and has a reasonable length for a phone number
  return /^\d+$/.test(digits) && digits.length >= 8 && digits.length <= 15;
};

const saveContacts = async (client: Client) => {
  try {
    isAddingContacts = true;
    emitContactsStatus({ isAddingContacts: true });

    if (!isConnected) {
      console.error("No WhatsApp connection is active");
      return;
    }

    const contacts = await client.getContacts();
    const chats = await client.getChats();

    // Create a map of phone numbers to chat objects for quick lookup
    const chatMap = new Map();
    for (const chat of chats) {
      if (!chat.isGroup) {
        chatMap.set(chat.id.user, chat);
      }
    }

    for (const contact of contacts) {
      if (contact.number) {
        // Skip contacts without a valid name or if pushname is a phone number
        if (
          !contact.name ||
          (contact.pushname && isPhoneNumber(contact.pushname))
        ) {
          console.log(
            `Skipping contact ${contact.number} - no valid name or pushname is a phone number`
          );
          continue;
        }

        // Check if we have a chat with this contact
        const chat = chatMap.get(contact.number);
        let messageCount = 0;
        let lastMessageDate = new Date();

        // If chat exists, get message count without fetching all messages
        if (chat) {
          try {
            // Get just one message to check if there are any
            const messages = await chat.fetchMessages({ limit: 1 });
            if (messages.length > 0) {
              messageCount = chat.unreadCount || 0;
              // Since chat exists, we need to get the actual count from the chat
              const chatMessages = await prisma.message.count({
                where: {
                  from: { contains: contact.number },
                  OR: [{ to: { contains: contact.number } }],
                },
              });
              messageCount = Math.max(messageCount, chatMessages);

              // Get last message timestamp
              lastMessageDate = messages[0].timestamp
                ? new Date(messages[0].timestamp * 1000)
                : new Date();
            }
          } catch (err) {
            console.error(
              `Error getting message count for ${contact.number}:`,
              err
            );
          }
        }

        await prisma.contact.upsert({
          where: {
            phone: contact.number,
          },
          update: {
            name: contact.name,
            profilePicture: await contact.getProfilePicUrl(),
            messageCount,
            lastMessageDate,
          },
          create: {
            name: contact.name,
            phone: contact.number,
            profilePicture: await contact.getProfilePicUrl(),
            messageCount,
            lastMessageDate,
          },
        });
      }
    }

    console.log(`Successfully saved contacts to the database for user`);
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
    let totalChatsProcessed = 0;
    const processedContacts = new Set();

    // Process each chat - but only those with unread messages or no message history
    for (const chat of chats) {
      // Skip group chats
      if (chat.isGroup) continue;

      // Try to find the contact based on the chat ID
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

      // Check if this contact needs message syncing
      const hasExistingMessages = contact.messageCount > 0;
      const hasUnreadMessages = chat.unreadCount > 0;

      // Skip if we already have messages and nothing new
      if (hasExistingMessages && !hasUnreadMessages) {
        console.log(`Skipping chat ${chat.name} - no new messages`);
        continue;
      }

      processedContacts.add(contact.id);
      totalChatsProcessed++;

      // Fetch messages for this chat - limit to recent ones for efficiency
      const messages = await chat.fetchMessages({ limit: 50 });
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
          // Skip existing messages that don't need updates
          continue;
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
          totalMessages++;
        }
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

    console.log(
      `Successfully saved ${totalMessages} new messages across ${totalChatsProcessed} chats`
    );
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

      // Process contacts and messages in sequence
      if (client) {
        console.log("Starting contact synchronization...");
        await saveContacts(client);

        // Only proceed with message sync if we have contacts
        const contactCount = await prisma.contact.count();
        if (contactCount > 0) {
          console.log("Starting message synchronization...");
          await saveMessages(client);
        } else {
          console.log("No contacts found, skipping message synchronization");
        }
        console.log("WhatsApp synchronization complete");
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
      if (!isConnected || !client) return;

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
          // Try to add this as a new contact
          try {
            const remoteContact = await client.getContactById(msg.from);
            if (remoteContact) {
              const newContact = await prisma.contact.create({
                data: {
                  name: remoteContact.name || remoteContact.pushname || phone,
                  phone,
                  profilePicture: await remoteContact.getProfilePicUrl(),
                  messageCount: 1,
                  lastMessageDate: new Date(),
                },
              });

              // Now create the message with the new contact
              await prisma.message.create({
                data: {
                  messageId: msg.id._serialized,
                  body: msg.body || "(Media message)",
                  from: msg.from,
                  to: msg.to,
                  fromMe: msg.fromMe,
                  contactId: newContact.id,
                  timestamp: msg.timestamp
                    ? new Date(msg.timestamp * 1000)
                    : new Date(),
                },
              });
            }
          } catch (err) {
            console.error(`Error creating contact for ${phone}:`, err);
          }
          return;
        }

        // Check if message already exists - if so, skip
        const existingMessage = await prisma.message.findUnique({
          where: {
            messageId: msg.id._serialized,
          },
        });

        if (existingMessage) {
          return; // Skip if we already have this message
        }

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

        // Update contact message count - use increment to avoid race conditions
        await prisma.contact.update({
          where: {
            id: contact.id,
          },
          data: {
            messageCount: {
              increment: 1,
            },
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
