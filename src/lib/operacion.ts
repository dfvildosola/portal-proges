// Las ÚNICAS consultas del portal que cruzan clientes.
//
// Todo el resto del portal lee un solo espacio (el de `getOrgId()`): es como un edificio donde
// cada cliente solo puede entrar a su piso. Acá, en cambio, el equipo de Proges mira todos los
// pisos a la vez (la bandeja de solicitudes y la pantalla de Operación). Por eso este archivo
// es el único lugar donde se consulta sin filtrar por `getOrgId()`, y por eso REGLA:
//
//   Cada función de este archivo parte exigiendo que quien llama sea del EQUIPO.
//   Un CLIENTE (o nadie) recibe Error("Sin permiso") antes de que se toque la base.
//
// Si agregas una consulta que cruza clientes, va acá y empieza con `exigirEquipo()`.
// Lo que vive en el espacio de Proges (etapas, equipo) se filtra por ORG_PROGES.

import { db } from "@/lib/db";
import { ORG_PROGES } from "@/lib/org";
import { usuarioActual } from "@/lib/sesion";
import { sumarDias } from "@/lib/fechas";
import type { ServicioTipo } from "@/generated/prisma/enums";

// Valor del filtro «Responsable» para los servicios que no lleva nadie.
export const SIN_RESPONSABLE = "sin";

// Lo que se puede filtrar en la pantalla de Operación. `null` es «todos».
export type FiltroOperacion = {
  tipo: ServicioTipo | null;
  responsable: string | null; // un id de usuario, SIN_RESPONSABLE o null
  cliente: string | null; // un id de cliente o null
};

// Falla con «Sin permiso» si quien llama no es del equipo. No redirige: estas funciones se
// llaman desde páginas, desde el layout y desde acciones, y un error es lo único seguro en todas.
async function exigirEquipo(): Promise<void> {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "EQUIPO") throw new Error("Sin permiso");
}

// Los clientes activos: la lista contra la que se filtra todo lo demás.
export async function clientesDeOperacion(): Promise<{ id: string; nombre: string }[]> {
  await exigirEquipo();
  return db.organizacion.findMany({
    where: { tipo: "CLIENTE", activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
}

// Qué espacios se consultan: el cliente elegido en el filtro, o todos los activos.
// Un cliente que no existe o está desactivado se ignora (no rompe la página).
function espaciosAConsultar(
  clientes: { id: string }[],
  clienteId: string | null,
): { in: string[] } {
  const ids = clientes.map((c) => c.id);
  return { in: clienteId && ids.includes(clienteId) ? [clienteId] : ids };
}

// El filtro de tipo y responsable, igual para los servicios y para sus visitas.
function delServicio(filtro: FiltroOperacion) {
  return {
    ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
    ...(filtro.responsable
      ? { responsableId: filtro.responsable === SIN_RESPONSABLE ? null : filtro.responsable }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// La bandeja de solicitudes
// ---------------------------------------------------------------------------

// Cuántas solicitudes esperan respuesta: el número rojo del menú.
export async function contarSolicitudesNuevas(): Promise<number> {
  await exigirEquipo();
  return db.solicitud.count({ where: { estado: "NUEVA" } });
}

// Las solicitudes NUEVA de todos los clientes, las más antiguas primero (llevan más esperando).
export async function solicitudesNuevas() {
  await exigirEquipo();
  const [solicitudes, clientes] = await Promise.all([
    db.solicitud.findMany({
      where: { estado: "NUEVA" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        organizationId: true,
        tipo: true,
        descripcion: true,
        createdAt: true,
        property: { select: { id: true, direccion: true, comuna: true } },
        pedidaPor: { select: { nombre: true } },
      },
    }),
    // La tabla Solicitud guarda el cliente como texto (sin relación): el nombre se busca aparte.
    db.organizacion.findMany({
      where: { tipo: "CLIENTE" },
      select: { id: true, nombre: true },
    }),
  ]);
  const nombres = new Map(clientes.map((c) => [c.id, c.nombre]));
  return solicitudes.map((s) => ({
    ...s,
    cliente: nombres.get(s.organizationId) ?? "Cliente desconocido",
  }));
}

// El catálogo activo de Proges, para elegir qué servicio abre una solicitud aceptada.
export async function catalogoParaAceptar() {
  await exigirEquipo();
  return db.servicio.findMany({
    where: { organizationId: ORG_PROGES, activo: true },
    orderBy: [{ codigo: "asc" }, { nombre: "asc" }],
    select: { id: true, codigo: true, nombre: true, familia: true },
  });
}

// ---------------------------------------------------------------------------
// Lo de hoy, para todos los clientes
// ---------------------------------------------------------------------------

// El equipo activo de Proges: los posibles responsables de un servicio.
export async function equipoActivo(): Promise<{ id: string; nombre: string }[]> {
  await exigirEquipo();
  return db.usuario.findMany({
    where: { organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
}

// Las etapas de todos los tipos. Son de Proges y valen para todos los clientes.
export async function etapasDeProges() {
  await exigirEquipo();
  return db.etapa.findMany({
    where: { organizationId: ORG_PROGES },
    orderBy: [{ tipo: "asc" }, { orden: "asc" }],
    select: { id: true, tipo: true, nombre: true, activa: true },
  });
}

// Los servicios abiertos de los clientes activos (o de uno, si el filtro lo pide).
export async function serviciosAbiertos(
  filtro: FiltroOperacion,
  clientes: { id: string }[],
) {
  await exigirEquipo();
  return db.servicioEnCurso.findMany({
    where: {
      organizationId: espaciosAConsultar(clientes, filtro.cliente),
      estado: "ABIERTO",
      ...delServicio(filtro),
    },
    select: {
      id: true,
      organizationId: true,
      tipo: true,
      porConfirmar: true,
      abiertoEl: true,
      property: { select: { id: true, direccion: true, rolSII: true } },
      servicio: { select: { nombre: true } },
      etapa: { select: { id: true, nombre: true } },
      responsable: { select: { id: true, nombre: true } },
      // Desde cuándo está en su etapa: el último cambio de etapa.
      eventos: {
        where: { tipo: "ETAPA" },
        orderBy: { fecha: "desc" },
        take: 1,
        select: { fecha: true },
      },
    },
  });
}

// Las visitas de los últimos 7 días contando hoy (de hoy-6 a hoy): la misma ventana que usa
// `visitasUltimaSemana`, que es la que cuenta la cifra de arriba.
export async function visitasDeLaSemana(
  filtro: FiltroOperacion,
  clientes: { id: string }[],
  hoy: Date,
) {
  await exigirEquipo();
  return db.visita.findMany({
    where: {
      organizationId: espaciosAConsultar(clientes, filtro.cliente),
      fecha: { gte: sumarDias(hoy, -6), lte: hoy },
      servicioEnCurso: delServicio(filtro),
    },
    orderBy: { fecha: "desc" },
    select: {
      id: true,
      organizationId: true,
      fecha: true,
      evaluacion: true,
      realizadaPor: { select: { nombre: true } },
      servicioEnCurso: {
        select: {
          id: true,
          tipo: true,
          property: { select: { id: true, direccion: true } },
        },
      },
    },
  });
}
