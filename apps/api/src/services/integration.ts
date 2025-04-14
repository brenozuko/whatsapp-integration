import { prisma } from "../lib/prisma";

export async function createIntegration() {
  const integration = await prisma.integration.create({
    data: {},
  });

  return integration;
}
