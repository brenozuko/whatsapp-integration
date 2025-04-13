import { log } from "@repo/logger";
import { Client, RemoteAuth } from "whatsapp-web.js";
import { prisma } from "../lib/db";
import { getWhatsAppStore } from "../lib/whatsapp-store";
import { emitContactsStatus, emitWhatsAppStatus } from "./socket";

let client: Client | null = null;
let qrCode: string | null = null;
let connectionState: "loading" | "ready" | "disconnected" | "error" =
  "disconnected";
let isAddingContacts = false;

const saveContacts = async (client: Client) => {
  try {
    isAddingContacts = true;
    emitContactsStatus({ isAddingContacts: true });

    const contacts = await client.getContacts();

    // Save each contact to the database
    for (const contact of contacts) {
      if (contact.number) {
        await prisma.contact.upsert({
          where: {
            phone: contact.number,
          },
          update: { name: contact.name || contact.number },
          create: {
            name: contact.name || contact.number,
            phone: contact.number,
          },
        });
      }
    }

    log(`Successfully saved ${contacts.length} contacts to the database`);
  } catch (error) {
    console.error("Error saving contacts:", error);
  } finally {
    isAddingContacts = false;
    emitContactsStatus({ isAddingContacts: false });
  }
};

export const initializeWhatsApp = async () => {
  if (client) return client;

  try {
    // Get MongoDB store for session persistence
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
      log("Client is ready!");
      connectionState = "ready";
      qrCode = null;
      emitWhatsAppStatus({
        qrCode: null,
        isConnected: true,
        connectionState,
      });

      if (client) {
        await saveContacts(client);
      }
    });

    client.on("disconnected", () => {
      log("Client disconnected");
      connectionState = "disconnected";
      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState,
      });
    });

    client.on("auth_failure", () => {
      log("Authentication failed");
      connectionState = "error";
      emitWhatsAppStatus({
        qrCode: null,
        isConnected: false,
        connectionState,
      });
    });

    client.on("change_state", (state) => {
      log("Client state changed:", state);
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
