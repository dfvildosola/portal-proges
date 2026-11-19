// Crea (o actualiza) un Usuario de EQUIPO en la organización de Proges.
// Sirve para el primer admin: desde /equipo solo puede crear usuarios alguien que ya es admin,
// así que el primero tiene que nacer por aquí.
//
// Uso:  npx tsx scripts/crear-usuario.ts --email ana@progesspa.cl --nombre "Ana Pérez" [--admin]
// Correrlo dos veces con el mismo correo no duplica: la segunda actualiza nombre y admin.

import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Mismo valor fijo que usa el resto del portal (src/lib/org.ts).
const ORG = "org_proges";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nombre: { type: "string" },
    admin: { type: "boolean", default: false },
  },
});

const email = values.email?.trim().toLowerCase();
const nombre = values.nombre?.trim();
if (!email || !nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error('Uso: npx tsx scripts/crear-usuario.ts --email correo@dominio.cl --nombre "Nombre" [--admin]');
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente && existente.organizationId !== ORG) {
    throw new Error(`El correo ${email} ya existe en otra organización (${existente.organizationId}).`);
  }
  // Al actualizar, el usuario pasa a ser EQUIPO activo y sin grupo (es para el equipo, no para clientes).
  const datos = {
    nombre: nombre!,
    rol: "EQUIPO" as const,
    admin: values.admin ?? false,
    activo: true,
    grupoId: null,
    alcance: "GRUPO" as const,
  };
  const usuario = existente
    ? await db.usuario.update({ where: { id: existente.id }, data: datos })
    : await db.usuario.create({ data: { ...datos, email: email!, organizationId: ORG } });
  console.log(
    `${existente ? "Actualizado" : "Creado"}: ${usuario.email} (${usuario.nombre}), EQUIPO${usuario.admin ? ", admin" : ""}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
