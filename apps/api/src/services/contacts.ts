import { Contact, Prisma } from "@prisma/client";
import { prisma } from "../lib/db";

interface GetContactsParams {
  page?: number;
  pageSize?: number;
  search?: string;
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
}: GetContactsParams = {}): Promise<GetContactsResponse> {
  const skip = (page - 1) * pageSize;

  const where: Prisma.ContactWhereInput = search
    ? {
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive,
        },
      }
    : {};

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
