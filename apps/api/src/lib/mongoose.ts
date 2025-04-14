import mongoose from "mongoose";

let connection: typeof mongoose | null = null;

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  if (connection) return connection;

  try {
    const uri =
      process.env.DATABASE_URL ||
      "mongodb://mongodb:mongodb@localhost:27017/whatsapp?authSource=admin";

    connection = await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    return connection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};
