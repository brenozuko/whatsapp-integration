import { log } from "@repo/logger";
import http from "http";
import { prisma } from "./lib/db";
import { createServer } from "./server";
import { initializeSocket } from "./services/socket";
import {
  getConnectionState,
  getIsAddingContacts,
  getQrCode,
  initializeWhatsApp,
} from "./services/whatsapp";

const port = process.env.PORT || 3000;
const app = createServer();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Initialize WhatsApp client
initializeWhatsApp();

// Define routes before listening
app.get("/whatsapp/connect", (_, res) => {
  const client = initializeWhatsApp();
  return res.json({
    qrCode: getQrCode(),
    isConnected: client.info ? true : false,
    connectionState: getConnectionState(),
  });
});

app.get("/whatsapp/contacts-status", (_, res) => {
  return res.json({
    isAddingContacts: getIsAddingContacts(),
  });
});

app.get("/whatsapp/contacts", async (_, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

server.listen(port, () => {
  log(`api running on ${port}`);
});
