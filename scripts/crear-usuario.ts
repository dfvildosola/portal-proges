// Crea (o actualiza) un usuario del portal, por correo.
//
// - Sin --cliente: un usuario de EQUIPO, en el espacio de Proges. Sirve para el primer admin:
//   desde /equipo solo puede crear usuarios alguien que ya es admin, así que el primero tiene
//   que nacer por aquí.
// - Con --cliente "Nombre": un usuario CLIENTE del espacio de ese cliente (si el cliente no
//   existe, se crea). Un usuario de cliente administra la cartera de su espacio y nunca es admin.
//
// Uso:  npx tsx scripts/crear-usuario.ts --email ana@progesspa.cl --nombre "Ana Pérez" [--admin]
//       npx tsx scripts/crear-usuario.ts --email dueno@npl.cl --nombre "Pedro" --cliente "NPL"
// Correrlo dos veces con el mismo correo no duplica: la segunda actualiza el nombre (y el admin).

import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ORG_PROGES } from "../src/lib/org";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nombre: { type: "string" },
    admin: { type: "boolean", default: false },
    cliente: { type: "string" },
  },
});

const USO =
  'Uso: npx tsx scripts/crear-usuario.ts --email correo@dominio.cl --nombre "Nombre" [--admin | --cliente "Cliente"]';

const email = values.email?.trim().toLowerCase();
const nombre = values.nombre?.trim();
const nombreCliente = values.cliente?.trim();
if (!email || !nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(USO);
if (values.cliente !== undefined && !nombreCliente) throw new Error(`--cliente necesita un nombre. ${USO}`);
if (nombreCliente && values.admin) throw new Error("Un usuario de cliente no puede ser admin: el admin es del equipo de Proges.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// El id del espacio de un cliente sale de su nombre: «NPL» → org_npl. Sin tildes ni espacios.
// (Misma regla que scripts/carga-inicial.ts: los dos tienen que dar el mismo id.)
function idDeCliente(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (!base) throw new Error(`El nombre de cliente «${nombre}» no tiene letras ni números.`);
  return `org_${base}`;
}

// Busca el espacio del cliente por nombre; si no existe, lo crea. Devuelve su id.
async function asegurarCliente(nombre: string): Promise<string> {
  const existente = await db.organizacion.findFirst({
    // Sin distinguir mayúsculas, igual que /equipo: «npl» es el mismo cliente que «NPL».
    where: { nombre: { equals: nombre, mode: "insensitive" }, tipo: "CLIENTE" },
  });
  if (existente) {
    if (!existente.activa) throw new Error(`El cliente «${nombre}» existe pero está desactivado.`);
    return existente.id;
  }
  const id = idDeCliente(nombre);
  const choca = await db.organizacion.findUnique({ where: { id } });
  if (choca) throw new Error(`Ya existe el espacio ${id} y no es un cliente llamado «${nombre}» (es «${choca.nombre}», ${choca.tipo}).`);
  await db.organizacion.create({ data: { id, nombre, tipo: "CLIENTE" } });
  console.log(`Cliente «${nombre}» creado (${id}).`);
  return id;
}

async function main() {
  const organizationId = nombreCliente ? await asegurarCliente(nombreCliente) : ORG_PROGES;
  const rol = nombreCliente ? ("CLIENTE" as const) : ("EQUIPO" as const);

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente && existente.organizationId !== organizationId) {
    throw new Error(`El correo ${email} ya existe en otro espacio (${existente.organizationId}) y no se mueve.`);
  }
  // Al actualizar, el usuario queda activo con el rol que corresponde a este comando.
  const datos = { nombre: nombre!, rol, admin: values.admin ?? false, activo: true };
  const usuario = existente
    ? await db.usuario.update({ where: { id: existente.id }, data: datos })
    : await db.usuario.create({ data: { ...datos, email: email!, organizationId } });
  console.log(
    `${existente ? "Actualizado" : "Creado"}: ${usuario.email} (${usuario.nombre}), ${usuario.rol}${usuario.admin ? ", admin" : ""}, espacio ${usuario.organizationId}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
