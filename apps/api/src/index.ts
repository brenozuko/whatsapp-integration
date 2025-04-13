import { log } from "@repo/logger";
import { createServer } from "./server";
import {
  getConnectionState,
  getIsAddingContacts,
  getQrCode,
  initializeWhatsApp,
} from "./services/whatsapp";

const port = process.env.PORT || 3000;
const server = createServer();

// Initialize WhatsApp client
initializeWhatsApp();

// Define routes before listening
server.get("/whatsapp/connect", (_, res) => {
  const client = initializeWhatsApp();
  return res.json({
    qrCode: getQrCode(),
    isConnected: client.info ? true : false,
    connectionState: getConnectionState(),
  });
});

server.get("/whatsapp/contacts-status", (_, res) => {
  return res.json({
    isAddingContacts: getIsAddingContacts(),
  });
});

server.listen(port, () => {
  log(`api running on ${port}`);
});
