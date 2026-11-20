// Falla si un archivo de código de apps/ o packages/ pasa de 800 líneas (regla de código 4 de
// ~/Code/CLAUDE.md). Un archivo tan largo ya no se lee de corrido: hay que partirlo antes de
// agregarle algo. Corre dentro de `npm run verificar`.
//
// Revisa .ts, .tsx y .prisma; se salta node_modules y lo que genera Prisma.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const TOPE = 800;
const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const CARPETAS = ["apps", "packages"];
const SALTAR = new Set(["node_modules", "generated", ".next", "dist"]);
const EXTENSIONES = /\.(ts|tsx|prisma)$/;

function* archivos(carpeta) {
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    if (SALTAR.has(entrada.name)) continue;
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) yield* archivos(ruta);
    else if (EXTENSIONES.test(entrada.name)) yield ruta;
  }
}

const largos = [];
for (const carpeta of CARPETAS) {
  for (const ruta of archivos(join(RAIZ, carpeta))) {
    const lineas = readFileSync(ruta, "utf8").split("\n").length;
    if (lineas > TOPE) largos.push(`  ${relative(RAIZ, ruta)}: ${lineas} líneas`);
  }
}

if (largos.length > 0) {
  console.error(`Estos archivos pasan de ${TOPE} líneas; pártelos antes de seguir:\n${largos.join("\n")}`);
  process.exit(1);
}
console.log(`Ningún archivo de ${CARPETAS.join(" ni ")} pasa de ${TOPE} líneas.`);
