import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Contact, useContacts } from "@/hooks/useContacts";
import { useDebounce } from "@/hooks/useDebounce";
import { createFileRoute } from "@tanstack/react-router";
import {
  AccessorColumnDef,
  flexRender,
  getCoreRowModel,
  Row,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  SortAsc,
  SortDesc,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
export const Route = createFileRoute("/contacts")({
  component: Contacts,
});

function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const { data, isLoading } = useContacts({
    page: currentPage,
    pageSize,
    searchQuery: debouncedSearchQuery,
    sorting,
  });

  const contacts = data?.contacts || [];
  const totalPages = data?.totalPages || 1;
  const totalContacts = data?.total || 0;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= halfVisible + 1) {
      // Show first pages and last page
      for (let i = 1; i <= maxVisiblePages - 1; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - halfVisible) {
      // Show first page and last pages
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - maxVisiblePages + 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, current page range, and last page
      pages.push(1);
      pages.push("...");
      for (
        let i = currentPage - halfVisible + 1;
        i <= currentPage + halfVisible - 1;
        i++
      ) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  // Handle page changes
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number.parseInt(value));
  };

  const pageSizeOptions = ["5", "10", "20", "50"];

  // Define table columns
  const columns: AccessorColumnDef<Contact>[] = [
    {
      accessorKey: "profilePicture",
      header: "",
      cell: ({ row }: { row: Row<Contact> }) => {
        const contact = row.original;
        return (
          <Avatar className="h-10 w-10 bg-green-100">
            <AvatarImage src={contact.profilePicture} alt={contact.name} />
            <AvatarFallback className="bg-green-100 text-green-700 font-medium">
              {contact.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "messageCount",
      header: "Messages",
      cell: ({ row }: { row: Row<Contact> }) => {
        return (
          <div className="flex items-center bg-green-50 px-2 py-1 rounded-full w-fit">
            <MessageSquare className="h-3 w-3 text-green-600 mr-1" />
            <span className="text-xs font-medium text-green-600">
              {row.getValue("messageCount")}
            </span>
          </div>
        );
      },
    },
  ];

  // Initialize the table
  const table = useReactTable({
    data: contacts,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  // If loading, show a simple loading state
  if (isLoading) {
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
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-center">
                Loading contacts...
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

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
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={sorting[0]?.id || "name"}
              onValueChange={(value: string) => {
                setSorting([{ id: value, desc: sorting[0]?.desc || false }]);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="createdAt">Created At</SelectItem>
                <SelectItem value="messageCount">Message Count</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSorting([
                  { id: sorting[0]?.id || "name", desc: !sorting[0]?.desc },
                ]);
              }}
            >
              {sorting[0]?.desc ? (
                <SortDesc className="h-4 w-4" />
              ) : (
                <SortAsc className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <UserCheck className="inline-block mr-1 h-4 w-4" />
              {totalContacts} contacts synced
            </p>
          </div>

          {contacts.length === 0 ? (
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
                    {table.getRowModel().rows.length ? (
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
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-sm text-muted-foreground">
                    Showing page {currentPage} of {totalPages}
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

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) =>
                        page === "..." ? (
                          <span key={`ellipsis-${index}`} className="px-2">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => goToPage(page as number)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        )
                      )}
                    </div>

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
