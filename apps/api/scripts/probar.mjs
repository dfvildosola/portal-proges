// Corre las pruebas de la API: `npm run prueba -w @proges/api` (todas) o
// `npm run prueba -w @proges/api -- test/acceso.test.ts` (una).
//
// Antes deja lista la base de pruebas: la crea si no existe y le aplica las migraciones que le
// falten (las mismas de packages/db). Así nadie tiene que acordarse de prepararla.
//
// La dirección de la base sale de apps/api/.env.test (que no va a git: se copia de
// .env.test.ejemplo). Por seguridad, solo se aceptan bases terminadas en _test: este script
// nunca toca proges_dev ni producción.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const carpetaApi = fileURLToPath(new URL("..", import.meta.url));
const carpetaDb = fileURLToPath(new URL("../../../packages/db", import.meta.url));

function fallar(mensaje) {
  console.error(`[pruebas] ${mensaje}`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  fallar("Falta DATABASE_URL. Copia apps/api/.env.test.ejemplo a apps/api/.env.test y pon tu usuario del Mac.");
}
const direccion = new URL(url);
const nombreBase = direccion.pathname.slice(1);
if (!nombreBase.endsWith("_test")) {
  fallar(`DATABASE_URL apunta a «${nombreBase}», y las pruebas solo corren sobre una base terminada en _test.`);
}

// 1. Crear la base si no existe. Si otra corrida la creó al mismo tiempo, createdb dice
//    «already exists»: eso está bien.
const crear = spawnSync(
  "createdb",
  [
    `--host=${direccion.hostname || "localhost"}`,
    `--port=${direccion.port || "5432"}`,
    ...(direccion.username ? [`--username=${decodeURIComponent(direccion.username)}`] : []),
    nombreBase,
  ],
  {
    encoding: "utf8",
    env: { ...process.env, ...(direccion.password ? { PGPASSWORD: decodeURIComponent(direccion.password) } : {}) },
  },
);
if (crear.error) fallar(`No se pudo correr createdb (¿está instalado Postgres?): ${crear.error.message}`);
if (crear.status !== 0 && !crear.stderr.includes("already exists")) {
  fallar(`No se pudo crear la base ${nombreBase}: ${crear.stderr.trim()}`);
}

// 2. Aplicar las migraciones que falten. Prisma se corre desde packages/db (ahí están su
//    configuración y las migraciones). Si dos corridas migran a la vez, Prisma las pone en fila.
const migrar = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: carpetaDb,
  encoding: "utf8",
  env: process.env,
});
if (migrar.status !== 0) {
  fallar(`Falló aplicar las migraciones en ${nombreBase}:\n${migrar.stdout}\n${migrar.stderr}`);
}

// 3. Las pruebas. Sin archivos, todas las de test/. --test-force-exit: al terminar, el proceso
//    sale aunque queden conexiones a la base abiertas (si no, espera 10 segundos por archivo).
const archivos = process.argv.slice(2);
const pruebas = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-force-exit", ...(archivos.length > 0 ? archivos : ["test/**/*.test.ts"])],
  { cwd: carpetaApi, stdio: "inherit", env: process.env },
);
if (pruebas.error) fallar(`No se pudieron correr las pruebas: ${pruebas.error.message}`);
process.exit(pruebas.status ?? 1);
