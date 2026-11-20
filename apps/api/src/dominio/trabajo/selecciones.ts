// Qué columnas se piden a la base en cada consulta de trabajo (servicios, tareas, notas).
//
// Cada consulta pide por nombre lo que necesita, nunca «todo»: si alguien agrega una columna
// nueva a la tabla, no llega sola a ninguna respuesta. El recorte (recorte.ts) arma después cada
// respuesta campo por campo a partir de estas selecciones.
import type { Prisma } from "@proges/db";

const persona = { select: { id: true, nombre: true } } as const;
const propiedad = { select: { id: true, direccion: true, comuna: true } } as const;

// Un servicio en una lista o en el tablero.
export const seleccionFila = {
  id: true,
  organizationId: true,
  tipo: true,
  estado: true,
  porRevisar: true,
  porConfirmar: true,
  abiertoEl: true,
  cerradoEl: true,
  esperandoA: true,
  esperandoDetalle: true,
  esperandoDesde: true,
  servicio: { select: { nombre: true } },
  property: propiedad,
  responsable: persona,
} satisfies Prisma.ServicioEnCursoSelect;
export type FilaDeServicio = Prisma.ServicioEnCursoGetPayload<{ select: typeof seleccionFila }>;

export const seleccionNota = {
  id: true,
  organizationId: true,
  texto: true,
  paraDueno: true,
  tareaId: true,
  createdAt: true,
  autor: persona,
  fotos: { orderBy: { createdAt: "asc" }, select: { id: true, nombre: true } },
} satisfies Prisma.NotaSelect;
export type NotaDeBase = Prisma.NotaGetPayload<{ select: typeof seleccionNota }>;

export const seleccionTarea = {
  id: true,
  organizationId: true,
  servicioEnCursoId: true,
  que: true,
  vence: true,
  hechaEl: true,
  esRevision: true,
  createdAt: true,
  responsable: persona,
  hechaPor: persona,
} satisfies Prisma.TareaSelect;
export type TareaDeBase = Prisma.TareaGetPayload<{ select: typeof seleccionTarea }>;

// Una tarea con el servicio y la propiedad donde vive (Hoy, Repartir, Inicio).
export const seleccionTareaConServicio = {
  ...seleccionTarea,
  responsableId: true,
  servicioEnCurso: {
    select: {
      id: true,
      tipo: true,
      servicio: { select: { nombre: true } },
      property: propiedad,
    },
  },
} satisfies Prisma.TareaSelect;
export type TareaConServicioDeBase = Prisma.TareaGetPayload<{ select: typeof seleccionTareaConServicio }>;

// La ficha del equipo: todo el servicio, con su bitácora completa, sus tareas y su historial de espera.
export const seleccionFichaEquipo = {
  ...seleccionFila,
  nota: true,
  motivoCierre: true,
  eventos: {
    where: { tipo: "ESPERA" },
    orderBy: { fecha: "desc" },
    select: { id: true, fecha: true, anterior: true, nuevo: true, motivo: true, autor: persona },
  },
  tareas: { select: seleccionTarea },
  notas: { orderBy: { createdAt: "desc" }, select: seleccionNota },
} satisfies Prisma.ServicioEnCursoSelect;
export type FichaEquipoDeBase = Prisma.ServicioEnCursoGetPayload<{ select: typeof seleccionFichaEquipo }>;

// La ficha del dueño: las notas se filtran en la consulta misma (solo las marcadas), y no se
// piden tareas ni historial.
export const seleccionFichaDueno = {
  ...seleccionFila,
  notas: { where: { paraDueno: true }, orderBy: { createdAt: "desc" }, select: seleccionNota },
} satisfies Prisma.ServicioEnCursoSelect;
export type FichaDuenoDeBase = Prisma.ServicioEnCursoGetPayload<{ select: typeof seleccionFichaDueno }>;

export const seleccionPedido = {
  id: true,
  organizationId: true,
  estado: true,
  tipo: true,
  descripcion: true,
  motivoRechazo: true,
  servicioEnCursoId: true,
  createdAt: true,
  property: propiedad,
  pedidaPor: persona,
} satisfies Prisma.SolicitudSelect;
export type PedidoDeBase = Prisma.SolicitudGetPayload<{ select: typeof seleccionPedido }>;
