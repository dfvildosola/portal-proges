// Levanta la API de verdad: arma las dependencias reales (Clerk, Odoo, Drive) y escucha en el
// puerto PORT. Es lo que corren `npm run dev` (en el Mac) y `npm run inicio` (en Railway).
//
// En el Mac las variables salen del .env de la raíz del repo; en Railway, de las variables del
// servicio (allí no hay .env). Lo que ya está en el entorno gana sobre el archivo.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";

const archivoEnv = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);

// Se importan después de cargar el .env: la base lee DATABASE_URL al importarse.
const { crearApp } = await import("./app");
const { verificadorDeClerk } = await import("./acceso/clerk");
const odoo = await import("./integraciones/odoo");
const drive = await import("./integraciones/drive");
const { pdfSinConectar } = await import("./integraciones/pdf");

const secretoClerk = process.env.CLERK_SECRET_KEY;
if (!secretoClerk) {
  throw new Error("Falta CLERK_SECRET_KEY: sin ella la API no puede comprobar las sesiones de la web.");
}

const app = crearApp({
  verificarSesion: verificadorDeClerk(secretoClerk),
  odoo,
  drive,
  pdf: pdfSinConectar,
});

const puerto = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(puerto) || puerto <= 0) {
  throw new Error(`PORT no es un número de puerto: «${process.env.PORT}».`);
}

const servidor = serve({ fetch: app.fetch, port: puerto }, (info) => {
  console.log(`[api] Escuchando en http://localhost:${info.port} (documentación en /docs)`);
});

// Railway avisa con SIGTERM antes de apagar una versión: se dejan terminar las consultas en curso.
process.on("SIGTERM", () => {
  servidor.close(() => process.exit(0));
});
