import { useQuery } from "@tanstack/react-query";

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
}: {
  page: number;
  pageSize: number;
  searchQuery: string;
}) => {
  const integrationId = localStorage.getItem("whatsappIntegrationId");

  let url = `${import.meta.env.VITE_API_BASE_URL}/contacts?integrationId=${integrationId}`;

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
}: {
  page: number;
  pageSize: number;
  searchQuery: string;
}) => {
  return useQuery({
    queryKey: ["contacts", page, pageSize, searchQuery],
    queryFn: () =>
      fetchContacts({
        page,
        pageSize,
        searchQuery,
      }),
  });
};
