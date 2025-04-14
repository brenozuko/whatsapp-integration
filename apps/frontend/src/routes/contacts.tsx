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
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  LogOut,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
export const Route = createFileRoute("/contacts")({
  component: Contacts,
});

function Contacts() {
  const { disconnect, isAddingContacts, syncProgress } =
    useWhatsAppConnection();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const { data, refetch } = useContacts({
    page: currentPage,
    pageSize,
    searchQuery: debouncedSearchQuery,
    sorting,
  });

  const contacts = data?.contacts || [];
  const totalPages = data?.totalPages || 1;

  const handleDisconnect = () => {
    disconnect();
    navigate({ to: "/" });
  };

  const handleReload = () => {
    refetch();
  };
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

  return (
    <div className="container mx-auto py-8">
      {isAddingContacts && syncProgress && (
        <div className="mb-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing Contacts
              </CardTitle>
              <CardDescription>
                Processing {syncProgress.currentContact || "contacts"}...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Progress: {syncProgress.processed} of {syncProgress.total}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(
                      (syncProgress.processed / syncProgress.total) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${(syncProgress.processed / syncProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            {isAddingContacts
              ? "Syncing your WhatsApp contacts..."
              : "View and manage your contacts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[300px]"
              />
              <Button variant="outline" size="icon" onClick={handleReload}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>

          <div className="relative">
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
                        No contacts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="w-[80px]">
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
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
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => goToPage(page as number)}
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
