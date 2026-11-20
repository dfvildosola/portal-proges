// El pedido de un cliente y su revisión por el equipo (d26, ADR 0013).
//
// Cuando un cliente pide un servicio, la API abre sola el servicio en su propiedad, marcado
// «por revisar», y deja una tarea para la jefatura: «Revisar y repartir». Es como dejar el pedido
// en el mesón: queda anotado en la pizarra del taller sin que nadie lo copie a mano.
//
// Estas funciones NO comprueban permisos: quien las llama (rutas/pedidos.ts) ya decidió en qué
// espacio se escribe, a partir de quién es la persona y nunca de algo que mande la web.
//
// Cada una hace todo en UNA transacción: o quedan todas las filas, o ninguna.
import { db, ORG_PROGES, type PropertyType, type ServicioTipo } from "@proges/db";
import { ErrorApi } from "../../errores";
import { familiasDelTipo } from "./servicios";

// La tarea que abre un pedido empieza con este texto, pero ya no se la reconoce por el texto
// (cualquiera puede escribir uno igual a mano): se la marca con `esRevision` en la tabla.
export const PREFIJO_REVISION = "Revisar y repartir";

// Si la misma persona manda el mismo pedido dos veces dentro de este lapso (doble clic, conexión
// lenta), el segundo se rechaza en vez de abrir un segundo servicio.
export const VENTANA_REPETIDO_MS = 2 * 60 * 1000;

export type PropiedadNueva = { direccion: string; comuna: string; region?: string; tipo: PropertyType };

export type PedidoDatos = {
  orgId: string; // el espacio del cliente que pide (de su sesión, nunca del cuerpo de la petición)
  usuarioId: string; // quién pide
  tipo: ServicioTipo;
  descripcion: string;
  // Exactamente uno de los dos: una propiedad que ya tiene, o los datos de una nueva.
  propertyId: string | null;
  propiedadNueva: PropiedadNueva | null;
  ahora?: Date; // para probar el lapso de «repetido» sin esperar
};

export type PedidoAbierto = {
  solicitudId: string;
  servicioEnCursoId: string;
  tareaId: string;
  propiedad: { id: string; direccion: string; comuna: string };
  propiedadCreada: boolean;
};

// «Revisar y repartir: <lo pedido>», en una sola línea y sin pasar de ~140 caracteres.
export function textoTareaDeRevision(descripcion: string): string {
  const linea = descripcion.replace(/\s+/g, " ").trim();
  const corta = linea.length > 140 ? `${linea.slice(0, 139)}…` : linea;
  return `${PREFIJO_REVISION}: ${corta}`;
}

// ---------------------------------------------------------------------------
// Abrir el servicio desde el pedido del cliente
// ---------------------------------------------------------------------------

export async function abrirPedido(datos: PedidoDatos): Promise<PedidoAbierto> {
  const { orgId, usuarioId, tipo, descripcion, propertyId, propiedadNueva } = datos;
  if ((propertyId === null) === (propiedadNueva === null)) {
    throw new ErrorApi(400, "Elige una propiedad o escribe los datos de una nueva.");
  }

  // El catálogo es de Proges, común a todos los clientes: se lee de ORG_PROGES. Se abre el primer
  // servicio activo del tipo; la jefatura puede cambiarlo al revisar.
  const catalogo = await db.servicio.findFirst({
    where: { organizationId: ORG_PROGES, activo: true, familia: { in: familiasDelTipo(tipo) } },
    orderBy: [{ codigo: "asc" }, { nombre: "asc" }],
    select: { id: true },
  });
  if (!catalogo) {
    throw new ErrorApi(409, "Proges todavía no ofrece ese tipo de servicio. Avísale al equipo.");
  }

  return db.$transaction(async (tx) => {
    // Candado: dos envíos iguales a la vez hacen fila. Sin esto, los dos mirarían «¿ya hay uno?»
    // antes de que cualquiera escriba, y los dos pasarían. El candado se suelta solo al terminar.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pedido:${orgId}:${usuarioId}`}))`;

    let propiedad: { id: string; direccion: string; comuna: string };
    let propiedadCreada = false;

    if (propertyId !== null) {
      // La propiedad tiene que ser del cliente que pide.
      const propia = await tx.property.findFirst({
        where: { id: propertyId, organizationId: orgId },
        select: { id: true, direccion: true, comuna: true },
      });
      if (!propia) throw new ErrorApi(404, "No se encontró la propiedad.");
      propiedad = propia;

      const repetido = await tx.solicitud.findFirst({
        where: {
          organizationId: orgId,
          propertyId: propia.id,
          tipo,
          descripcion,
          pedidaPorId: usuarioId,
          createdAt: { gte: new Date((datos.ahora ?? new Date()).getTime() - VENTANA_REPETIDO_MS) },
        },
        select: { id: true },
      });
      if (repetido) throw new ErrorApi(409, "Ya enviaste este pedido hace un momento.");
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
        throw new ErrorApi(409, "Ya tienes una propiedad con esa dirección: elígela de la lista.", {
          direccion: "Ya existe en tu cartera.",
        });
      }
      propiedad = await tx.property.create({
        data: {
          organizationId: orgId,
          tipo: propiedadNueva.tipo,
          direccion: propiedadNueva.direccion,
          comuna: propiedadNueva.comuna,
          region: propiedadNueva.region?.trim() || "Por confirmar",
          modificadoPorId: usuarioId,
        },
        select: { id: true, direccion: true, comuna: true },
      });
      propiedadCreada = true;
    } else {
      throw new ErrorApi(400, "Elige una propiedad o escribe los datos de una nueva.");
    }

    // El servicio «por revisar»: nadie lo lleva todavía y no se espera a nadie.
    const servicio = await tx.servicioEnCurso.create({
      data: { organizationId: orgId, propertyId: propiedad.id, servicioId: catalogo.id, tipo, porRevisar: true },
      select: { id: true },
    });

    const solicitud = await tx.solicitud.create({
      data: {
        organizationId: orgId,
        propertyId: propiedad.id,
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
      solicitudId: solicitud.id,
      servicioEnCursoId: servicio.id,
      tareaId: tarea.id,
      propiedad,
      propiedadCreada,
    };
  });
}

// ---------------------------------------------------------------------------
// Revisar el servicio: aceptarlo (con servicio del catálogo y responsable) o rechazarlo
// ---------------------------------------------------------------------------

const YA_REVISADO = "Otra persona ya lo revisó.";

// Un responsable tiene que ser del equipo activo de Proges (o ninguno). El equipo vive en
// ORG_PROGES, no en el espacio del cliente.
export async function exigirResponsableValido(responsableId: string | null | undefined): Promise<void> {
  if (!responsableId) return;
  const r = await db.usuario.findFirst({
    where: { id: responsableId, organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
    select: { id: true },
  });
  if (!r) {
    throw new ErrorApi(400, "El responsable no es del equipo.", { responsableId: "El responsable no es del equipo." });
  }
}

// Acepta un servicio «por revisar»: fija el servicio del catálogo y el responsable, la Solicitud
// queda ACEPTADA y la tarea «Revisar y repartir» queda hecha. El servicio se «reclama» primero
// con un updateMany que solo funciona si sigue por revisar: si dos personas lo revisan a la vez,
// la segunda recibe «Otra persona ya lo revisó» (como la ventanilla con número).
export async function aceptarRevision(datos: {
  orgId: string; // el espacio del servicio (ya comprobado por quien llama)
  servicioEnCursoId: string;
  servicioCatalogoId: string;
  responsableId: string | null;
  nota: string | null;
  usuarioId: string;
}): Promise<void> {
  const { orgId, servicioEnCursoId, servicioCatalogoId, responsableId, nota, usuarioId } = datos;

  const servicio = await db.servicioEnCurso.findFirst({
    where: { id: servicioEnCursoId, organizationId: orgId },
    select: { tipo: true, porRevisar: true, estado: true },
  });
  if (!servicio) throw new ErrorApi(404, "No se encontró lo que buscas.");
  if (!servicio.porRevisar || servicio.estado !== "ABIERTO") throw new ErrorApi(409, YA_REVISADO);

  const catalogo = await db.servicio.findFirst({
    where: { id: servicioCatalogoId, organizationId: ORG_PROGES, activo: true },
    select: { familia: true },
  });
  if (!catalogo) {
    throw new ErrorApi(400, "El servicio elegido no existe en el catálogo.", { servicioId: "No existe en el catálogo." });
  }
  if (!familiasDelTipo(servicio.tipo).includes(catalogo.familia)) {
    throw new ErrorApi(400, "Ese servicio del catálogo no corresponde al tipo pedido.", {
      servicioId: "No corresponde al tipo.",
    });
  }
  await exigirResponsableValido(responsableId);

  const ahora = new Date();
  const hecho = await db.$transaction(async (tx) => {
    const { count } = await tx.servicioEnCurso.updateMany({
      where: { id: servicioEnCursoId, organizationId: orgId, porRevisar: true, estado: "ABIERTO" },
      data: { porRevisar: false, servicioId: servicioCatalogoId, responsableId, ...(nota !== null ? { nota } : {}) },
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
  if (!hecho) throw new ErrorApi(409, YA_REVISADO);
}

// Rechaza un servicio «por revisar»: queda CANCELADO con el motivo (quien pidió lo ve en su
// pedido), la Solicitud RECHAZADA y la tarea hecha.
export async function rechazarRevision(datos: {
  orgId: string;
  servicioEnCursoId: string;
  motivo: string;
  usuarioId: string;
}): Promise<void> {
  const { orgId, servicioEnCursoId, motivo, usuarioId } = datos;
  const existe = await db.servicioEnCurso.findFirst({
    where: { id: servicioEnCursoId, organizationId: orgId },
    select: { id: true },
  });
  if (!existe) throw new ErrorApi(404, "No se encontró lo que buscas.");

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
  if (!hecho) throw new ErrorApi(409, YA_REVISADO);
}
