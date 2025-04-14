import { useQuery } from "@tanstack/react-query";
import { SortingState } from "@tanstack/react-table";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  profilePicture: string;
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

  const integrationId = localStorage.getItem("whatsappIntegrationId");

  let url = `${import.meta.env.VITE_API_BASE_URL}/contacts?integrationId=${integrationId}`;

  if (sorting.length > 0) {
    const { id, desc } = sorting[0];
    sortParam = `&sortBy=${id}&sortOrder=${desc ? "desc" : "asc"}`;
  }

  if (!integrationId) {
    throw new Error("No integration ID found");
  }

  if (page) {
    url += `&page=${page}`;
  }

  if (pageSize) {
    url += `&pageSize=${pageSize}`;
  }

  if (searchQuery) {
    url += `&search=${searchQuery}`;
  }

  const response = await fetch(url);

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
