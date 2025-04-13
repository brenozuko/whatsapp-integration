import { log } from "@repo/logger";
import { createServer } from "./server";
import {
  getConnectionState,
  getQrCode,
  initializeWhatsApp,
} from "./services/whatsapp";

const port = process.env.PORT || 3000;
const server = createServer();

// Initialize WhatsApp client
initializeWhatsApp();

server.listen(port, () => {
  log(`api running on ${port}`);
});

server.get("/whatsapp/connect", (_, res) => {
  const client = initializeWhatsApp();
  return res.json({
    qrCode: getQrCode(),
    isConnected: client.info ? true : false,
    connectionState: getConnectionState(),
  });
});
