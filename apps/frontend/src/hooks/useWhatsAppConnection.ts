import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import socketService from "../lib/socket";

interface WhatsAppStatus {
  qrCode: string | null;
  isConnected: boolean;
  connectionState: "loading" | "ready" | "disconnected" | "error";
  isAddingContacts: boolean;
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
      const data = await response.json();
      if (data.integrationId) {
        localStorage.setItem("whatsappIntegrationId", data.integrationId);
      }
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

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
      if (data.isAddingContacts) {
        // If contacts are being added, navigate to contacts page
        window.location.href = "/contacts";
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
      unsubscribeContacts();
    };
  }, []);

  return status;
};
