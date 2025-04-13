import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [status, setStatus] = useState<{
    qrCode: string | null;
    isConnected: boolean;
  }>({
    qrCode: null,
    isConnected: false,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("http://localhost:3000/whatsapp/connect");
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error("Error fetching WhatsApp status:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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
            <>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Scan QR Code</AlertTitle>
                <AlertDescription>
                  Please scan the QR code with your WhatsApp to connect.
                </AlertDescription>
              </Alert>

              <div className="relative mb-6">
                <div className="w-64 h-64 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white">
                  {status.qrCode ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(status.qrCode)}`}
                      alt="WhatsApp QR Code"
                      className="w-full h-full p-2"
                    />
                  ) : (
                    <div className="text-gray-400">Loading QR code...</div>
                  )}
                </div>
              </div>
            </>
          )}

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
          <p className="text-xs text-gray-400 text-center">
            Your data will be stored securely and only used to enhance your
            Village experience.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
