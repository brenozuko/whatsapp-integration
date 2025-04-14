import { useQuery } from "@tanstack/react-query";
import { SortingState } from "@tanstack/react-table";

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

const fetchContacts = async ({
  page,
  pageSize,
  searchQuery,
  sorting,
}: {
  page: number;
  pageSize: number;
  searchQuery: string;
  sorting: SortingState;
}) => {
  let sortParam = "";
  if (sorting.length > 0) {
    const { id, desc } = sorting[0];
    sortParam = `&sortBy=${id}&sortOrder=${desc ? "desc" : "asc"}`;
  }

  const response = await fetch(
    `http://localhost:3000/contacts?page=${page}&pageSize=${pageSize}&search=${searchQuery}${sortParam}`
  );
  const data: ContactsResponse = await response.json();
  return data;
};

export const useContacts = ({
  page,
  pageSize,
  searchQuery,
  sorting,
}: {
  page: number;
  pageSize: number;
  searchQuery: string;
  sorting: SortingState;
}) => {
  return useQuery({
    queryKey: ["contacts", page, pageSize, searchQuery, sorting],
    queryFn: () =>
      fetchContacts({
        page,
        pageSize,
        searchQuery,
        sorting,
      }),
  });
};
