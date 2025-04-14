import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server | null = null;

export const initializeSocket = (server: HttpServer) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: "http://localhost:3001",
      methods: ["GET", "POST"],
      credentials: true,
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

export const emitWhatsAppStatus = (data: {
  qrCode: string | null;
  isConnected: boolean;
  connectionState: string;
}) => {
  if (!io) return;
  io.emit("whatsapp:status", data);
};

export const emitContactsStatus = (data: { isAddingContacts: boolean }) => {
  if (!io) return;
  io.emit("whatsapp:contacts", data);
};
