import { io, Socket } from "socket.io-client";

interface WhatsAppStatus {
  qrCode: string | null;
  isConnected: boolean;
  connectionState: "loading" | "ready" | "disconnected" | "error";
  userName?: string;
  userPhone?: string;
}

interface ContactsStatus {
  isAddingContacts: boolean;
  isAddingMessages?: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private statusListeners: ((status: WhatsAppStatus) => void)[] = [];
  private contactsListeners: ((status: ContactsStatus) => void)[] = [];

  connect() {
    if (this.socket) return;

    this.socket = io("http://localhost:3000");

    this.socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    this.socket.on("whatsapp:status", (data: WhatsAppStatus) => {
      this.statusListeners.forEach((listener) => listener(data));
    });

    this.socket.on("whatsapp:contacts", (data: ContactsStatus) => {
      this.contactsListeners.forEach((listener) => listener(data));
    });

    return this.socket;
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  onWhatsAppStatus(callback: (status: WhatsAppStatus) => void) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  onContactsStatus(callback: (status: ContactsStatus) => void) {
    this.contactsListeners.push(callback);
    return () => {
      this.contactsListeners = this.contactsListeners.filter(
        (cb) => cb !== callback
      );
    };
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;
