import { Request, Response } from "express";
import { z } from "zod";
import { getContacts } from "../services/contacts";
import {
  disconnectWhatsApp,
  getConnectionState,
  getCurrentUser,
  getQrCode,
  initializeWhatsApp,
} from "../services/whatsapp/service";
import { contactsQuerySchema } from "../validations";

export const connectWhatsApp = async (_: Request, res: Response) => {
  try {
    const client = await initializeWhatsApp();
    const isConnected = client?.info ? true : false;
    const connectionState = getConnectionState();

    return res.json({
      qrCode: getQrCode(),
      isConnected,
      connectionState,
    });
  } catch (error) {
    console.error("Error connecting to WhatsApp:", error);
    return res.status(500).json({ error: "Failed to connect to WhatsApp" });
  }
};

export const getWhatsAppContacts = async (req: Request, res: Response) => {
  try {
    const validatedQuery = contactsQuerySchema.parse(req.query);
    const currentUser = getCurrentUser();

    if (!currentUser) {
      return res
        .status(401)
        .json({ error: "No WhatsApp connection is currently active" });
    }

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
};

export const disconnectWhatsAppSession = async (_: Request, res: Response) => {
  try {
    const success = await disconnectWhatsApp();

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
};
