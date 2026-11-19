// Carga el catálogo de servicios (prisma/datos/catalogo-servicios.csv) en la tabla Servicio.
//
// Es como pasar una lista de precios a la base: si un servicio ya está (mismo
// código y mismo nombre) no se duplica, así que se puede correr las veces que haga falta.
// El código solo no alcanza como llave: la fuente trae tres códigos repetidos con
// nombres distintos (RR-601, RR-602, RR-604), por eso la llave es código + nombre.
//
// Uso:  npx tsx scripts/cargar-catalogo.ts

import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ORG_PROGES } from "../src/lib/org";

// El catálogo es de Proges y vale para todos los clientes: vive en el espacio de Proges.
const ORG = ORG_PROGES;
const ARCHIVO = resolve(process.cwd(), "prisma/datos/catalogo-servicios.csv");

type Fila = { codigo: string; familia: string; nombre: string; unidad: string | null };

// Lee el CSV (separador «;», columnas codigo;nombre;unidad) y se detiene con un
// mensaje claro, con el número de línea, si una fila viene mal.
function leerFilas(): Fila[] {
  const lineas = readFileSync(ARCHIVO, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas[0]?.trim() !== "codigo;nombre;unidad") {
    throw new Error(`${ARCHIVO}: la primera línea debe ser «codigo;nombre;unidad» y es «${lineas[0]}».`);
  }
  const vistas = new Set<string>();
  return lineas.slice(1).map((linea, i) => {
    const n = i + 2; // número de línea en el archivo (la 1 es el encabezado)
    const partes = linea.split(";").map((p) => p.trim());
    if (partes.length !== 3) {
      throw new Error(`Línea ${n}: se esperaban 3 columnas separadas por «;» y hay ${partes.length}: «${linea}».`);
    }
    const [codigo, nombre, unidad] = partes;
    if (!/^[A-Z]+-\d+$/.test(codigo)) {
      throw new Error(`Línea ${n}: el código «${codigo}» no tiene la forma FAMILIA-número (por ejemplo NV-100).`);
    }
    if (!nombre) throw new Error(`Línea ${n}: el código ${codigo} no trae nombre.`);
    const llave = `${codigo}|${nombre}`;
    if (vistas.has(llave)) throw new Error(`Línea ${n}: «${codigo} ${nombre}» está repetido en el archivo.`);
    vistas.add(llave);
    return { codigo, familia: codigo.split("-")[0], nombre, unidad: unidad || null };
  });
}

async function main() {
  const filas = leerFilas();
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });
  try {
    let creados = 0;
    let existian = 0;
    for (const f of filas) {
      const llave = { organizationId_codigo_nombre: { organizationId: ORG, codigo: f.codigo, nombre: f.nombre } };
      const antes = await db.servicio.findUnique({ where: llave });
      await db.servicio.upsert({
        where: llave,
        create: { organizationId: ORG, ...f },
        // Si ya estaba, solo se actualizan familia y unidad; no se reactiva uno que el equipo desactivó.
        update: { familia: f.familia, unidad: f.unidad },
      });
      if (antes) existian++;
      else creados++;
    }
    console.log(`Catálogo de servicios: ${creados} creados, ${existian} ya existían (${filas.length} filas en el archivo).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("No se pudo cargar el catálogo:", e instanceof Error ? e.message : e);
  process.exit(1);
});
