import { Client, LocalAuth } from "whatsapp-web.js";

let client: Client | null = null;
let qrCode: string | null = null;

export const initializeWhatsApp = () => {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ["--no-sandbox"],
    },
  });

  client.on("qr", (qr) => {
    qrCode = qr;
  });

  client.on("ready", () => {
    console.log("Client is ready!");
  });

  client.initialize();

  return client;
};

export const getQrCode = () => {
  return qrCode;
};
