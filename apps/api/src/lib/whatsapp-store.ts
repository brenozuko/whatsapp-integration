import mongoose from "mongoose";
import { MongoStore } from "wwebjs-mongo";
import { connectToDatabase } from "./mongoose";

let store: typeof MongoStore | null = null;

export const getWhatsAppStore = async (): Promise<typeof MongoStore> => {
  if (store) return store;

  try {
    // Ensure MongoDB connection is established
    await connectToDatabase();

    store = new MongoStore({ mongoose: mongoose });
    console.log("Connected to MongoDB for WhatsApp session storage");

    return store;
  } catch (error) {
    console.error(
      "Error connecting to MongoDB for WhatsApp session storage:",
      error
    );
    throw error;
  }
};
