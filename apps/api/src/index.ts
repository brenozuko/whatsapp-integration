import http from "http";
import { connectToDatabase } from "./lib/mongoose";
import { createServer } from "./server";
import { getContacts } from "./services/contacts";
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

// Initialize MongoDB connection and Socket.IO
connectToDatabase()
  .then(() => {
    // Initialize Socket.IO
    initializeSocket(server);

    // Initialize WhatsApp client
    initializeWhatsApp().catch((err) => {
      console.error("Failed to initialize WhatsApp:", err);
    });

    // Define routes before listening
    app.get("/whatsapp/connect", async (_, res) => {
      try {
        const client = await initializeWhatsApp();
        return res.json({
          qrCode: getQrCode(),
          isConnected: client?.info ? true : false,
          connectionState: getConnectionState(),
        });
      } catch (error) {
        console.error("Error connecting to WhatsApp:", error);
        return res.status(500).json({ error: "Failed to connect to WhatsApp" });
      }
    });

    app.get("/whatsapp/contacts-status", (_, res) => {
      return res.json({
        isAddingContacts: getIsAddingContacts(),
      });
    });

    app.get("/whatsapp/contacts", async (req, res) => {
      try {
        const page = req.query.page
          ? parseInt(req.query.page as string)
          : undefined;
        const pageSize = req.query.pageSize
          ? parseInt(req.query.pageSize as string)
          : undefined;
        const search = req.query.search as string | undefined;

        const result = await getContacts({ page, pageSize, search });
        return res.json(result);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        return res.status(500).json({ error: "Failed to fetch contacts" });
      }
    });

    // Start the server
    server.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
