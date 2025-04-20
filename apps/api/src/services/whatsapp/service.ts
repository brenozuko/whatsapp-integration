import { Client, Message } from "whatsapp-web.js";
import { prisma } from "../../lib/prisma";
import {
  emitContactsStatus,
  emitWhatsAppStatus,
  WhatsAppStatus,
} from "../../server/socket";

let client: Client | null = null;
let qrCode: string | null = null;
let connectionState: "loading" | "ready" | "disconnected" | "error" =
  "disconnected";
let isAddingContacts = false;
let isConnected = false;
let contactsSyncProgress = {
  total: 0,
  processed: 0,
  currentContact: null as string | null,
};

const saveContacts = async () => {
  if (!client || !isConnected) {
    console.error("No WhatsApp connection is active");
    return;
  }

  try {
    isAddingContacts = true;
    contactsSyncProgress = {
      total: 0,
      processed: 0,
      currentContact: null,
    };
    emitContactsStatus({
      isAddingContacts: true,
      syncProgress: contactsSyncProgress,
    });

    const contacts = await client.getContacts();
    contactsSyncProgress.total = contacts.length;
    emitContactsStatus({
      isAddingContacts: true,
      syncProgress: contactsSyncProgress,
    });

    const BATCH_SIZE = 50;
    const contactData = [];

    for (const contact of contacts) {
      try {
        if (!contact.name && !contact.pushname) continue;

        contactsSyncProgress.currentContact =
          contact.name || contact.pushname || contact.number;
        emitContactsStatus({
          isAddingContacts: true,
          syncProgress: contactsSyncProgress,
        });

        const profilePicture = await contact.getProfilePicUrl();

        contactData.push({
          name: contact.name || contact.pushname,
          phone: contact.number,
          profilePicture,
          messageCount: 0,
          lastMessageDate: new Date(),
        });

        contactsSyncProgress.processed++;
        emitContactsStatus({
          isAddingContacts: true,
          syncProgress: contactsSyncProgress,
        });

        // Process in batches to avoid memory issues
        if (contactData.length >= BATCH_SIZE) {
          await prisma.contact.createMany({
            data: contactData,
            skipDuplicates: true,
          });
          contactData.length = 0; // Clear the array
        }
      } catch (error) {
        console.error(`Error processing contact ${contact.number}:`, error);
        // Continue with next contact even if one fails
      }
    }

    // Process any remaining contacts
    if (contactData.length > 0) {
      await prisma.contact.createMany({
        data: contactData,
        skipDuplicates: true,
      });
    }

    console.log(
      `Successfully saved ${contactsSyncProgress.processed} contacts to the database`
    );
  } catch (error) {
    console.error("Error saving contacts:", error);
  } finally {
    isAddingContacts = false;
    contactsSyncProgress = {
      total: 0,
      processed: 0,
      currentContact: null,
    };
    emitContactsStatus({
      isAddingContacts: false,
      syncProgress: contactsSyncProgress,
    });
  }
};

const updateContactOnMessage = async (msg: Message) => {
  if (!client || !isConnected) return;

  const contact = await msg.getContact();
  const chat = await contact.getChat();
  const messages = await chat.fetchMessages({});

  await prisma.contact.update({
    where: {
      phone: contact.number,
    },
    data: {
      messageCount: messages?.length || 0,
      lastMessageDate: messages[0]?.timestamp
        ? new Date(messages[0].timestamp * 1000)
        : new Date(),
    },
  });
};

export const initializeWhatsApp = async () => {
  if (client) {
    return client;
  }

  try {
    client = new Client({
      puppeteer: {
        args: ["--no-sandbox"],
      },
    });

    connectionState = "loading";
    isConnected = false;

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

      const status: WhatsAppStatus = {
        qrCode: null,
        isConnected: true,
        connectionState,
      };

      emitWhatsAppStatus(status);
      await saveContacts();
    });

    client.on("disconnected", async () => {
      console.log("Client disconnected");
      connectionState = "disconnected";
      isConnected = false;
      client = null;

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
      client = null;

      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState,
      });
    });

    client.on("message", async (msg) => {
      await updateContactOnMessage(msg);
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
    throw error;
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

export const getCurrentUser = () => {
  if (!isConnected) return null;

  return {
    isConnected,
  };
};

export const disconnectWhatsApp = async () => {
  try {
    if (client) {
      await client.destroy();
      client = null;
      isConnected = false;
      connectionState = "disconnected";

      // Delete all contacts from the database
      await prisma.contact.deleteMany({});

      // Emit disconnected status
      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState,
      });

      return true;
    }
    return false;
  } catch (error) {
    console.error("Error disconnecting WhatsApp:", error);
    return false;
  }
};
