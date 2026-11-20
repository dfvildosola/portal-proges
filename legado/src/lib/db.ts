// Cliente Prisma único (singleton). Evita abrir muchas conexiones en desarrollo
// por el hot-reload de Next. Importar `db` desde aquí en todo el server-side.
//
// Prisma 7 requiere un driver adapter en runtime: para Postgres, @prisma/adapter-pg.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
