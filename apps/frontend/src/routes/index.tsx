import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import socketService from "../lib/socket";

// Connection status component
const ConnectionStatus = ({
  status,
}: {
  status: "loading" | "ready" | "disconnected" | "error";
}) => {
  const statusConfig = {
    loading: {
      color: "bg-yellow-500",
      text: "Awaiting Connection",
      blink: true,
      shadow: "shadow-yellow-500/50",
      textColor: "text-yellow-500",
    },
    ready: {
      color: "bg-green-500",
      text: "Connected",
      blink: false,
      shadow: "shadow-green-500/50",
      textColor: "text-green-500",
    },
    disconnected: {
      color: "bg-gray-500",
      text: "Disconnected",
      blink: false,
      shadow: "shadow-gray-500/50",
      textColor: "text-gray-500",
    },
    error: {
      color: "bg-red-500",
      text: "Connection Error",
      blink: false,
      shadow: "shadow-red-500/50",
      textColor: "text-red-500",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-center space-x-2 mb-4 p-2 rounded-md text-center">
      <div
        className={cn(
          "w-4 h-4 rounded-full transition-opacity duration-500 shadow-md",
          config.color,
          config.shadow,
          config.blink ? "animate-blink" : ""
        )}
      />
      <span className={cn(config.textColor)}>{config.text}</span>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [status, setStatus] = useState<{
    qrCode: string | null;
    isConnected: boolean;
    connectionState: "loading" | "ready" | "disconnected" | "error";
    isAddingContacts: boolean;
  }>({
    qrCode: null,
    isConnected: false,
    connectionState: "loading",
    isAddingContacts: false,
  });

  useEffect(() => {
    // Fetch initial status
    fetch("http://localhost:3000/connect")
      .then((res) => res.json())
      .then((data) => {
        setStatus((prev) => ({ ...prev, ...data }));
      })
      .catch((error) => {
        console.error("Error fetching WhatsApp status:", error);
      });

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

  const renderQRCode = () => {
    if (status.isConnected) {
      return null;
    }
    if (!status.qrCode) {
      return (
        <div className="w-64 h-64 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      );
    }

    if (!status.isConnected && status.qrCode) {
      return (
        <div className="w-64 h-64 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(status.qrCode || "")}`}
            alt="WhatsApp QR Code"
            className="w-full h-full p-2"
          />
        </div>
      );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-white">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Welcome to Village
          </CardTitle>
          <CardDescription>
            Connect your WhatsApp contacts to enhance your network visibility
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-6 text-center">
            Sync your WhatsApp contacts to see who you interact with most
            frequently and improve your network management.
          </p>

          {status.isConnected ? (
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Connected</AlertTitle>
              <AlertDescription>
                WhatsApp is successfully connected! You can now proceed to
                manage your contacts.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Scan QR Code</AlertTitle>
              <AlertDescription>
                Please scan the QR code with your WhatsApp to connect.
              </AlertDescription>
            </Alert>
          )}

          <div className="relative mb-6">
            {renderQRCode()}
            <ConnectionStatus status={status.connectionState} />
          </div>

          <div className="text-sm text-gray-600 space-y-4 w-full">
            <p className="font-medium">By connecting, you consent to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access to your WhatsApp contacts</li>
              <li>Viewing last interaction dates</li>
              <li>Analyzing message frequency data</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {status.isConnected && (
            <Link
              to="/contacts"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Users className="mr-2 h-4 w-4" />
              View Contacts
            </Link>
          )}
          <p className="text-xs text-gray-400 text-center">
            Your data will be stored securely and only used to enhance your
            Village experience.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
