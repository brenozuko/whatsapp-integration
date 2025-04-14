import { Client, RemoteAuth } from "whatsapp-web.js";
import { getWhatsAppStore } from "../lib/whatsapp-store";
import { Contact } from "../models/Contact";
import { IIntegration, Integration } from "../models/Integration";
import {
  emitContactsStatus,
  emitWhatsAppStatus,
  WhatsAppStatus,
} from "./socket";

let client: Client | null = null;
let qrCode: string | null = null;
let connectionState: "loading" | "ready" | "disconnected" | "error" =
  "disconnected";
let isAddingContacts = false;
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

export const getCurrentIntegration = () => {
  return currentIntegration;
};
