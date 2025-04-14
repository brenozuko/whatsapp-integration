import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface GetContactsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getContacts = async ({
  page = 1,
  limit = 10,
  search = "",
}: GetContactsParams) => {
  const skip = (page - 1) * limit;

  const where = {
    OR: search
      ? [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            phone: {
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
      orderBy: { name: "asc" },
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
