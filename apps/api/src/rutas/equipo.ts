// El equipo de Proges: la lista para elegir responsables de un servicio, una tarea o una recepción,
// y la lista corta de clientes activos para los filtros y formularios.
//
// Es la libreta de teléfonos interna: solo la ve quien trabaja en Proges. Un dueño o una llave
// reciben 403 (no tienen por qué conocer a las personas del equipo ni sus correos).
import { createRoute } from "@hono/zod-openapi";
import { db, ORG_PROGES } from "@proges/db";
import { ClientesActivos, EquipoRespuesta } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { exigirEquipo } from "../permisos";
import { errores, json } from "./ayuda";

export const equipo = nuevoRouter();

equipo.openapi(
  createRoute({
    method: "get",
    path: "/equipo",
    tags: ["Equipo"],
    summary: "El equipo de Proges",
    description:
      "Las personas activas del equipo de Proges, ordenadas por nombre, con sus marcas de jefatura y administración. Sirve para elegir responsables. Solo para el equipo: un dueño o una llave reciben 403.",
    responses: { 200: json(EquipoRespuesta, "Las personas activas del equipo."), ...errores(401, 403) },
  }),
  async (c) => {
    exigirEquipo(c.get("quien"));
    const filas = await db.usuario.findMany({
      where: { organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, email: true, jefatura: true, admin: true },
    });
    return c.json({ items: filas.map((f) => ({ id: f.id, nombre: f.nombre, correo: f.email, jefatura: f.jefatura, admin: f.admin })) }, 200);
  },
);

// La lista completa de clientes (GET /v1/clientes) es de configuración y solo la ve el administrador.
// Esta es la versión corta, sin modo ni llaves ni usuarios: lo mínimo para elegir un cliente en un
// filtro o al crear una propiedad. La ve todo el equipo; un dueño o una llave, no.
equipo.openapi(
  createRoute({
    method: "get",
    path: "/clientes/activos",
    tags: ["Equipo"],
    summary: "Clientes activos (id y nombre)",
    description:
      "Los clientes activos, por nombre, solo con id y nombre. Sirve para elegir un cliente en un filtro o al crear una propiedad. Solo para el equipo: un dueño o una llave reciben 403.",
    responses: { 200: json(ClientesActivos, "Los clientes activos."), ...errores(401, 403) },
  }),
  async (c) => {
    exigirEquipo(c.get("quien"));
    const filas = await db.organizacion.findMany({
      where: { tipo: "CLIENTE", activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    });
    return c.json({ items: filas }, 200);
  },
);
