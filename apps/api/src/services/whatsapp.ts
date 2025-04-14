import { Client, Message } from "whatsapp-web.js";
import { prisma } from "../lib/prisma";
import {
  emitContactsStatus,
  emitWhatsAppStatus,
  WhatsAppStatus,
} from "../lib/socket";

// Store multiple clients and their states
const clients = new Map<
  string,
  {
    client: Client;
    qrCode: string | null;
    connectionState: "loading" | "ready" | "disconnected" | "error";
    isAddingContacts: boolean;
    isConnected: boolean;
  }
>();

const saveContacts = async (client: Client, integrationId: string) => {
  try {
    const clientState = clients.get(integrationId);
    if (!clientState) return;

    clientState.isAddingContacts = true;
    emitContactsStatus({ isAddingContacts: true, integrationId });

    if (!clientState.isConnected) {
      console.error("No WhatsApp connection is active");
      return;
    }

    const contacts = await client.getContacts();

    for (const contact of contacts) {
      const chat = await contact?.getChat();
      const messages = await chat?.fetchMessages({});

      await prisma.contact.upsert({
        where: {
          phone_integrationId: {
            phone: contact.number,
            integrationId: integrationId,
          },
        },
        update: {
          name: contact.name || "",
          profilePicture: await contact.getProfilePicUrl(),
          messageCount: messages.length || 0,
          lastMessageDate: messages[0].timestamp
            ? new Date(messages[0].timestamp * 1000)
            : new Date(),
        },
        create: {
          name: contact.name || "",
          phone: contact.number,
          profilePicture: await contact.getProfilePicUrl(),
          messageCount: messages.length || 0,
          lastMessageDate: messages[0].timestamp
            ? new Date(messages[0].timestamp * 1000)
            : new Date(),
          integrationId: integrationId,
        },
      });
    }

    console.log(
      `Successfully saved contacts to the database for integration ${integrationId}`
    );
  } catch (error) {
    console.error("Error saving contacts:", error);
  } finally {
    const clientState = clients.get(integrationId);
    if (clientState) {
      clientState.isAddingContacts = false;
      emitContactsStatus({ isAddingContacts: false, integrationId });
    }
  }
};

const updateContactOnMessage = async (msg: Message, integrationId: string) => {
  const clientState = clients.get(integrationId);
  if (!clientState || !clientState.isConnected) return;

  const contact = await msg.getContact();
  const chat = await contact.getChat();
  const messages = await chat.fetchMessages({});

  await prisma.contact.update({
    where: {
      phone_integrationId: {
        phone: contact.number,
        integrationId: integrationId,
      },
    },
    data: {
      messageCount: messages?.length || 0,
      lastMessageDate: messages[0].timestamp
        ? new Date(messages[0].timestamp * 1000)
        : new Date(),
    },
  });
};

export const initializeWhatsApp = async (integrationId: string) => {
  // Check if client already exists for this integration
  if (clients.has(integrationId)) {
    return clients.get(integrationId)?.client;
  }

  try {
    const client = new Client({
      puppeteer: {
        args: ["--no-sandbox"],
      },
    });

    // Initialize client state
    clients.set(integrationId, {
      client,
      qrCode: null,
      connectionState: "loading",
      isAddingContacts: false,
      isConnected: false,
    });

    client.on("qr", (qr) => {
      const clientState = clients.get(integrationId);
      if (clientState) {
        clientState.qrCode = qr;
        emitWhatsAppStatus({
          qrCode: qr,
          isConnected: false,
          connectionState: clientState.connectionState,
          integrationId,
        });
      }
    });

    client.on("ready", async () => {
      console.log(`Client is ready for integration ${integrationId}!`);
      const clientState = clients.get(integrationId);
      if (clientState) {
        clientState.connectionState = "ready";
        clientState.qrCode = null;
        clientState.isConnected = true;

        const status: WhatsAppStatus = {
          qrCode: null,
          isConnected: true,
          connectionState: clientState.connectionState,
          integrationId,
        };

        emitWhatsAppStatus(status);

        // Process contacts and messages in sequence
        await saveContacts(client, integrationId);
      }
    });

    client.on("disconnected", async () => {
      console.log(`Client disconnected for integration ${integrationId}`);
      const clientState = clients.get(integrationId);
      if (clientState) {
        clientState.connectionState = "disconnected";
        clientState.isConnected = false;

        emitWhatsAppStatus({
          qrCode: null,
          isConnected: false,
          connectionState: clientState.connectionState,
          integrationId,
        });
      }
    });

    client.on("auth_failure", async () => {
      console.log(`Authentication failed for integration ${integrationId}`);
      const clientState = clients.get(integrationId);
      if (clientState) {
        clientState.connectionState = "error";
        clientState.isConnected = false;

        emitWhatsAppStatus({
          qrCode: null,
          isConnected: false,
          connectionState: clientState.connectionState,
          integrationId,
        });
      }
    });

    // client.on("message", async (msg) => {
    //   await updateContactOnMessage(msg, integrationId);
    // });

    client.initialize();

    return client;
  } catch (error) {
    console.error(
      `Error initializing WhatsApp client for integration ${integrationId}:`,
      error
    );
    const clientState = clients.get(integrationId);
    if (clientState) {
      clientState.connectionState = "error";
      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState: clientState.connectionState,
        integrationId,
      });
    }
    throw error;
  }
};

export const getQrCode = (integrationId: string) => {
  return clients.get(integrationId)?.qrCode || null;
};

export const getConnectionState = (integrationId: string) => {
  return clients.get(integrationId)?.connectionState || "disconnected";
};

export const getIsAddingContacts = (integrationId: string) => {
  return clients.get(integrationId)?.isAddingContacts || false;
};

export const getCurrentUser = (integrationId: string) => {
  const clientState = clients.get(integrationId);
  if (!clientState?.isConnected) return null;

  return {
    isConnected: clientState.isConnected,
  };
};

export const disconnectWhatsApp = async (integrationId: string) => {
  try {
    const clientState = clients.get(integrationId);
    if (clientState) {
      await clientState.client.destroy();
      clients.delete(integrationId);

      // Delete all contacts for this integration from the database
      await prisma.contact.deleteMany({
        where: { integrationId },
      });

      // Emit disconnected status
      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState: "disconnected",
        integrationId,
      });

      return true;
    }
    return false;
  } catch (error) {
    console.error(
      `Error disconnecting WhatsApp for integration ${integrationId}:`,
      error
    );
    return false;
  }
};
