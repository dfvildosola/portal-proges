// Rutas de pedidos: un cliente pide un servicio y el equipo lo revisa. Las escribe la pieza D.
//
// Pedir es del dueño (cliente grande o dueño autónomo), en su propia cartera; el equipo abre
// servicios a mano con POST /v1/servicios. Una llave de la API no pide: solo lee. La regla de
// negocio (d26) vive en dominio/trabajo/pedidos.ts.
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import {
  Id,
  PedidoAceptar,
  PedidoCreado,
  PedidoEquipo,
  PedidoNuevo,
  PedidoRechazar,
  Pedidos,
  PedidosConsulta,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { esDueno, espacioParaEscribirEn, espaciosQueLee, exigirCliente, exigirEquipo } from "../permisos";
import { clientesPorId } from "../dominio/trabajo/consultas";
import { abrirPedido, aceptarRevision, rechazarRevision } from "../dominio/trabajo/pedidos";
import { pedidoParaDueno, pedidoParaEquipo } from "../dominio/trabajo/recorte";
import { seleccionPedido } from "../dominio/trabajo/selecciones";
import { errores, json } from "./ayuda";

export const pedidos = nuevoRouter();

const ParamId = z.object({ id: Id });

// ---------------------------------------------------------------------------
// Pedir
// ---------------------------------------------------------------------------

pedidos.openapi(
  createRoute({
    method: "post",
    path: "/pedidos",
    tags: ["Pedidos"],
    summary: "Pedir un servicio",
    description:
      "Lo hace el dueño (cliente grande o autónomo), en su propia cartera. Crea el pedido, abre el servicio «por revisar» y deja una tarea «Revisar y repartir» para la jefatura, todo junto o nada. Puede pedir para una propiedad que ya tiene (propiedadId) o para una nueva (propiedadNueva), que se crea en su cartera. Enviar el mismo pedido dos veces seguidas responde 409 y no abre un segundo servicio. No lleva precio: se cotiza después.",
    request: { body: { content: { "application/json": { schema: PedidoNuevo } }, required: true } },
    responses: { 201: json(PedidoCreado, "El pedido, el servicio y la tarea."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    // El espacio sale de la sesión del dueño, nunca del cuerpo de la petición.
    const cliente = exigirCliente(c.get("quien"));
    const datos = c.req.valid("json");
    const abierto = await abrirPedido({
      orgId: cliente.clienteId,
      usuarioId: cliente.usuario.id,
      tipo: datos.tipo,
      descripcion: datos.descripcion,
      propertyId: datos.propiedadId ?? null,
      propiedadNueva: datos.propiedadNueva ?? null,
    });
    return c.json(
      {
        pedidoId: abierto.solicitudId,
        servicioId: abierto.servicioEnCursoId,
        tareaId: abierto.tareaId,
        propiedad: abierto.propiedad,
        propiedadCreada: abierto.propiedadCreada,
      },
      201,
    );
  },
);

// ---------------------------------------------------------------------------
// La bandeja
// ---------------------------------------------------------------------------

pedidos.openapi(
  createRoute({
    method: "get",
    path: "/pedidos",
    tags: ["Pedidos"],
    summary: "La bandeja de pedidos, o mis pedidos",
    description:
      "Para el equipo, la bandeja: por defecto solo los NUEVA, los más antiguos primero (los que llevan más esperando). Para un dueño o una llave, sus propios pedidos de todos los estados, los más nuevos primero, con el motivo si se rechazó.",
    request: { query: PedidosConsulta },
    responses: { 200: json(Pedidos, "Los pedidos."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const orgIds = await espaciosQueLee(quien, q.cliente);

    if (esDueno(quien)) {
      const filas = await db.solicitud.findMany({
        where: { organizationId: { in: orgIds }, ...(q.estado ? { estado: q.estado } : {}) },
        orderBy: { createdAt: "desc" },
        select: seleccionPedido,
      });
      return c.json({ items: filas.map(pedidoParaDueno) }, 200);
    }
    const filas = await db.solicitud.findMany({
      where: { organizationId: { in: orgIds }, estado: q.estado ?? "NUEVA" },
      orderBy: { createdAt: "asc" },
      select: seleccionPedido,
    });
    const clienteDe = await clientesPorId(filas.map((f) => f.organizationId));
    return c.json({ items: filas.map((p) => pedidoParaEquipo(p, clienteDe(p.organizationId))) }, 200);
  },
);

// ---------------------------------------------------------------------------
// Aceptar y rechazar
// ---------------------------------------------------------------------------

// El pedido de la bandeja, con el permiso de escritura ya comprobado: solo el equipo, y en el
// espacio del pedido (no en uno que mande la web). Un pedido ya revisado responde 409.
async function pedidoPorRevisar(quien: Parameters<typeof exigirEquipo>[0], id: string) {
  exigirEquipo(quien);
  const pedido = await db.solicitud.findUnique({
    where: { id },
    select: { organizationId: true, estado: true, servicioEnCursoId: true },
  });
  const orgId = await espacioParaEscribirEn(quien, pedido?.organizationId);
  if (!pedido?.servicioEnCursoId || pedido.estado !== "NUEVA") throw new ErrorApi(409, "Otra persona ya lo revisó.");
  return { orgId, servicioEnCursoId: pedido.servicioEnCursoId };
}

async function pedidoDeEquipo(id: string) {
  const p = await db.solicitud.findUniqueOrThrow({ where: { id }, select: seleccionPedido });
  const clienteDe = await clientesPorId([p.organizationId]);
  return pedidoParaEquipo(p, clienteDe(p.organizationId));
}

pedidos.openapi(
  createRoute({
    method: "post",
    path: "/pedidos/{id}/aceptar",
    tags: ["Pedidos"],
    summary: "Aceptar un pedido",
    description:
      "Solo el equipo. Elige el servicio del catálogo (de una familia que ese tipo ofrece) y quién lo lleva. El servicio deja de estar «por revisar», el pedido queda ACEPTADA y la tarea «Revisar y repartir» queda hecha. Si otra persona ya lo revisó, responde 409.",
    request: { params: ParamId, body: { content: { "application/json": { schema: PedidoAceptar } }, required: true } },
    responses: { 200: json(PedidoEquipo, "El pedido ya aceptado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    const { orgId, servicioEnCursoId } = await pedidoPorRevisar(quien, id);
    await aceptarRevision({
      orgId,
      servicioEnCursoId,
      servicioCatalogoId: datos.servicioId,
      responsableId: datos.responsableId ?? null,
      nota: datos.nota ? datos.nota : null,
      usuarioId: exigirEquipo(quien).usuario.id,
    });
    return c.json(await pedidoDeEquipo(id), 200);
  },
);

pedidos.openapi(
  createRoute({
    method: "post",
    path: "/pedidos/{id}/rechazar",
    tags: ["Pedidos"],
    summary: "Rechazar un pedido",
    description:
      "Solo el equipo. El motivo es obligatorio: quien pidió lo ve en su pedido. El servicio queda CANCELADO, el pedido RECHAZADA y la tarea «Revisar y repartir» queda hecha.",
    request: { params: ParamId, body: { content: { "application/json": { schema: PedidoRechazar } }, required: true } },
    responses: { 200: json(PedidoEquipo, "El pedido ya rechazado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { id } = c.req.valid("param");
    const { motivo } = c.req.valid("json");
    const { orgId, servicioEnCursoId } = await pedidoPorRevisar(quien, id);
    await rechazarRevision({ orgId, servicioEnCursoId, motivo, usuarioId: exigirEquipo(quien).usuario.id });
    return c.json(await pedidoDeEquipo(id), 200);
  },
);
