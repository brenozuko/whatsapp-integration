import { Client, NoAuth } from "whatsapp-web.js";

let client: Client | null = null;
let qrCode: string | null = null;
let connectionState: "loading" | "ready" | "disconnected" | "error" =
  "disconnected";

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
  });

  client.on("authenticated", () => {
    connectionState = "loading";
  });

  client.on("ready", () => {
    console.log("Client is ready!");
    connectionState = "ready";
  });

  client.on("disconnected", () => {
    console.log("Client disconnected");
    connectionState = "disconnected";
  });

  client.on("auth_failure", () => {
    console.log("Authentication failed");
    connectionState = "error";
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
