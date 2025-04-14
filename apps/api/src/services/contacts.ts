import { Contact } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface GetContactsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "messageCount";
  sortOrder?: "asc" | "desc";
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
  sortBy = "name",
  sortOrder = "asc",
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
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take: pageSize,
      orderBy:
        sortBy === "messageCount"
          ? {
              messages: {
                _count: sortOrder,
              },
            }
          : {
              [sortBy]: sortOrder,
            },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
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
