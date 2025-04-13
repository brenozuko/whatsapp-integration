import { MongoClient } from "mongodb";
import { MongoStore } from "wwebjs-mongo";

let mongoClient: MongoClient | null = null;
let store: typeof MongoStore | null = null;

export const getWhatsAppStore = async (): Promise<typeof MongoStore> => {
  if (store) return store;

  try {
    // Use the same connection string from the .env file
    const uri =
      process.env.DATABASE_URL ||
      "mongodb://mongodb:mongodb@localhost:27017/whatsapp?authSource=admin";

    mongoClient = new MongoClient(uri);
    await mongoClient.connect();

    store = new MongoStore(mongoClient.db());
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
