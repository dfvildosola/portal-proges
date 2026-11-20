// Configuración de Prisma para el paquete de la base.
//
// El esquema está partido por tema en prisma/schema/ (Prisma 7 lee la carpeta entera).
// La dirección de la base sale de DATABASE_URL: si quien corre el comando no la puso,
// se lee del .env de la raíz del repo (ruta relativa a este archivo, no a la carpeta
// desde donde se corrió el comando).
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
