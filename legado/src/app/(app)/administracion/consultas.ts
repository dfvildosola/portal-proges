// Las consultas de la administración de arriendos: leen la base y arman filas listas para
// que las funciones puras de src/lib/administracion.ts hagan las cuentas. Las usan la
// pantalla /administracion y la tarjeta de la ficha de la propiedad.
//
// Estas funciones NO revisan permisos: quien las llama pasa los espacios que ya puede leer
// (`espaciosQueLee()`) o comprueba el espacio de la propiedad antes.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { estaVigente } from "@/lib/contratos";
import { rangoDelMes } from "@/lib/fechas";
import { periodoDe, type CobroDato, type Moneda } from "@/lib/administracion";

export type FilaAdministracion = {
  id: string;
  organizationId: string;
  propertyId: string;
  direccion: string;
  rolSII: string | null;
  desde: Date;
  hasta: Date | null;
  comisionPct: number;
  // El arrendatario y el arriendo del contrato que corre hoy (null si no hay ninguno).
  arrendatario: string | null;
  arriendo: { monto: number; moneda: Moneda } | null;
  // Los cobros de la propiedad desde que empezó la administración.
  cobros: CobroDato[];
};

type AdministracionConPropiedad = Awaited<ReturnType<typeof leerAdministraciones>>[number];

function leerAdministraciones(where: Prisma.AdministracionWhereInput) {
  return db.administracion.findMany({
    where,
    orderBy: { desde: "desc" },
    include: { property: { select: { direccion: true, rolSII: true } } },
  });
}

// Completa cada administración con su arrendatario de hoy y sus cobros.
async function completar(
  adms: AdministracionConPropiedad[],
  hoy: Date,
): Promise<FilaAdministracion[]> {
  if (adms.length === 0) return [];
  const propertyIds = [...new Set(adms.map((a) => a.propertyId))];
  const orgIds = [...new Set(adms.map((a) => a.organizationId))];
  const primerPeriodo = periodoDe(new Date(Math.min(...adms.map((a) => a.desde.getTime()))));

  const [contratos, cobros] = await Promise.all([
    db.leaseContract.findMany({
      where: { organizationId: { in: orgIds }, propertyId: { in: propertyIds } },
      select: {
        propertyId: true,
        monto: true,
        moneda: true,
        fechaInicio: true,
        fechaTermino: true,
        fechaSalida: true,
        renovacionAutomatica: true,
        plazoMeses: true,
        tenant: { select: { nombre: true } },
      },
      orderBy: { fechaInicio: "desc" },
    }),
    db.rentCharge.findMany({
      where: {
        organizationId: { in: orgIds },
        periodo: { gte: primerPeriodo },
        contract: { propertyId: { in: propertyIds } },
      },
      select: {
        periodo: true,
        montoEsperado: true,
        moneda: true,
        fechaVencimiento: true,
        estado: true,
        contract: { select: { propertyId: true } },
      },
    }),
  ]);

  return adms.map((a) => {
    // El contrato que corre hoy: el más reciente entre los vigentes de esa propiedad.
    const vigente = contratos.find((c) => c.propertyId === a.propertyId && estaVigente(c, hoy));
    return {
      id: a.id,
      organizationId: a.organizationId,
      propertyId: a.propertyId,
      direccion: a.property.direccion,
      rolSII: a.property.rolSII,
      desde: a.desde,
      hasta: a.hasta,
      comisionPct: Number(a.comisionPct),
      arrendatario: vigente?.tenant.nombre ?? null,
      arriendo: vigente ? { monto: Number(vigente.monto), moneda: vigente.moneda } : null,
      cobros: cobros
        .filter((c) => c.contract.propertyId === a.propertyId)
        .map((c) => ({
          periodo: c.periodo,
          montoEsperado: Number(c.montoEsperado),
          moneda: c.moneda,
          fechaVencimiento: c.fechaVencimiento,
          estado: c.estado,
        })),
    };
  });
}

// Para /administracion: las administraciones vigentes hoy y las que tocan el mes elegido (una
// que ya terminó todavía se factura por sus meses). Quien llama separa unas de otras con
// administracionVigente() y mesEnAdministracion().
export async function administracionesParaPagina(
  orgIds: string[],
  mes: string,
  hoy: Date,
): Promise<FilaAdministracion[]> {
  const { inicio, fin } = rangoDelMes(mes);
  const adms = await leerAdministraciones({
    organizationId: { in: orgIds },
    OR: [
      { hasta: null },
      { hasta: { gte: hoy } },
      { desde: { lte: fin }, hasta: { gte: inicio } },
    ],
  });
  return completar(adms, hoy);
}

// Para la tarjeta de la ficha: la administración más reciente de la propiedad (la vigente, o
// la última que terminó), o null si nunca estuvo en administración.
export async function administracionDePropiedad(
  propertyId: string,
  orgId: string,
  hoy: Date,
): Promise<FilaAdministracion | null> {
  const adms = await leerAdministraciones({ propertyId, organizationId: orgId });
  const [masReciente] = await completar(adms.slice(0, 1), hoy);
  return masReciente ?? null;
}
