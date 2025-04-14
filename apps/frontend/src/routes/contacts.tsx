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
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  Row,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2, Search } from "lucide-react";
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

export const Route = createFileRoute("/contacts")({
  component: Contacts,
});

function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch(`http://localhost:3000/whatsapp/contacts`);
        const data = await response.json();
        setContacts(data.contacts || data);
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

  const columnHelper = createColumnHelper<Contact>();

  const columns = [
    columnHelper.accessor("image", {
      header: "",
      cell: ({ row }: { row: Row<Contact> }) => {
        const contact = row.original;
        const initial = contact.name
          ? contact.name.charAt(0).toUpperCase()
          : "?";

        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-primary/10 text-primary font-medium">
            {contact.image ? (
              <img
                src={contact.image}
                alt={contact.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerText = initial;
                }}
              />
            ) : (
              initial
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("name", {
      header: "Name",
      cell: ({ row }: { row: Row<Contact> }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    }),
    columnHelper.accessor("phone", {
      header: "Phone",
    }),
    columnHelper.accessor("lastInteraction", {
      header: "Last Interaction",
    }),
    columnHelper.accessor("messageCount", {
      header: "Messages",
      cell: ({ row }: { row: Row<Contact> }) => (
        <div className="text-right">{row.getValue("messageCount")}</div>
      ),
    }),
  ];

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: searchQuery,
    },
    onGlobalFilterChange: setSearchQuery,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

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
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => table.previousPage()}
                      className={
                        !table.getCanPreviousPage()
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from(
                    { length: table.getPageCount() },
                    (_, i) => i + 1
                  ).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => table.setPageIndex(page - 1)}
                        isActive={
                          table.getState().pagination.pageIndex === page - 1
                        }
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => table.nextPage()}
                      className={
                        !table.getCanNextPage()
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
