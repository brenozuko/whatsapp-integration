import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
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
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const contactsPerPage = 10;
  const [currentContacts, setCurrentContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/whatsapp/contacts?page=${currentPage}&limit=${contactsPerPage}`
        );
        const data = await response.json();
        setContacts(data.contacts || data);
        setFilteredContacts(data.contacts || data);
        setTotalPages(
          data.totalPages ||
            Math.ceil((data.contacts || data).length / contactsPerPage)
        );
        setCurrentContacts(data.contacts || data.slice(0, contactsPerPage));
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
  }, [currentPage]);

  // Calculate pagination numbers
  useEffect(() => {
    // Generate page numbers to display
    const numbers = [];
    for (let i = 1; i <= totalPages; i++) {
      numbers.push(i);
    }
    setPageNumbers(numbers);
  }, [totalPages]);

  // Filter contacts based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContacts(contacts);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = contacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(lowerCaseQuery) ||
          contact.phone.toLowerCase().includes(lowerCaseQuery)
      );
      setFilteredContacts(filtered);
    }
    // Reset to first page when search query changes
    setCurrentPage(1);
  }, [searchQuery, contacts]);

  // Update current contacts when filtered contacts change
  useEffect(() => {
    const indexOfLastContact = currentPage * contactsPerPage;
    const indexOfFirstContact = indexOfLastContact - contactsPerPage;
    setCurrentContacts(
      filteredContacts.slice(indexOfFirstContact, indexOfLastContact)
    );
    setTotalPages(Math.ceil(filteredContacts.length / contactsPerPage));
  }, [filteredContacts, currentPage]);

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

          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Last Interaction</TableHead>
                      <TableHead className="text-right">Messages</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.name}
                        </TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>{contact.lastInteraction}</TableCell>
                        <TableCell className="text-right">
                          {contact.messageCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {pageNumbers.map((number) => (
                      <PaginationItem key={number}>
                        <PaginationLink
                          onClick={() => setCurrentPage(number)}
                          isActive={currentPage === number}
                        >
                          {number}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
