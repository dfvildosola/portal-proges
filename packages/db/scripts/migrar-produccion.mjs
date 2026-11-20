// Aplica las migraciones pendientes en la base de producción antes de publicar una versión nueva
// de la API (ADR 0016, que reemplaza al 0009 en esto).
//
// Lo corre Railway como «pre-deploy» (apps/api/railway.json): después de armar la versión nueva
// y antes de soltar la anterior. Si una migración falla, Railway no publica y sigue andando la
// versión anterior.
//
// Solo migra en el ambiente «production» de Railway. En el Mac, en los espacios o en cualquier
// otro ambiente no hace nada: una branch sin mezclar nunca toca la base de producción.
//
// Usa DIRECT_URL, la dirección directa de Neon (sin pooling), porque Neon la pide para cambiar
// la estructura de la base. DATABASE_URL (con pooling) la sigue usando la API.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Prisma se corre desde packages/db (ahí están su configuración y las migraciones).
const carpetaDb = fileURLToPath(new URL("..", import.meta.url));

if (process.env.RAILWAY_ENVIRONMENT_NAME !== "production") {
  console.log("[migraciones] No es el ambiente de producción de Railway: no se migra.");
  process.exit(0);
}

const directa = process.env.DIRECT_URL;
if (!directa) {
  console.error(
    "[migraciones] Falta DIRECT_URL en las variables del servicio de la API en Railway. Sin ella no se puede migrar, así que no se publica y sigue andando la versión anterior.",
  );
  process.exit(1);
}

console.log("[migraciones] Aplicando migraciones pendientes en producción…");
const resultado = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  cwd: carpetaDb,
  env: { ...process.env, DATABASE_URL: directa },
});

if (resultado.status !== 0) {
  console.error("[migraciones] Falló una migración. No se publica y sigue andando la versión anterior.");
  process.exit(resultado.status ?? 1);
}
