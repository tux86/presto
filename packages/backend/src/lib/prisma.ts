import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/prisma/client.js";
import { config } from "./config.js";

const adapter = new PrismaPg({
  connectionString: config.database.url,
});

export const prisma = new PrismaClient({ adapter });
