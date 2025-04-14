import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface GetContactsParams {
  page?: number;
  limit?: number;
  search?: string;
  integrationId: string;
}

export const getContacts = async ({
  page = 1,
  limit = 10,
  search = "",
  integrationId,
}: GetContactsParams) => {
  const skip = (page - 1) * limit;

  const where = {
    integration: {
      id: integrationId,
    },
    OR: search
      ? [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            phoneNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ]
      : undefined,
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastMessageDate: "desc" },
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    contacts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};
