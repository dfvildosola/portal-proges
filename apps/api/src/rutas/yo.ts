// GET /v1/yo: quién está consultando y qué puede hacer. La web lo pide al entrar para decidir
// qué menú y qué inicio mostrar (equipo, jefatura, dueño atendido o autónomo); un sistema externo
// lo usa para comprobar que su llave funciona y de qué cliente es.
import { createRoute } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { Yo } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { errores, json } from "./ayuda";

export const yo = nuevoRouter();

// El cliente con su nombre y modo. Si no existe es un error de datos (el portero ya comprobó que
// estaba activo), así que se deja caer.
async function clienteDe(id: string) {
  return db.organizacion.findUniqueOrThrow({ where: { id }, select: { id: true, nombre: true, modo: true } });
}

yo.openapi(
  createRoute({
    method: "get",
    path: "/yo",
    tags: ["Acceso"],
    summary: "Quién soy",
    description:
      "Con sesión: la persona, su rol (equipo o cliente), sus marcas (jefatura, admin) y su cliente con su modo. Con llave: el nombre de la llave y su cliente.",
    responses: {
      200: json(Yo, "Quién está consultando."),
      ...errores(401, 403),
    },
  }),
  async (c) => {
    const quien = c.get("quien");
    if (quien.tipo === "llave") {
      return c.json(
        {
          tipo: "llave" as const,
          llave: { id: quien.llaveId, nombre: quien.nombre },
          cliente: await clienteDe(quien.clienteId),
        },
        200,
      );
    }
    const u = quien.usuario;
    return c.json(
      {
        tipo: "usuario" as const,
        usuario: { id: u.id, nombre: u.nombre, correo: u.email },
        rol: u.rol,
        marcas: { jefatura: quien.esJefatura, admin: quien.esAdmin },
        cliente: quien.clienteId ? await clienteDe(quien.clienteId) : null,
      },
      200,
    );
  },
);
