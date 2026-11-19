// El pedido de un cliente y su revisión por el equipo (d26, ADR 0013).
//
// Cuando un cliente pide un servicio, el portal abre solo el proyecto en su propiedad, marcado
// «por revisar», y deja una tarea para la jefatura: «Revisar y repartir». Es como dejar el
// pedido en el mesón: queda anotado en la pizarra del taller sin que nadie lo copie a mano.
//
// La lógica vive acá y no en las acciones por dos razones: (1) las acciones del servidor
// (`propiedades/solicitud-actions.ts`, `operacion/revisar-actions.ts`) quedan delgadas: validan
// el formulario, comprueban el permiso y llaman a estas funciones; (2) estas funciones no
// importan la sesión de Clerk, así que `npx tsx` las puede correr contra la base para probarlas.
//
// Regla: estas funciones NO comprueban permisos. Quien las llama ya decidió en qué espacio se
// escribe (`orgId`) con `src/lib/org.ts`, y nunca con algo que mande el navegador.
//
// Cada función hace todo en UNA transacción: o quedan todas las filas, o ninguna.

import { db } from "@/lib/db";
import { ORG_PROGES } from "@/lib/org";
import { familiasDelTipo } from "@/lib/servicios";
import type { PropertyType, ServicioTipo } from "@/generated/prisma/enums";

// La tarea que abre un pedido empieza siempre con este texto, pero ya no se la reconoce por el
// texto: se la marca con `esRevision` en la tabla (el texto lo puede editar o repetir cualquiera).
export const PREFIJO_REVISION = "Revisar y repartir";

// Si el mismo cliente manda el mismo pedido dos veces en este lapso (doble clic, conexión
// lenta), el segundo se rechaza en vez de abrir un segundo proyecto.
const VENTANA_REPETIDO_MS = 2 * 60 * 1000;

export type PropiedadNueva = {
  direccion: string;
  comuna: string;
  region: string;
  tipo: PropertyType;
};

export type PedidoDatos = {
  orgId: string; // el espacio del cliente que pide (de la sesión, nunca del formulario)
  usuarioId: string; // quién pide
  tipo: ServicioTipo;
  descripcion: string;
  // Exactamente uno de los dos: una propiedad que ya tiene, o los datos de una nueva.
  propertyId: string | null;
  propiedadNueva: PropiedadNueva | null;
};

type Falla = { ok: false; error: string; fieldErrors?: Record<string, string> };

export type PedidoResultado =
  | {
      ok: true;
      solicitudId: string;
      servicioEnCursoId: string;
      propertyId: string;
      tareaId: string;
      propiedadCreada: boolean;
    }
  | Falla;

// «Revisar y repartir: <lo pedido>», en una sola línea y sin pasar de ~140 caracteres.
export function textoTareaDeRevision(descripcion: string): string {
  const linea = descripcion.replace(/\s+/g, " ").trim();
  const corta = linea.length > 140 ? `${linea.slice(0, 139)}…` : linea;
  return `${PREFIJO_REVISION}: ${corta}`;
}

// ---------------------------------------------------------------------------
// Abrir el proyecto desde el pedido del cliente
// ---------------------------------------------------------------------------

export async function abrirPedido(datos: PedidoDatos): Promise<PedidoResultado> {
  const { orgId, usuarioId, tipo, descripcion, propertyId, propiedadNueva } = datos;
  if ((propertyId === null) === (propiedadNueva === null)) {
    return { ok: false, error: "Elige una propiedad o escribe los datos de una nueva." };
  }

  // El catálogo y las etapas son de Proges, comunes a todos los clientes: se leen de ORG_PROGES.
  // Se abre el primer servicio activo del tipo; la jefatura puede cambiarlo al revisar.
  const catalogo = await db.servicio.findFirst({
    where: { organizationId: ORG_PROGES, activo: true, familia: { in: familiasDelTipo(tipo) } },
    orderBy: [{ codigo: "asc" }, { nombre: "asc" }],
    select: { id: true },
  });
  if (!catalogo) {
    return { ok: false, error: "Proges todavía no ofrece ese tipo de servicio. Avísale al equipo." };
  }
  const etapa = await db.etapa.findFirst({
    where: { organizationId: ORG_PROGES, tipo, activa: true },
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true },
  });
  if (!etapa) {
    return { ok: false, error: "Ese tipo de servicio todavía no tiene etapas. Avísale al equipo." };
  }

  return db.$transaction(async (tx): Promise<PedidoResultado> => {
    let propiedadId: string;
    let propiedadCreada = false;

    if (propertyId !== null) {
      // La propiedad tiene que ser del cliente que pide.
      const propia = await tx.property.findFirst({
        where: { id: propertyId, organizationId: orgId },
        select: { id: true },
      });
      if (!propia) return { ok: false, error: "Propiedad no encontrada." };
      propiedadId = propia.id;

      const repetido = await tx.solicitud.findFirst({
        where: {
          organizationId: orgId,
          propertyId: propiedadId,
          tipo,
          descripcion,
          pedidaPorId: usuarioId,
          createdAt: { gte: new Date(Date.now() - VENTANA_REPETIDO_MS) },
        },
        select: { id: true },
      });
      if (repetido) return { ok: false, error: "Ya enviaste este pedido hace un momento." };
    } else if (propiedadNueva !== null) {
      // Si ya existe una propiedad igual, se pide que la elija: así un doble clic no deja dos
      // propiedades, y tampoco se duplica una que el cliente ya tenía.
      const igual = await tx.property.findFirst({
        where: {
          organizationId: orgId,
          direccion: { equals: propiedadNueva.direccion, mode: "insensitive" },
          comuna: { equals: propiedadNueva.comuna, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (igual) {
        return {
          ok: false,
          error: "Ya tienes una propiedad con esa dirección: elígela de la lista.",
          fieldErrors: { direccion: "Ya existe en tu cartera" },
        };
      }
      const creada = await tx.property.create({
        data: {
          organizationId: orgId,
          tipo: propiedadNueva.tipo,
          direccion: propiedadNueva.direccion,
          comuna: propiedadNueva.comuna,
          region: propiedadNueva.region,
          modificadoPorId: usuarioId,
        },
        select: { id: true },
      });
      propiedadId = creada.id;
      propiedadCreada = true;
    } else {
      return { ok: false, error: "Elige una propiedad o escribe los datos de una nueva." };
    }

    // El proyecto «por revisar», con su primer Evento (el historial parte con el pedido).
    const servicio = await tx.servicioEnCurso.create({
      data: {
        organizationId: orgId,
        propertyId: propiedadId,
        servicioId: catalogo.id,
        tipo,
        etapaId: etapa.id,
        porRevisar: true,
        eventos: {
          create: {
            organizationId: orgId,
            tipo: "ETAPA",
            etapaId: etapa.id,
            anterior: null,
            nuevo: etapa.nombre,
            motivo: "Pedido por el cliente",
            autorId: usuarioId,
          },
        },
      },
      select: { id: true },
    });

    const solicitud = await tx.solicitud.create({
      data: {
        organizationId: orgId,
        propertyId: propiedadId,
        tipo,
        descripcion,
        pedidaPorId: usuarioId,
        servicioEnCursoId: servicio.id,
      },
      select: { id: true },
    });

    // La tarea para la jefatura: sin responsable, porque «repartir» es justo decidir quién.
    const tarea = await tx.tarea.create({
      data: {
        organizationId: orgId,
        servicioEnCursoId: servicio.id,
        que: textoTareaDeRevision(descripcion),
        esRevision: true,
        creadaPorId: usuarioId,
      },
      select: { id: true },
    });

    return {
      ok: true,
      solicitudId: solicitud.id,
      servicioEnCursoId: servicio.id,
      propertyId: propiedadId,
      tareaId: tarea.id,
      propiedadCreada,
    };
  });
}

// ---------------------------------------------------------------------------
// Revisar el proyecto: aceptarlo (con servicio y responsable) o rechazarlo
// ---------------------------------------------------------------------------

type RevisionResultado = { ok: true; propertyId: string } | Falla;

const YA_REVISADO = "Otra persona ya lo revisó.";

// Acepta un proyecto «por revisar»: fija el servicio del catálogo y el responsable, la
// Solicitud queda ACEPTADA y la tarea «Revisar y repartir» queda hecha. Se «reclama» el
// proyecto primero con un updateMany que solo funciona si sigue por revisar: si dos personas
// lo revisan a la vez, la segunda recibe «Otra persona ya lo revisó» (como la ventanilla con
// número: el segundo ve que ya lo atendieron).
export async function aceptarRevision(datos: {
  orgId: string; // el espacio del proyecto (ya comprobado por quien llama)
  servicioEnCursoId: string;
  servicioCatalogoId: string;
  responsableId: string | null;
  nota: string | null;
  usuarioId: string;
}): Promise<RevisionResultado> {
  const { orgId, servicioEnCursoId, servicioCatalogoId, responsableId, nota, usuarioId } = datos;

  const proyecto = await db.servicioEnCurso.findFirst({
    where: { id: servicioEnCursoId, organizationId: orgId },
    select: { tipo: true, propertyId: true, porRevisar: true, estado: true },
  });
  if (!proyecto) return { ok: false, error: "El proyecto no existe." };
  if (!proyecto.porRevisar || proyecto.estado !== "ABIERTO") return { ok: false, error: YA_REVISADO };

  const catalogo = await db.servicio.findFirst({
    where: { id: servicioCatalogoId, organizationId: ORG_PROGES, activo: true },
    select: { familia: true },
  });
  if (!catalogo) {
    return {
      ok: false,
      error: "El servicio elegido no existe en el catálogo.",
      fieldErrors: { servicioId: "No existe en el catálogo" },
    };
  }
  if (!familiasDelTipo(proyecto.tipo).includes(catalogo.familia)) {
    return {
      ok: false,
      error: "Ese servicio del catálogo no corresponde al tipo pedido.",
      fieldErrors: { servicioId: "No corresponde al tipo" },
    };
  }

  if (responsableId !== null) {
    const responsable = await db.usuario.findFirst({
      where: { id: responsableId, organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
      select: { id: true },
    });
    if (!responsable) {
      return {
        ok: false,
        error: "El responsable no es del equipo.",
        fieldErrors: { responsableId: "El responsable no es del equipo." },
      };
    }
  }

  const ahora = new Date();
  const hecho = await db.$transaction(async (tx) => {
    const { count } = await tx.servicioEnCurso.updateMany({
      where: { id: servicioEnCursoId, organizationId: orgId, porRevisar: true, estado: "ABIERTO" },
      data: {
        porRevisar: false,
        servicioId: servicioCatalogoId,
        responsableId,
        ...(nota !== null ? { nota } : {}),
      },
    });
    if (count !== 1) return false;
    await tx.solicitud.updateMany({
      where: { servicioEnCursoId, estado: "NUEVA" },
      data: { estado: "ACEPTADA", resueltaPorId: usuarioId, resueltaEl: ahora },
    });
    await tx.tarea.updateMany({
      where: { servicioEnCursoId, hechaEl: null, esRevision: true },
      data: { hechaEl: ahora, hechaPorId: usuarioId },
    });
    return true;
  });
  if (!hecho) return { ok: false, error: YA_REVISADO };
  return { ok: true, propertyId: proyecto.propertyId };
}

// Rechaza un proyecto «por revisar»: queda CANCELADO con el motivo (el cliente lo ve en su
// pedido), la Solicitud RECHAZADA y la tarea hecha.
export async function rechazarRevision(datos: {
  orgId: string;
  servicioEnCursoId: string;
  motivo: string;
  usuarioId: string;
}): Promise<RevisionResultado> {
  const { orgId, servicioEnCursoId, motivo, usuarioId } = datos;

  const proyecto = await db.servicioEnCurso.findFirst({
    where: { id: servicioEnCursoId, organizationId: orgId },
    select: { propertyId: true },
  });
  if (!proyecto) return { ok: false, error: "El proyecto no existe." };

  const ahora = new Date();
  const hecho = await db.$transaction(async (tx) => {
    const { count } = await tx.servicioEnCurso.updateMany({
      where: { id: servicioEnCursoId, organizationId: orgId, porRevisar: true, estado: "ABIERTO" },
      data: { porRevisar: false, estado: "CANCELADO", motivoCierre: motivo, cerradoEl: ahora },
    });
    if (count !== 1) return false;
    await tx.solicitud.updateMany({
      where: { servicioEnCursoId, estado: "NUEVA" },
      data: { estado: "RECHAZADA", motivoRechazo: motivo, resueltaPorId: usuarioId, resueltaEl: ahora },
    });
    await tx.tarea.updateMany({
      where: { servicioEnCursoId, hechaEl: null, esRevision: true },
      data: { hechaEl: ahora, hechaPorId: usuarioId },
    });
    return true;
  });
  if (!hecho) return { ok: false, error: YA_REVISADO };
  return { ok: true, propertyId: proyecto.propertyId };
}
