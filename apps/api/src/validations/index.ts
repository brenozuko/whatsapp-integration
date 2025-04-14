import { z } from "zod";

export const contactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  integrationId: z.string(),
});

export type ContactsQuery = z.infer<typeof contactsQuerySchema>;
