import { Client, NoAuth } from "whatsapp-web.js";
import { prisma } from "../lib/db";

let client: Client | null = null;
let qrCode: string | null = null;
let connectionState: "loading" | "ready" | "disconnected" | "error" =
  "disconnected";
let lastQrCode: string | null = null;
let isAddingContacts = false;

const saveContacts = async (client: Client) => {
  try {
    isAddingContacts = true;
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

    console.log(
      `Successfully saved ${contacts.length} contacts to the database`
    );
  } catch (error) {
    console.error("Error saving contacts:", error);
  } finally {
    isAddingContacts = false;
  }
};

export const initializeWhatsApp = () => {
  if (client) return client;

  client = new Client({
    authStrategy: new NoAuth(),
    puppeteer: {
      args: ["--no-sandbox"],
    },
  });

  client.on("qr", (qr) => {
    qrCode = qr;
    lastQrCode = qr;
  });

  client.on("ready", async () => {
    console.log("Client is ready!");
    connectionState = "ready";
    qrCode = null;
    if (client) {
      await saveContacts(client);
    }
  });

  client.on("disconnected", () => {
    console.log("Client disconnected");
    connectionState = "disconnected";
  });

  client.on("auth_failure", () => {
    console.log("Authentication failed");
    connectionState = "error";
  });

  client.on("change_state", (state) => {
    console.log("Client state changed:", state);
  });

  client.initialize();

  return client;
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
