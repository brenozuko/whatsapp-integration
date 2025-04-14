import mongoose from "mongoose";
import { Contact, IContact } from "../models/Contact";

interface GetContactsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  integrationId?: string;
}

interface GetContactsResponse {
  contacts: IContact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ContactFilter {
  name?: { $regex: string; $options: string };
  integration?: mongoose.Types.ObjectId;
}

export async function getContacts({
  page = 1,
  pageSize = 10,
  search,
  integrationId,
}: GetContactsParams = {}): Promise<GetContactsResponse> {
  const skip = (page - 1) * pageSize;

  // Create query filter
  const filter: ContactFilter = {};

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (integrationId) {
    filter.integration = new mongoose.Types.ObjectId(integrationId);
  }

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
