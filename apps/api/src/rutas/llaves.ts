// Rutas de las llaves de la API (listar, crear, revocar). Las escribe la pieza H. Solo el
// administrador.
//
// Una llave es de un cliente y solo lee. La llave completa se muestra UNA vez, al crearla: en
// la base queda solo su prefijo (para reconocerla a la vista) y su huella (para reconocerla
// cuando llega). Revocar no borra: la fila queda de registro y la llave deja de servir al instante.
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { Id, LlaveConfig, LlaveCreada, LlaveNueva, LlavesConsulta, LlavesLista } from "@proges/contrato";
import { generarLlave } from "../acceso/llaves";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { espacioParaCrear, exigirAdmin, exigirEscritura } from "../permisos";
import { llaveParaConfig } from "../dominio/config/recorte";
import { errores, json } from "./ayuda";

export const llaves = nuevoRouter();

async function nombreDelCliente(id: string): Promise<string> {
  const cliente = await db.organizacion.findUniqueOrThrow({ where: { id }, select: { nombre: true } });
  return cliente.nombre;
}

llaves.openapi(
  createRoute({
    method: "get",
    path: "/llaves",
    tags: ["Llaves de la API"],
    summary: "Lista de llaves",
    description:
      "Las llaves de la API de todos los clientes, también de los desactivados (para poder revocarlas), las más nuevas primero, con su prefijo, su último uso y si fueron revocadas. Nunca incluye la llave completa. Con `cliente` se ven solo las de ese cliente. Solo el administrador.",
    request: { query: LlavesConsulta },
    responses: { 200: json(LlavesLista, "Las llaves."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirAdmin(quien);
    const { cliente } = c.req.valid("query");
    // Sin filtrar por clientes activos: las llaves de un cliente desactivado se tienen que poder
    // ver y revocar (si el cliente se reactiva, una llave filtrada volvería a servir).
    const filas = await db.llaveApi.findMany({
      where: cliente ? { organizationId: cliente } : {},
      orderBy: { createdAt: "desc" },
    });
    const clientes = await db.organizacion.findMany({
      where: { id: { in: [...new Set(filas.map((l) => l.organizationId))] } },
      select: { id: true, nombre: true },
    });
    const nombres = new Map(clientes.map((cl) => [cl.id, cl.nombre]));
    return c.json({ items: filas.map((l) => llaveParaConfig(l, nombres.get(l.organizationId) ?? "")) }, 200);
  },
);

llaves.openapi(
  createRoute({
    method: "post",
    path: "/llaves",
    tags: ["Llaves de la API"],
    summary: "Crear una llave",
    description:
      "Crea una llave de solo lectura para el sistema de un cliente. La respuesta trae la llave completa en `llave`: es la única vez que se ve, así que hay que copiarla y entregarla por un canal seguro. Solo el administrador.",
    request: {
      body: { content: { "application/json": { schema: LlaveNueva } }, required: true },
    },
    responses: { 201: json(LlaveCreada, "La llave creada, con la llave completa."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const admin = exigirAdmin(exigirEscritura(quien));
    const { clienteId, nombre } = c.req.valid("json");
    // El cliente tiene que ser uno activo: nunca se crea una llave en el espacio de Proges.
    const espacio = await espacioParaCrear(quien, clienteId);
    const nueva = generarLlave();
    const registro = await db.llaveApi.create({
      data: { organizationId: espacio, nombre, prefijo: nueva.prefijo, huella: nueva.huella, creadaPorId: admin.usuario.id },
    });
    return c.json({ ...llaveParaConfig(registro, await nombreDelCliente(espacio)), llave: nueva.llave }, 201);
  },
);

llaves.openapi(
  createRoute({
    method: "delete",
    path: "/llaves/{id}",
    tags: ["Llaves de la API"],
    summary: "Revocar una llave",
    description:
      "La llave deja de servir al instante. No se borra: queda en la lista como revocada, de registro. Revocar una ya revocada responde 409. Solo el administrador.",
    request: { params: z.object({ id: Id }) },
    responses: { 200: json(LlaveConfig, "La llave, ya revocada."), ...errores(401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirAdmin(exigirEscritura(quien));
    const { id } = c.req.valid("param");
    // Solo el administrador llega aquí, y puede revocar también las llaves de un cliente
    // desactivado (espacioParaEscribirEn respondería 404 para ellos).
    const llave = await db.llaveApi.findUnique({ where: { id } });
    if (!llave) throw new ErrorApi(404, "No se encontró lo que buscas.");
    if (llave.revocadaEl) throw new ErrorApi(409, "Esa llave ya estaba revocada.");
    const revocada = await db.llaveApi.update({ where: { id }, data: { revocadaEl: new Date() } });
    return c.json(llaveParaConfig(revocada, await nombreDelCliente(llave.organizationId)), 200);
  },
);
