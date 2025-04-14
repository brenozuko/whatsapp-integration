import { z } from "zod";

export const contactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "messageCount"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type ContactsQuery = z.infer<typeof contactsQuerySchema>;
