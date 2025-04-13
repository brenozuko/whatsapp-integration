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

server.get("/hello", (_, res) => {
  res.json({ message: "Hello World" });
});

server.get("/whatsapp/qr", (_, res) => {
  const qr = getQrCode();
  if (!qr) {
    return res.status(404).json({ error: "QR code not available yet" });
  }
  return res.json({ qr });
});
