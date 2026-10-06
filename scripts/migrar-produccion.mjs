// Aplica las migraciones pendientes en la base de producción, como parte del build (ADR 0009).
//
// Solo corre en el build de producción de Vercel (VERCEL_ENV=production). En local, en los
// espacios y en las vistas previas de Vercel no hace nada: una branch sin mezclar nunca toca
// la base de producción.
//
// Usa DIRECT_URL, la dirección directa de Neon (sin pooling), porque Neon la pide para cambiar
// la estructura de la base. DATABASE_URL (con pooling) la sigue usando la app.
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[migraciones] No es el build de producción: no se migra.");
  process.exit(0);
}

const directa = process.env.DIRECT_URL;
if (!directa) {
  console.error(
    "[migraciones] Falta DIRECT_URL en Vercel (producción). Sin ella no se puede migrar, así que el build se detiene y sigue publicada la versión anterior.",
  );
  process.exit(1);
}

console.log("[migraciones] Aplicando migraciones pendientes en producción…");
const resultado = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: directa },
});

if (resultado.status !== 0) {
  console.error(
    "[migraciones] Falló una migración. El build se detiene y sigue publicada la versión anterior.",
  );
  process.exit(resultado.status ?? 1);
}
