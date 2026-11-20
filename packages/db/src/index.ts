// El cliente de la base, único para toda la API (singleton). Evita abrir muchas
// conexiones cuando el servidor se recarga en desarrollo.
//
// Prisma 7 pide un «driver adapter» al correr: para Postgres, @prisma/adapter-pg.
// La dirección de la base sale de DATABASE_URL. Si quien arranca no la puso, se lee
// del .env de la raíz del repo (ruta relativa a este archivo, no a la carpeta actual).
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

if (!process.env.DATABASE_URL) {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
}

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL: dónde está la base de datos. Ponla en el .env de la raíz del repo o en el entorno.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export * from "./generated/prisma/client";
export { ORG_PROGES } from "./constantes";
