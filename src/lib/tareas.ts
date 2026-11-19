// Las tareas del equipo: las consultas y la regla que las agrupa por urgencia.
//
// Una tarea es lo mínimo (ADR 0013): qué hay que hacer, quién, para cuándo, y si ya está hecha.
// Es la pizarra del taller: sin estados intermedios ni dependencias entre tareas.
//
// Las consultas reciben los espacios (`orgIds`) que quien llama ya sacó de `espaciosQueLee()`:
// así un cliente nunca recibe una tarea de otro, y el equipo ve las de todos sus clientes.
// `agruparTareas` es una función pura (recibe «hoy» como parámetro) para poder probarla sin base.

import type { Prisma } from "@/generated/prisma/client";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { diasHasta } from "@/lib/fechas";

// «Esta semana» son los próximos 7 días contando hoy: la misma ventana que usa la agenda
// de pendientes (`src/lib/agenda.ts`), para que las dos pantallas hablen igual.
export const DIAS_SEMANA = 7;

// Lo que lleva cada fila de tarea: ella, su responsable y el proyecto y propiedad donde vive
// (con eso se arma el enlace). Una sola selección para que todas las pantallas reciban lo mismo.
const seleccionTarea = {
  id: true,
  organizationId: true,
  que: true,
  vence: true,
  hechaEl: true,
  partidaId: true,
  createdAt: true,
  responsable: { select: { id: true, nombre: true } },
  hechaPor: { select: { nombre: true } },
  servicioEnCurso: {
    select: {
      id: true,
      tipo: true,
      estado: true,
      servicio: { select: { nombre: true } },
      property: { select: { id: true, direccion: true, comuna: true } },
    },
  },
} satisfies Prisma.TareaSelect;

export type TareaConProyecto = Prisma.TareaGetPayload<{ select: typeof seleccionTarea }>;

// ---------------------------------------------------------------------------
// Regla pura: agrupar por urgencia
// ---------------------------------------------------------------------------

export type TareasAgrupadas<T> = {
  atrasadas: T[]; // venció antes de hoy
  estaSemana: T[]; // vence de hoy a 7 días
  despues: T[]; // vence más adelante, o no tiene fecha
};

// Ordena por fecha de vencimiento (las que no tienen fecha, al final).
function porVencimiento(a: { vence: Date | null }, b: { vence: Date | null }): number {
  if (a.vence && b.vence) return a.vence.getTime() - b.vence.getTime();
  if (a.vence) return -1;
  if (b.vence) return 1;
  return 0;
}

// Reparte tareas abiertas en atrasadas, de esta semana y para después. `hoy` es `hoyChile()`.
// Una tarea sin fecha no puede estar atrasada: va a «después».
export function agruparTareas<T extends { vence: Date | null }>(
  tareas: T[],
  hoy: Date,
): TareasAgrupadas<T> {
  const grupos: TareasAgrupadas<T> = { atrasadas: [], estaSemana: [], despues: [] };
  for (const t of [...tareas].sort(porVencimiento)) {
    if (!t.vence) grupos.despues.push(t);
    else {
      const dias = diasHasta(t.vence, hoy);
      if (dias < 0) grupos.atrasadas.push(t);
      else if (dias <= DIAS_SEMANA) grupos.estaSemana.push(t);
      else grupos.despues.push(t);
    }
  }
  return grupos;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

// Las tareas de un proyecto: las abiertas (ordenadas por fecha) y las hechas (las más
// recientes primero). Quien llama ya comprobó que puede leer el proyecto.
export async function tareasDelProyecto(servicioEnCursoId: string, orgIds: string[]) {
  const tareas = await db.tarea.findMany({
    where: { servicioEnCursoId, organizationId: { in: orgIds } },
    select: seleccionTarea,
  });
  const abiertas = tareas.filter((t) => !t.hechaEl).sort(porVencimiento);
  const hechas = tareas
    .filter((t) => t.hechaEl)
    .sort((a, b) => (b.hechaEl?.getTime() ?? 0) - (a.hechaEl?.getTime() ?? 0));
  return { abiertas, hechas };
}

// Las tareas abiertas de los espacios dados. `responsableId`: un id = las de esa persona;
// null = las que no tiene nadie; sin indicar = todas. `tipo` limita a un tipo de proyecto.
export async function tareasAbiertas(
  orgIds: string[],
  filtro: { responsableId?: string | null; tipo?: ServicioTipo | null } = {},
): Promise<TareaConProyecto[]> {
  return db.tarea.findMany({
    where: {
      organizationId: { in: orgIds },
      hechaEl: null,
      ...(filtro.responsableId !== undefined ? { responsableId: filtro.responsableId } : {}),
      // Una tarea de un proyecto ya cancelado o terminado no es trabajo pendiente.
      servicioEnCurso: { estado: "ABIERTO", ...(filtro.tipo ? { tipo: filtro.tipo } : {}) },
    },
    select: seleccionTarea,
  });
}

// Lo que una persona terminó en los últimos 7 días (de más reciente a más antigua).
export async function tareasHechasDe(
  responsableId: string,
  orgIds: string[],
  ahora: Date = new Date(),
): Promise<TareaConProyecto[]> {
  const desde = new Date(ahora.getTime() - DIAS_SEMANA * 86_400_000);
  return db.tarea.findMany({
    where: { organizationId: { in: orgIds }, responsableId, hechaEl: { gte: desde } },
    orderBy: { hechaEl: "desc" },
    select: seleccionTarea,
  });
}
