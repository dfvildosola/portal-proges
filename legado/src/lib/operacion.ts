// Las consultas de «Trabajo del equipo» (la pantalla /operacion) que cruzan clientes.
//
// El resto del portal filtra por los espacios que se pueden leer (`espaciosQueLee()` de
// `src/lib/org.ts`). Acá el equipo de Proges mira todos los pisos a la vez (los proyectos por
// revisar y las cifras de hoy) y arma sus propios filtros por cliente. Las tareas, en cambio,
// salen de `src/lib/tareas.ts` con `espaciosQueLee()`. REGLA de este archivo:
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

// Los ids de los clientes activos. Las solicitudes de un cliente desactivado no se cuentan:
// sus usuarios ya no entran, y un servicio abierto ahí quedaría fuera de Operación.
async function idsClientesActivos(): Promise<string[]> {
  return (await clientesDeOperacion()).map((c) => c.id);
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
// Los proyectos por revisar (los pedidos de los clientes)
// ---------------------------------------------------------------------------

// Cuántos proyectos esperan revisión: el número rojo de «Trabajo del equipo» en el menú.
export async function contarPorRevisar(): Promise<number> {
  await exigirEquipo();
  return db.servicioEnCurso.count({
    where: { porRevisar: true, estado: "ABIERTO", organizationId: { in: await idsClientesActivos() } },
  });
}

// Los proyectos «por revisar» (nacen del pedido de un cliente), los más antiguos primero
// (llevan más esperando), con lo que el cliente pidió. `clienteId` filtra por cliente.
export async function proyectosPorRevisar(clienteId: string | null) {
  await exigirEquipo();
  const clientes = await clientesDeOperacion();
  const proyectos = await db.servicioEnCurso.findMany({
    where: {
      porRevisar: true,
      estado: "ABIERTO",
      organizationId: espaciosAConsultar(clientes, clienteId),
    },
    orderBy: { abiertoEl: "asc" },
    select: {
      id: true,
      organizationId: true,
      tipo: true,
      servicioId: true,
      abiertoEl: true,
      property: { select: { id: true, direccion: true, comuna: true } },
      solicitud: { select: { descripcion: true, pedidaPor: { select: { nombre: true } } } },
    },
  });
  const nombres = new Map(clientes.map((c) => [c.id, c.nombre]));
  return proyectos.map((p) => ({
    ...p,
    cliente: nombres.get(p.organizationId) ?? "Cliente desconocido",
  }));
}

// El catálogo activo de Proges, para elegir qué servicio es el proyecto al revisarlo.
export async function catalogoParaRevisar() {
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
      // Los «por revisar» tienen su propia sección arriba: acá solo lo que ya se repartió.
      porRevisar: false,
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
