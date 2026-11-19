// Carga inicial: crea en la base las propiedades del inventario del Drive
// (docs/inventario-drive/inventario.csv), con el enlace a su carpeta y los
// servicios que se deducen de sus documentos, todos marcados «por confirmar».
//
// Es como pasar una lista de carpetas a fichas de papel: cada propiedad queda con
// una ficha provisoria que el equipo después confirma o corrige en el portal.
// Se puede correr las veces que haga falta: si una propiedad ya existe (mismo id
// de carpeta del Drive) no se toca, así que repetir el script no duplica nada.
//
// Lo que NO entra: las propiedades «Venta en cierre / posiblemente vendida»
// (decisión de Diego: se archivan, no se cargan) y las carpetas sin comuna, que no
// son propiedades (hoy solo «DOCUMENTOS VARIOS (FORMATOS Y LEGALES)», la carpeta de formatos).
//
// Cada cliente tiene su propio espacio (una Organizacion). Las propiedades entran al espacio
// del cliente que se indica; el catálogo de servicios y las etapas, en cambio, son de Proges
// y se leen siempre de su espacio (ORG_PROGES). Hasta que se sepa qué sociedad es dueña de
// cada propiedad, todas quedan con la «Sociedad por confirmar» de ese cliente.
//
// Uso:  npx tsx scripts/carga-inicial.ts --cliente "Nombre" [--simular]
//   --cliente  obligatorio: el cliente dueño de la cartera (si no existe, se crea)
//   --simular  no escribe nada: solo cuenta e imprime lo que haría

import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { PropertyType, ServicioTipo } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ORG_PROGES } from "../src/lib/org";

const ARCHIVO = resolve(process.cwd(), "docs/inventario-drive/inventario.csv");
const SOCIEDAD_NOMBRE = "Sociedad por confirmar";
const SOCIEDAD_RUT = "SIN-RUT";
const MOTIVO = "Carga inicial desde el inventario del Drive";

// ---------------------------------------------------------------------------
// Qué servicio se deduce de cada etapa probable del inventario
// ---------------------------------------------------------------------------

type Deduccion = {
  // Cómo empieza la etapa del inventario, ya sin tildes ni mayúsculas.
  comienzo: string;
  // null = la propiedad queda sin servicios.
  servicio: { tipo: ServicioTipo; codigo: string; etapa?: string } | null;
};

const DEDUCCIONES: Deduccion[] = [
  { comienzo: "venta en cierre", servicio: null }, // vendidas: ni siquiera entran (se filtran antes)
  { comienzo: "evaluacion inicial", servicio: { tipo: "INSPECCION", codigo: "IRP-100" } },
  { comienzo: "toma de posesion", servicio: { tipo: "INSPECCION", codigo: "IRP-400" } },
  { comienzo: "en regularizacion", servicio: { tipo: "INSPECCION", codigo: "IRP-200" } },
  { comienzo: "en reparacion", servicio: { tipo: "OBRA", codigo: "RR-0" } },
  { comienzo: "reparada", servicio: { tipo: "VENTA", codigo: "NV-100" } },
  { comienzo: "en venta", servicio: { tipo: "VENTA", codigo: "NV-100", etapa: "Con oferta" } },
  { comienzo: "arrendada", servicio: { tipo: "ADMINISTRACION", codigo: "ADMP-0" } },
  { comienzo: "sin clasificar", servicio: null },
  { comienzo: "sin contenido", servicio: null },
];

// Minúsculas y sin tildes, para comparar sin que importe cómo se escribió.
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function esVendida(etapaProbable: string): boolean {
  return normalizar(etapaProbable).startsWith("venta en cierre");
}

// El tipo de propiedad se supone mirando la dirección: es una suposición que el
// script lista al final para que el equipo la revise.
function deducirTipo(direccion: string): PropertyType {
  const d = normalizar(direccion);
  // El inventario escribe «of 706» y «dp 84» tanto con punto como sin él: se aceptan los dos.
  if (/\bof\b/.test(d) || d.includes("oficina")) return "OFICINA";
  if (/\b(depto|dpto|departamento|dp)\b/.test(d)) return "DEPARTAMENTO";
  if (/\blocal\b/.test(d)) return "LOCAL";
  if (/\bparcela\b/.test(d)) return "PARCELA";
  return "CASA";
}

// ---------------------------------------------------------------------------
// Lectura del CSV (con comillas, comas y saltos de línea dentro de un campo)
// ---------------------------------------------------------------------------

function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'; // comilla doble dentro de comillas = una comilla
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      campo = "";
      if (fila.some((x) => x !== "")) filas.push(fila);
      fila = [];
    } else {
      campo += c;
    }
  }
  if (entreComillas) throw new Error(`${ARCHIVO}: hay unas comillas sin cerrar.`);
  fila.push(campo);
  if (fila.some((x) => x !== "")) filas.push(fila);
  return filas;
}

type Propiedad = {
  linea: number; // fila dentro del archivo (la 1 es el encabezado), para los mensajes de error
  carpeta: string;
  id: string;
  comuna: string;
  direccion: string;
  etapaProbable: string;
};

function leerInventario(): Propiedad[] {
  const texto = readFileSync(ARCHIVO, "utf8").replace(/^﻿/, ""); // el archivo trae BOM
  const [encabezado, ...filas] = parsearCsv(texto);
  const col = (nombre: string) => {
    const i = encabezado.indexOf(nombre);
    if (i === -1) throw new Error(`${ARCHIVO}: falta la columna «${nombre}».`);
    return i;
  };
  const iCarpeta = col("carpeta");
  const iId = col("id");
  const iComuna = col("comuna");
  const iDireccion = col("direccion");
  const iEtapa = col("etapa_probable");
  return filas.map((f, i) => {
    const p: Propiedad = {
      linea: i + 2,
      carpeta: f[iCarpeta]?.trim() ?? "",
      id: f[iId]?.trim() ?? "",
      comuna: f[iComuna]?.trim() ?? "",
      direccion: f[iDireccion]?.trim() ?? "",
      etapaProbable: f[iEtapa]?.trim() ?? "",
    };
    if (!p.id) throw new Error(`Fila ${p.linea} («${p.carpeta}»): no trae el id de la carpeta del Drive.`);
    if (!p.direccion) throw new Error(`Fila ${p.linea} («${p.carpeta}»): no trae dirección.`);
    return p;
  });
}

// ---------------------------------------------------------------------------
// Programa
// ---------------------------------------------------------------------------

function leerArgumentos(): { cliente: string; simular: boolean } {
  const args = process.argv.slice(2);
  const simular = args.includes("--simular");
  const i = args.indexOf("--cliente");
  const cliente = i === -1 ? undefined : args[i + 1]?.trim();
  if (!cliente || cliente.startsWith("--")) {
    throw new Error('Falta el cliente. Uso: npx tsx scripts/carga-inicial.ts --cliente "Nombre del cliente" [--simular]');
  }
  return { cliente, simular };
}

// El id del espacio de un cliente sale de su nombre: «NPL» → org_npl. Sin tildes ni espacios.
function idDeCliente(nombre: string): string {
  const base = normalizar(nombre).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!base) throw new Error(`El nombre de cliente «${nombre}» no tiene letras ni números.`);
  return `org_${base}`;
}

// Busca el espacio del cliente por nombre; si no existe, lo crea (salvo en simulación).
// Devuelve el id del espacio.
async function asegurarCliente(db: PrismaClient, nombre: string, simular: boolean): Promise<string> {
  const existente = await db.organizacion.findFirst({
    // Sin distinguir mayúsculas, igual que /equipo: «npl» es el mismo cliente que «NPL».
    where: { nombre: { equals: nombre, mode: "insensitive" }, tipo: "CLIENTE" },
  });
  if (existente) {
    if (!existente.activa) throw new Error(`El cliente «${nombre}» existe pero está desactivado.`);
    return existente.id;
  }
  const id = idDeCliente(nombre);
  if (simular) {
    console.log(`[simular] Se crearía el cliente «${nombre}» (${id}).`);
    return id;
  }
  const choca = await db.organizacion.findUnique({ where: { id } });
  if (choca) throw new Error(`Ya existe el espacio ${id} y no es un cliente llamado «${nombre}» (es «${choca.nombre}», ${choca.tipo}).`);
  await db.organizacion.create({ data: { id, nombre, tipo: "CLIENTE" } });
  console.log(`Cliente «${nombre}» creado (${id}).`);
  return id;
}

async function main() {
  const { cliente: nombreCliente, simular } = leerArgumentos();
  const inventario = leerInventario();
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  try {
    // El espacio del cliente dueño de la cartera.
    const orgCliente = await asegurarCliente(db, nombreCliente, simular);

    // Los servicios del catálogo (de Proges) se buscan una vez, por código. Si falta alguno,
    // se avisa antes de crear nada.
    const codigos = [...new Set(DEDUCCIONES.flatMap((d) => (d.servicio ? [d.servicio.codigo] : [])))];
    const catalogo = new Map<string, string>(); // código -> id del servicio
    for (const codigo of codigos) {
      const s = await db.servicio.findFirst({ where: { organizationId: ORG_PROGES, codigo, activo: true }, orderBy: { nombre: "asc" } });
      if (!s) throw new Error(`No está el servicio ${codigo} en el catálogo: falta cargar el catálogo: npx tsx scripts/cargar-catalogo.ts`);
      catalogo.set(codigo, s.id);
    }

    // La primera etapa activa de cada tipo (también de Proges), y la etapa «Con oferta» de ventas.
    const etapas = await db.etapa.findMany({ where: { organizationId: ORG_PROGES, activa: true }, orderBy: [{ tipo: "asc" }, { orden: "asc" }] });
    const etapaDe = (tipo: ServicioTipo, nombre?: string) => {
      const e = nombre ? etapas.find((x) => x.tipo === tipo && x.nombre === nombre) : etapas.find((x) => x.tipo === tipo);
      if (!e) throw new Error(`No hay etapa ${nombre ? `«${nombre}» ` : ""}activa para servicios de tipo ${tipo}: revisa las etapas del portal.`);
      return e;
    };

    // Sociedad provisoria del cliente (en simulación no se crea: solo se informa).
    let ownerId: string | null = null;
    if (simular) {
      console.log(`[simular] Se aseguraría la sociedad «${SOCIEDAD_NOMBRE}» (${SOCIEDAD_RUT}) de «${nombreCliente}».`);
    } else {
      const owner =
        (await db.owner.findFirst({ where: { organizationId: orgCliente, nombre: SOCIEDAD_NOMBRE, rut: SOCIEDAD_RUT } })) ??
        (await db.owner.create({
          data: { organizationId: orgCliente, nombre: SOCIEDAD_NOMBRE, rut: SOCIEDAD_RUT, tipo: "SOCIEDAD" },
        }));
      ownerId = owner.id;
    }

    // Contadores del resumen.
    let creadas = 0;
    let existian = 0;
    let vendidas = 0;
    const noPropiedades: string[] = [];
    const serviciosPorTipo = new Map<ServicioTipo, number>();
    const tiposSupuestos: string[] = [];
    const etapasDesconocidas: string[] = [];
    const idsVistos = new Set<string>(); // para que --simular cuente igual que la corrida real

    for (const p of inventario) {
      if (esVendida(p.etapaProbable)) {
        vendidas++;
        continue;
      }
      if (!p.comuna) {
        noPropiedades.push(`fila ${p.linea} «${p.carpeta}»`);
        continue;
      }
      if (idsVistos.has(p.id) || (await db.property.findFirst({ where: { organizationId: orgCliente, driveCarpetaId: p.id }, select: { id: true } }))) {
        existian++;
        idsVistos.add(p.id);
        continue;
      }
      idsVistos.add(p.id);

      const etapaNorm = normalizar(p.etapaProbable);
      const deduccion = DEDUCCIONES.find((d) => etapaNorm.startsWith(d.comienzo));
      if (!deduccion) etapasDesconocidas.push(`fila ${p.linea} «${p.carpeta}»: «${p.etapaProbable}»`);
      const servicio = deduccion?.servicio ?? null;
      const tipo = deducirTipo(p.direccion);
      tiposSupuestos.push(`${p.carpeta} → ${tipo}`);

      if (simular) {
        console.log(`[simular] ${p.carpeta}: propiedad ${tipo}${servicio ? ` + servicio ${servicio.tipo} (${servicio.codigo})` : ", sin servicios"}`);
      } else {
        try {
          // Una transacción por propiedad: o queda completa (ficha, dueño, servicio e historial) o no queda nada.
          await db.$transaction(async (tx: Prisma.TransactionClient) => {
            const propiedad = await tx.property.create({
              data: {
                organizationId: orgCliente,
                direccion: p.direccion,
                comuna: p.comuna,
                region: "Por confirmar",
                rolSII: null,
                tipo,
                driveCarpetaId: p.id,
              },
            });
            await tx.propertyOwner.create({
              data: { organizationId: orgCliente, propertyId: propiedad.id, ownerId: ownerId!, porcentaje: 100 },
            });
            if (servicio) {
              const etapa = etapaDe(servicio.tipo, servicio.etapa);
              const enCurso = await tx.servicioEnCurso.create({
                data: {
                  organizationId: orgCliente,
                  propertyId: propiedad.id,
                  servicioId: catalogo.get(servicio.codigo)!,
                  tipo: servicio.tipo,
                  etapaId: etapa.id,
                  estado: "ABIERTO",
                  porConfirmar: true,
                },
              });
              await tx.evento.create({
                data: {
                  organizationId: orgCliente,
                  servicioEnCursoId: enCurso.id,
                  tipo: "ETAPA",
                  etapaId: etapa.id,
                  anterior: null,
                  nuevo: etapa.nombre,
                  motivo: MOTIVO,
                },
              });
            }
          });
        } catch (e) {
          throw new Error(`Falló la fila ${p.linea} («${p.carpeta}», id ${p.id}): ${e instanceof Error ? e.message : e}`);
        }
      }
      creadas++;
      if (servicio) serviciosPorTipo.set(servicio.tipo, (serviciosPorTipo.get(servicio.tipo) ?? 0) + 1);
    }

    // Resumen.
    const verbo = simular ? "se crearían" : "creadas";
    console.log(`\nResumen para «${nombreCliente}»${simular ? " (simulación: no se escribió nada)" : ""}`);
    console.log(`  Filas en el inventario: ${inventario.length}`);
    console.log(`  Propiedades ${verbo}: ${creadas}`);
    console.log(`  Propiedades que ya existían: ${existian}`);
    console.log(`  Saltadas por vendidas: ${vendidas}`);
    console.log(`  Saltadas por no ser propiedad (sin comuna): ${noPropiedades.length}${noPropiedades.length ? ` (${noPropiedades.join("; ")})` : ""}`);
    const totalServicios = [...serviciosPorTipo.values()].reduce((a, b) => a + b, 0);
    console.log(`  Servicios ${simular ? "que se crearían" : "creados"}: ${totalServicios}`);
    for (const [tipo, n] of [...serviciosPorTipo].sort()) console.log(`    ${tipo}: ${n}`);
    if (etapasDesconocidas.length > 0) {
      console.log(`  Etapas del inventario que no conozco (quedaron sin servicios, no inventé nada):`);
      for (const l of etapasDesconocidas) console.log(`    - ${l}`);
    }
    console.log(`  Tipos de propiedad supuestos por la dirección (el equipo debe revisarlos): ${tiposSupuestos.length}`);
    for (const l of tiposSupuestos) console.log(`    - ${l}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("No se pudo hacer la carga inicial:", e instanceof Error ? e.message : e);
  process.exit(1);
});
