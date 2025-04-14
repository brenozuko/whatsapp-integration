import http from "http";
import { z } from "zod";
import { initializeSocket } from "./lib/socket";
import { createServer } from "./server";
import { getContacts } from "./services/contacts";
import { createIntegration } from "./services/integration";
import {
  disconnectWhatsApp,
  getConnectionState,
  getCurrentUser,
  getIsAddingContacts,
  getQrCode,
  initializeWhatsApp,
} from "./services/whatsapp";
import { contactsQuerySchema } from "./validations";

const port = process.env.PORT || 3000;
const app = createServer();
const server = http.createServer(app);

initializeSocket(server);

app.get("/connect", async (_, res) => {
  try {
    const integration = await createIntegration();
    const client = await initializeWhatsApp(integration.id);

    return res.json({
      qrCode: getQrCode(integration.id),
      isConnected: client?.info ? true : false,
      connectionState: getConnectionState(integration.id),
      integrationId: integration.id,
    });
  } catch (error) {
    console.error("Error connecting to WhatsApp:", error);
    return res.status(500).json({ error: "Failed to connect to WhatsApp" });
  }
});

app.get("/contacts-status", (req, res) => {
  const { integrationId } = req.query;
  if (!integrationId || typeof integrationId !== "string") {
    return res.status(400).json({ error: "integrationId is required" });
  }

  return res.json({
    isAddingContacts: getIsAddingContacts(integrationId),
    integrationId,
  });
});

app.get("/contacts", async (req, res) => {
  try {
    const validatedQuery = contactsQuerySchema.parse(req.query);
    const { integrationId } = req.query;

    if (!integrationId || typeof integrationId !== "string") {
      return res.status(400).json({ error: "integrationId is required" });
    }

    const currentUser = getCurrentUser(integrationId);
    if (!currentUser) {
      return res
        .status(401)
        .json({ error: "No WhatsApp connection is currently active" });
    }

    const result = await getContacts({ ...validatedQuery, integrationId });

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

app.post("/disconnect", async (req, res) => {
  try {
    const { integrationId } = req.body;
    if (!integrationId || typeof integrationId !== "string") {
      return res.status(400).json({ error: "integrationId is required" });
    }

    const success = await disconnectWhatsApp(integrationId);

    if (!success) {
      return res
        .status(500)
        .json({ error: "Failed to disconnect WhatsApp session" });
    }

    return res.json({ message: "WhatsApp session disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting WhatsApp:", error);
    return res
      .status(500)
      .json({ error: "Failed to disconnect WhatsApp session" });
  }
});

server.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
