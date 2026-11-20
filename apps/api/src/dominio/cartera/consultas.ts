// Lo que comparten las consultas de la cartera: cómo se piden las páginas, qué se trae junto con
// cada contrato o cobro, y los filtros por estado.
//
// Los estados «de hoy» (un cobro sin pagar que ya venció está ATRASADO aunque nadie lo marcara;
// un contrato con salida pasada está TERMINADO) no se guardan: se calculan al mirar. Para filtrar
// por ellos en la base hay que escribir la misma regla como condición de la consulta, y vive aquí,
// al lado de las funciones puras que dicen lo mismo (administracion.ts y contratos.ts).
import type { Prisma } from "@proges/db";
import type { EstadoCobro, EstadoContrato, PaginacionRespuesta } from "@proges/contrato";

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------

export function paginar(q: { pagina: number; porPagina: number }): { skip: number; take: number } {
  return { skip: (q.pagina - 1) * q.porPagina, take: q.porPagina };
}

export function respuestaPagina<T>(
  items: T[],
  total: number,
  q: { pagina: number; porPagina: number },
): { items: T[]; paginacion: PaginacionRespuesta } {
  return { items, paginacion: { pagina: q.pagina, porPagina: q.porPagina, total } };
}

// ---------------------------------------------------------------------------
// Qué se trae junto
// ---------------------------------------------------------------------------

// Un contrato con la dirección de su propiedad y el nombre de su arrendatario.
export const CONTRATO_INCLUYE = {
  property: { select: { direccion: true } },
  tenant: { select: { nombre: true } },
} as const satisfies Prisma.LeaseContractInclude;
export type ContratoLeido = Prisma.LeaseContractGetPayload<{ include: typeof CONTRATO_INCLUYE }>;

// Un cobro con su contrato (de ahí salen la propiedad y el arrendatario).
export const COBRO_INCLUYE = {
  contract: {
    select: {
      propertyId: true,
      property: { select: { direccion: true } },
      tenant: { select: { nombre: true } },
    },
  },
} as const satisfies Prisma.RentChargeInclude;
export type CobroLeido = Prisma.RentChargeGetPayload<{ include: typeof COBRO_INCLUYE }>;

// ---------------------------------------------------------------------------
// Filtros por estado
// ---------------------------------------------------------------------------

// Mismo criterio que estadoDelCobro (administracion.ts): PAGADO manda; ATRASADO si lo marcaron a
// mano o ya venció (vence hoy = todavía no está atrasado); el resto está PENDIENTE.
export function whereEstadoCobro(estado: EstadoCobro, hoy: Date): Prisma.RentChargeWhereInput {
  if (estado === "PAGADO") return { estado: "PAGADO" };
  if (estado === "ATRASADO") {
    return { OR: [{ estado: "ATRASADO" }, { estado: "PENDIENTE", fechaVencimiento: { lt: hoy } }] };
  }
  return { estado: "PENDIENTE", fechaVencimiento: { gte: hoy } };
}

// Mismo criterio que estadoContrato (contratos.ts).
export function whereEstadoContrato(estado: EstadoContrato, hoy: Date): Prisma.LeaseContractWhereInput {
  const yaEmpezo = { fechaInicio: { lte: hoy } };
  switch (estado) {
    case "POR_EMPEZAR":
      return { fechaInicio: { gt: hoy } };
    case "TERMINA":
      return { ...yaEmpezo, fechaSalida: { gte: hoy } };
    case "TERMINADO":
      return { ...yaEmpezo, fechaSalida: { lt: hoy } };
    case "VENCIDO":
      return { ...yaEmpezo, fechaSalida: null, renovacionAutomatica: false, fechaTermino: { lt: hoy } };
    case "VIGENTE":
      return {
        ...yaEmpezo,
        fechaSalida: null,
        OR: [{ renovacionAutomatica: true }, { fechaTermino: { gte: hoy } }],
      };
  }
}
