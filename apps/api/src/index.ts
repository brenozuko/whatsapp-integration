import { log } from "@repo/logger";
import { createServer } from "./server";
import { getQrCode, initializeWhatsApp } from "./services/whatsapp";

const port = process.env.PORT || 5001;
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
  });
});
