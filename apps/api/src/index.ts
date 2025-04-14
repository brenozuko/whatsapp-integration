import http from "http";
import { connectToDatabase } from "./lib/mongoose";
import { createServer } from "./server";
import { getContacts } from "./services/contacts";
import { initializeSocket } from "./services/socket";
import {
  getConnectionState,
  getCurrentIntegration,
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

    app.post("/whatsapp/connect", async (req, res) => {
      try {
        const { name, phone } = req.body;

        if (!name || !phone) {
          return res.status(400).json({ error: "Name and phone are required" });
        }

        const client = await initializeWhatsApp(name, phone);

        return res.json({
          qrCode: getQrCode(),
          isConnected: client?.info ? true : false,
          connectionState: getConnectionState(),
          currentIntegration: getCurrentIntegration(),
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

    // Get the current integration information
    app.get("/whatsapp/integration", (_, res) => {
      const integration = getCurrentIntegration();
      if (!integration) {
        return res
          .status(404)
          .json({ error: "No integration is currently connected" });
      }
      return res.json(integration);
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

        // Get the current integration to filter contacts
        const currentIntegration = getCurrentIntegration();
        if (!currentIntegration) {
          return res
            .status(401)
            .json({ error: "No integration is currently connected" });
        }

        // Check if currentIntegration has a valid ID property
        const integrationId = currentIntegration._id?.toString();
        if (!integrationId) {
          return res.status(500).json({ error: "Invalid integration ID" });
        }

        // Pass the integration ID to filter contacts
        const result = await getContacts({
          page,
          pageSize,
          search,
          integrationId,
        });

        return res.json(result);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        return res.status(500).json({ error: "Failed to fetch contacts" });
      }
    });

    // Start the server
    server.listen(port, () => {
      console.log(`API server listening at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start the server:", err);
    process.exit(1);
  });
