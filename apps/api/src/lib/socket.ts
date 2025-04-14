import { createServer } from "http";
import { Server } from "socket.io";

let io: Server | null = null;

export interface WhatsAppStatus {
  qrCode: string | null;
  isConnected: boolean;
  connectionState: string;
  userName?: string;
  userPhone?: string;
}

export interface ContactsStatus {
  isAddingContacts: boolean;
  syncProgress?: {
    total: number;
    processed: number;
    currentContact: string | null;
  };
}

export const initializeSocket = (server: ReturnType<typeof createServer>) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
    });
  });

  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
};

export const emitWhatsAppStatus = (data: WhatsAppStatus) => {
  if (!io) return;
  io.emit("whatsapp:status", data);
};

export const emitContactsStatus = (data: ContactsStatus) => {
  if (!io) return;
  io.emit("whatsapp:contacts", data);
};
