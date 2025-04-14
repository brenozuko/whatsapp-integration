import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  SortAsc,
  SortDesc,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import socketService from "../lib/socket";

interface Contact {
  id: string;
  name: string;
  phone: string;
  image: string;
  lastInteraction: string;
  messageCount: number;
}

interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type SortOption = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

const sortOptions: SortOption[] = [
  {
    label: "Recent first",
    value: "recent",
    icon: <SortDesc className="h-4 w-4 mr-2" />,
  },
  {
    label: "Oldest first",
    value: "oldest",
    icon: <SortAsc className="h-4 w-4 mr-2" />,
  },
  {
    label: "Name (A-Z)",
    value: "name",
    icon: <ArrowUpDown className="h-4 w-4 mr-2" />,
  },
  {
    label: "Most messages",
    value: "messages",
    icon: <MessageSquare className="h-4 w-4 mr-2" />,
  },
];

export const Route = createFileRoute("/contacts")({
  component: Contacts,
});

function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | string>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [sortBy, setSortBy] = useState<string>("recent");

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/contacts?page=${currentPage}&pageSize=${pageSize}&search=${searchQuery}`
        );
        const data: ContactsResponse = await response.json();
        setContacts(data.contacts);
        setTotalPages(data.totalPages);
        setTotalContacts(data.total);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    // Check initial contacts loading status
    fetch("http://localhost:3000/contacts-status")
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
  }, [currentPage, pageSize, searchQuery, sortBy]);

  // Reset to first page when changing page size or search term
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, searchQuery]);

  // Sort contacts based on selected sort option
  const sortedContacts = [...contacts].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return (
          new Date(b.lastInteraction).getTime() -
          new Date(a.lastInteraction).getTime()
        );
      case "oldest":
        return (
          new Date(a.lastInteraction).getTime() -
          new Date(b.lastInteraction).getTime()
        );
      case "name":
        return a.name.localeCompare(b.name);
      case "messages":
        return b.messageCount - a.messageCount;
      default:
        return 0;
    }
  });

  // Handle page changes
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get current sort option
  const currentSortOption =
    sortOptions.find((option) => option.value === sortBy) || sortOptions[0];

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(
      value === "All" ? sortedContacts.length : Number.parseInt(value)
    );
  };

  const pageSizeOptions = [5, 10, 20, 50, "All"];

  const indexOfFirstContact =
    (currentPage - 1) *
    (typeof pageSize === "number" ? pageSize : totalContacts);
  const indexOfLastContact = Math.min(
    indexOfFirstContact +
      (typeof pageSize === "number" ? pageSize : totalContacts),
    totalContacts
  );

  return (
    <main className="container mx-auto py-8">
      <Card className="w-full max-w-4xl mx-auto">
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

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <UserCheck className="inline-block mr-1 h-4 w-4" />
              {totalContacts} contacts synced
            </p>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  {currentSortOption.icon}
                  {currentSortOption.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className="flex items-center cursor-pointer"
                  >
                    {option.icon}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {sortedContacts.map((contact) => (
                  <Card key={contact.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3 bg-green-100">
                          <AvatarImage src={contact.image} alt={contact.name} />
                          <AvatarFallback className="bg-green-100 text-green-700 font-medium">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium">{contact.name}</h3>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>
                              Last chat: {formatDate(contact.lastInteraction)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center bg-green-50 px-2 py-1 rounded-full">
                          <MessageSquare className="h-3 w-3 text-green-600 mr-1" />
                          <span className="text-xs font-medium text-green-600">
                            {contact.messageCount}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination and Page Size Controls */}
              <div className="mt-6 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={handlePageSizeChange}
                    >
                      <SelectTrigger className="h-8 w-[80px]">
                        <SelectValue placeholder={pageSize.toString()} />
                      </SelectTrigger>
                      <SelectContent>
                        {pageSizeOptions.map((size) => (
                          <SelectItem
                            key={size.toString()}
                            value={size.toString()}
                          >
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-sm text-muted-foreground">
                    {indexOfFirstContact + 1}-
                    {Math.min(indexOfLastContact, totalContacts)} of{" "}
                    {totalContacts}
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="h-8"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="h-8"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
