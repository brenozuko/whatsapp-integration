import http from "http";
import { z } from "zod";
import { initializeSocket } from "./lib/socket";
import { createServer } from "./server";
import { getContacts } from "./services/contacts";
import {
  getConnectionState,
  getCurrentUser,
  getIsAddingContacts,
  getIsAddingMessages,
  getQrCode,
  initializeWhatsApp,
} from "./services/whatsapp";
import { contactsQuerySchema } from "./validations";

const port = process.env.PORT || 3000;
const app = createServer();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Initialize WhatsApp client
initializeWhatsApp().catch((err) => {
  console.error("Failed to initialize WhatsApp:", err);
});

// Define routes before listening
app.get("/connect", async (_, res) => {
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

app.get("/contacts-status", (_, res) => {
  return res.json({
    isAddingContacts: getIsAddingContacts(),
    isAddingMessages: getIsAddingMessages(),
  });
});

// Get the current integration information
app.get("/integration", (_, res) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return res
      .status(404)
      .json({ error: "No WhatsApp connection is currently active" });
  }
  return res.json(currentUser);
});

app.get("/contacts", async (req, res) => {
  try {
    // Validate query parameters
    const validatedQuery = contactsQuerySchema.parse(req.query);

    // Check if WhatsApp is connected
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return res
        .status(401)
        .json({ error: "No WhatsApp connection is currently active" });
    }

    // Pass validated query parameters
    const result = await getContacts(validatedQuery);

    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: error.errors,
      });
    }
    console.error("Error fetching contacts:", error);
    return res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Start the server
server.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
