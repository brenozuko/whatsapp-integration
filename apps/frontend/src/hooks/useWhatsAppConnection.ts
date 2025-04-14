import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import socketService from "../lib/socket";

interface WhatsAppStatus {
  qrCode: string | null;
  isConnected: boolean;
  connectionState: "loading" | "ready" | "disconnected" | "error";
  isAddingContacts: boolean;
  syncProgress?: {
    total: number;
    processed: number;
    currentContact: string | null;
  };
}

export const useWhatsAppConnection = () => {
  const [status, setStatus] = useState<WhatsAppStatus>({
    qrCode: null,
    isConnected: false,
    connectionState: "loading",
    isAddingContacts: false,
  });

  const { data: connectionData } = useQuery({
    queryKey: ["whatsapp-connection"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/connect`
      );
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const disconnect = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/disconnect`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        connectionState: "disconnected",
      }));
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  useEffect(() => {
    if (connectionData) {
      setStatus((prev) => ({ ...prev, ...connectionData }));
    }
  }, [connectionData]);

  useEffect(() => {
    // Listen for WhatsApp status updates using socket service
    const unsubscribeStatus = socketService.onWhatsAppStatus((data) => {
      setStatus((prev) => ({ ...prev, ...data }));
    });

    // Listen for contacts status updates
    const unsubscribeContacts = socketService.onContactsStatus((data) => {
      setStatus((prev) => ({ ...prev, ...data }));
    });

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
      unsubscribeContacts();
    };
  }, []);

  return { ...status, disconnect };
};
