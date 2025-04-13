import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [status, setStatus] = useState<{
    qrCode: string | null;
    isConnected: boolean;
    connectionState: "loading" | "ready" | "disconnected" | "error";
  }>({
    qrCode: null,
    isConnected: false,
    connectionState: "disconnected",
  });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Skip fetching if we already have a QR code and there's no error
        if (status.qrCode && status.connectionState !== "error") {
          return;
        }

        const response = await fetch("http://localhost:3000/whatsapp/connect");
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error("Error fetching WhatsApp status:", error);
        setStatus((prev) => ({ ...prev, connectionState: "error" }));
      }
    };

    fetchStatus();

    // Clear existing interval if any
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only set interval if we don't have QR code or there's an error
    if (!status.qrCode || status.connectionState === "error") {
      intervalRef.current = window.setInterval(
        fetchStatus,
        5000
      ) as unknown as number;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status.qrCode, status.connectionState]);

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
          ) : status.connectionState === "loading" ? (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <AlertTitle>Connecting...</AlertTitle>
              <AlertDescription>
                Please wait while we establish a connection to WhatsApp.
              </AlertDescription>
            </Alert>
          ) : status.connectionState === "error" ? (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                An error occurred while connecting to WhatsApp. Please try
                again.
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
            {!status.isConnected && (
              <div className="w-64 h-64 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white">
                {status.connectionState === "loading" || !status.qrCode ? (
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                    <p className="text-sm text-gray-500">
                      {status.connectionState === "loading"
                        ? "Initializing WhatsApp..."
                        : "Loading QR code..."}
                    </p>
                  </div>
                ) : status.qrCode ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(status.qrCode)}`}
                    alt="WhatsApp QR Code"
                    className="w-full h-full p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                    <p className="text-sm text-gray-500">Loading QR code...</p>
                  </div>
                )}
              </div>
            )}
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
