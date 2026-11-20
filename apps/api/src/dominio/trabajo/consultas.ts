// Las consultas a la base del trabajo del día (tablero, tareas abiertas, equipo, clientes).
//
// Todas reciben los espacios (`orgIds`) que la ruta ya sacó de `espaciosQueLee(quien, …)`: así un
// cliente nunca recibe algo de otro, y el equipo ve a todos sus clientes. «Hoy» llega como
// parámetro.
import { db, ORG_PROGES, type Prisma, type ServicioTipo } from "@proges/db";
import type { ServicioTableroItem } from "@proges/contrato";
import { itemDelTablero, tareaConServicio, type NombreDeCliente } from "./recorte";
import { seleccionFila, seleccionTareaConServicio, seleccionTareaDelTablero } from "./selecciones";
import type { FilaDeTablero } from "./tablero";

// El nombre de cada cliente por su id. Un id desconocido (cliente borrado) no rompe la respuesta.
export async function clientesPorId(orgIds: string[]): Promise<(orgId: string) => NombreDeCliente> {
  const filas = await db.organizacion.findMany({
    where: { id: { in: [...new Set(orgIds)] } },
    select: { id: true, nombre: true },
  });
  const mapa = new Map(filas.map((f) => [f.id, f]));
  return (orgId) => mapa.get(orgId) ?? { id: orgId, nombre: "Cliente desconocido" };
}

// El equipo activo de Proges: los posibles responsables de un servicio o una tarea.
export async function equipoActivo(): Promise<{ id: string; nombre: string }[]> {
  return db.usuario.findMany({
    where: { organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
}

export type FiltroTablero = { tipo?: ServicioTipo; responsable?: string };

// Los servicios abiertos de esos espacios, listos para agrupar en el tablero (con sus tareas
// pendientes y totales contadas y su próxima tarea). Entran también los «por revisar» y los «por
// confirmar»: son parte del grupo NUEVO.
export async function filasDelTablero(orgIds: string[], filtro: FiltroTablero, hoy: Date): Promise<FilaDeTablero[]> {
  const servicios = await db.servicioEnCurso.findMany({
    where: {
      organizationId: { in: orgIds },
      estado: "ABIERTO",
      ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
      ...(filtro.responsable
        ? { responsableId: filtro.responsable === "sin" ? null : filtro.responsable }
        : {}),
    },
    select: { ...seleccionFila, tareas: { select: seleccionTareaDelTablero } },
  });
  const clienteDe = await clientesPorId(servicios.map((s) => s.organizationId));
  return servicios.map((s) => ({
    tareasTotal: s.tareas.length,
    item: itemDelTablero(s, hoy, clienteDe(s.organizationId), s.tareas),
  }));
}

export type { ServicioTableroItem };

// Las tareas abiertas de esos espacios, con su servicio y propiedad. Una tarea de un servicio ya
// cancelado o terminado no es trabajo pendiente. `responsableId`: un id = las de esa persona;
// null = las que no tiene nadie; sin indicar = todas.
export async function tareasAbiertas(orgIds: string[], filtro: { responsableId?: string | null } = {}) {
  const where: Prisma.TareaWhereInput = {
    organizationId: { in: orgIds },
    hechaEl: null,
    servicioEnCurso: { estado: "ABIERTO" },
    ...(filtro.responsableId !== undefined ? { responsableId: filtro.responsableId } : {}),
  };
  const tareas = await db.tarea.findMany({ where, select: seleccionTareaConServicio });
  const clienteDe = await clientesPorId(tareas.map((t) => t.organizationId));
  return tareas.map((t) => ({
    responsableId: t.responsableId,
    vence: t.vence,
    contrato: tareaConServicio(t, clienteDe(t.organizationId)),
  }));
}
export type TareaAbierta = Awaited<ReturnType<typeof tareasAbiertas>>[number];
