import { Contact, IContact } from "../models/Contact";

interface GetContactsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

interface GetContactsResponse {
  contacts: IContact[];
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

  // Create query filter
  const filter = search
    ? {
        name: { $regex: search, $options: "i" },
      }
    : {};

  const [contacts, total] = await Promise.all([
    Contact.find(filter).skip(skip).limit(pageSize).sort({ name: 1 }).exec(),
    Contact.countDocuments(filter),
  ]);

  return {
    contacts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
