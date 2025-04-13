import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import socketService from "../lib/socket";

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastInteraction: string;
  messageCount: number;
}

export const Route = createFileRoute("/contacts")({
  component: Contacts,
});

function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingContacts, setIsAddingContacts] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch("http://localhost:3000/whatsapp/contacts");
        const data = await response.json();
        setContacts(data);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    // Check initial contacts loading status
    fetch("http://localhost:3000/whatsapp/contacts-status")
      .then((res) => res.json())
      .then((data) => {
        setIsAddingContacts(data.isAddingContacts);
      })
      .catch((error) => {
        console.error("Error fetching contacts status:", error);
      });

    // Listen for contacts status updates
    const unsubscribeContacts = socketService.onContactsStatus((data) => {
      setIsAddingContacts(data.isAddingContacts);
    });

    fetchContacts();

    return () => {
      unsubscribeContacts();
    };
  }, []);

  return (
    <main className="container mx-auto py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Contacts</CardTitle>
          <CardDescription>
            View and manage your WhatsApp contacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAddingContacts && (
            <div className="mb-4 bg-blue-50 p-4 rounded-md flex items-center text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Syncing contacts from WhatsApp...</span>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found
            </div>
          ) : (
            <div className="grid gap-4">
              {contacts.map((contact) => (
                <Card key={contact.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{contact.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {contact.phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Last interaction: {contact.lastInteraction}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Messages: {contact.messageCount}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
