import { Contact } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface GetContactsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  integrationId?: string;
}

interface GetContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getContacts({
  page = 1,
  pageSize = 10,
  search,
  integrationId,
}: GetContactsParams = {}): Promise<GetContactsResponse> {
  const skip = (page - 1) * pageSize;

  // Create query filter
  const where = {
    ...(search && {
      name: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
    ...(integrationId && {
      integrationId,
    }),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        name: "asc",
      },
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    contacts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
