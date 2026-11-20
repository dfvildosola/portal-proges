// Rutas de configuración: clientes y usuarios. Las escribe la pieza H. Todo es del administrador.
//
// Por qué aquí no se usan espacioParaEscribirEn / espacioParaCrear: esas funciones protegen
// los datos de un cliente contra otro cliente y no dejan escribir en org_proges ni en un
// cliente desactivado, y justamente eso es lo que el administrador hace aquí (crear al equipo,
// reactivar un cliente). Por eso toda escritura pasa por exigirEscritura + exigirAdmin: una
// llave no puede (403) y nadie sin la marca de admin tampoco.
//
// Los clientes y los usuarios no se borran: se desactivan, para que su historial siga teniendo
// autor y sus datos sigan intactos.
import { randomUUID } from "node:crypto";
import { createRoute, z } from "@hono/zod-openapi";
import { db, ORG_PROGES } from "@proges/db";
import {
  ClienteCambios,
  ClienteConfig,
  ClienteNuevo,
  ClientesLista,
  Id,
  UsuarioCambios,
  UsuarioConfig,
  UsuarioNuevo,
  UsuariosConsulta,
  UsuariosLista,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { exigirAdmin, exigirEscritura } from "../permisos";
import { clienteParaConfig, usuarioParaConfig } from "../dominio/config/recorte";
import { aplicarCambios, camposFaltantes, problemaDeAutoEdicion, type DatosUsuario } from "../dominio/config/usuarios";
import { errores, json } from "./ayuda";

export const config = nuevoRouter();

const cuerpo = <T extends z.ZodType>(schema: T) => ({ content: { "application/json": { schema } }, required: true });

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

// El nombre no se repite entre clientes, sin importar mayúsculas: «npl» y «NPL» no pueden ser
// dos espacios distintos.
async function exigirNombreLibre(nombre: string, salvoId?: string): Promise<void> {
  const repetido = await db.organizacion.findFirst({
    where: { tipo: "CLIENTE", nombre: { equals: nombre, mode: "insensitive" }, ...(salvoId ? { id: { not: salvoId } } : {}) },
    select: { id: true },
  });
  if (repetido) throw new ErrorApi(409, "Ya existe un cliente con ese nombre.", { nombre: "Ya existe un cliente con ese nombre." });
}

config.openapi(
  createRoute({
    method: "get",
    path: "/clientes",
    tags: ["Configuración"],
    summary: "Lista de clientes",
    description: "Todos los clientes de Proges, activos y desactivados, ordenados por nombre. Solo el administrador.",
    responses: { 200: json(ClientesLista, "Los clientes."), ...errores(401, 403) },
  }),
  async (c) => {
    exigirAdmin(c.get("quien"));
    const filas = await db.organizacion.findMany({ where: { tipo: "CLIENTE" }, orderBy: { nombre: "asc" } });
    return c.json({ items: filas.map(clienteParaConfig) }, 200);
  },
);

config.openapi(
  createRoute({
    method: "post",
    path: "/clientes",
    tags: ["Configuración"],
    summary: "Crear un cliente",
    description:
      "Crea un cliente (un espacio donde viven sus propiedades, servicios y usuarios). El modo dice si Proges le atiende los servicios (ATENDIDO) o si el dueño lleva su propia cartera (AUTONOMO). Solo el administrador.",
    request: { body: cuerpo(ClienteNuevo) },
    responses: { 201: json(ClienteConfig, "El cliente creado."), ...errores(400, 401, 403, 409) },
  }),
  async (c) => {
    exigirAdmin(exigirEscritura(c.get("quien")));
    const { nombre, modo } = c.req.valid("json");
    await exigirNombreLibre(nombre);
    // El id se genera al azar para que no dependa del nombre: renombrar al cliente nunca cambia
    // el id con el que están marcados sus datos.
    const creado = await db.organizacion.create({ data: { id: `cli_${randomUUID()}`, nombre, tipo: "CLIENTE", modo } });
    return c.json(clienteParaConfig(creado), 201);
  },
);

config.openapi(
  createRoute({
    method: "patch",
    path: "/clientes/{id}",
    tags: ["Configuración"],
    summary: "Cambiar un cliente",
    description:
      "Renombra un cliente, lo activa o desactiva, o le cambia el modo. Un cliente nunca se borra. Desactivado, deja de ofrecerse al equipo y sus llaves de la API dejan de servir. Solo el administrador.",
    request: { params: z.object({ id: Id }), body: cuerpo(ClienteCambios) },
    responses: { 200: json(ClienteConfig, "El cliente ya cambiado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    exigirAdmin(exigirEscritura(c.get("quien")));
    const { id } = c.req.valid("param");
    const cambios = c.req.valid("json");
    // Solo se cambian clientes: org_proges (el espacio de Proges) no se toca desde acá.
    const existe = await db.organizacion.findFirst({ where: { id, tipo: "CLIENTE" }, select: { id: true } });
    if (!existe) throw new ErrorApi(404, "Ese cliente no existe.");
    if (cambios.nombre !== undefined) await exigirNombreLibre(cambios.nombre, id);
    const actualizado = await db.organizacion.update({
      where: { id },
      data: { nombre: cambios.nombre, activa: cambios.activa, modo: cambios.modo },
    });
    return c.json(clienteParaConfig(actualizado), 200);
  },
);

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

async function nombresDeClientes(): Promise<Map<string, string>> {
  const clientes = await db.organizacion.findMany({ where: { tipo: "CLIENTE" }, select: { id: true, nombre: true } });
  return new Map(clientes.map((cl) => [cl.id, cl.nombre]));
}

// Antes de guardar: el cliente existe y, si está desactivado, solo sigue siendo el de quien ya
// estaba ahí (a un cliente desactivado no se le suman personas); y el correo no es de otro.
async function comprobarDestino(datos: DatosUsuario, actual: { id: string; organizationId: string } | null): Promise<void> {
  if (datos.rol === "CLIENTE" && datos.clienteId) {
    const cliente = await db.organizacion.findFirst({
      where: { id: datos.clienteId, tipo: "CLIENTE" },
      select: { id: true, activa: true },
    });
    if (!cliente) throw new ErrorApi(400, "Ese cliente no existe.", { clienteId: "Ese cliente no existe." });
    if (!cliente.activa && cliente.id !== actual?.organizationId) {
      throw new ErrorApi(400, "Ese cliente está desactivado.", { clienteId: "Ese cliente está desactivado." });
    }
  }
  const repetido = await db.usuario.findUnique({ where: { email: datos.correo }, select: { id: true } });
  if (repetido && repetido.id !== actual?.id) {
    throw new ErrorApi(409, "Ya existe un usuario con ese correo.", { correo: "Ya existe un usuario con ese correo." });
  }
}

const espacioDe = (datos: DatosUsuario): string => (datos.rol === "CLIENTE" ? (datos.clienteId as string) : ORG_PROGES);

config.openapi(
  createRoute({
    method: "get",
    path: "/usuarios",
    tags: ["Configuración"],
    summary: "Lista de usuarios",
    description:
      "El equipo de Proges y las personas de cada cliente, por nombre. Con `cliente` se ven solo las de ese cliente; con `rol`, solo el equipo o solo los clientes. Solo el administrador.",
    request: { query: UsuariosConsulta },
    responses: { 200: json(UsuariosLista, "Los usuarios."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    exigirAdmin(c.get("quien"));
    const { cliente, rol } = c.req.valid("query");
    const filas = await db.usuario.findMany({
      where: { ...(cliente ? { organizationId: cliente, rol: "CLIENTE" as const } : {}), ...(rol ? { rol } : {}) },
      orderBy: { nombre: "asc" },
    });
    const nombres = await nombresDeClientes();
    return c.json({ items: filas.map((u) => usuarioParaConfig(u, nombres)) }, 200);
  },
);

config.openapi(
  createRoute({
    method: "post",
    path: "/usuarios",
    tags: ["Configuración"],
    summary: "Dar acceso a una persona",
    description:
      "Crea el usuario con su correo: se entra solo por invitación, así que cuando la persona ingrese con ese correo queda enlazada. Del equipo se puede marcar jefatura o admin; una persona de un cliente nunca es jefatura ni admin. Solo el administrador.",
    request: { body: cuerpo(UsuarioNuevo) },
    responses: { 201: json(UsuarioConfig, "El usuario creado."), ...errores(400, 401, 403, 409) },
  }),
  async (c) => {
    exigirAdmin(exigirEscritura(c.get("quien")));
    const nuevo = c.req.valid("json");
    const datos = aplicarCambios(
      { nombre: "", correo: "", rol: nuevo.rol, clienteId: null, admin: false, jefatura: false, activo: true },
      { nombre: nuevo.nombre, correo: nuevo.correo, clienteId: nuevo.clienteId ?? null, admin: nuevo.admin, jefatura: nuevo.jefatura },
    );
    const faltan = camposFaltantes(datos);
    if (faltan) throw new ErrorApi(400, "Revisa los datos enviados.", faltan);
    await comprobarDestino(datos, null);
    const creado = await db.usuario.create({
      data: {
        nombre: datos.nombre,
        email: datos.correo,
        rol: datos.rol,
        organizationId: espacioDe(datos),
        admin: datos.admin,
        jefatura: datos.jefatura,
        activo: datos.activo,
      },
    });
    return c.json(usuarioParaConfig(creado, await nombresDeClientes()), 201);
  },
);

config.openapi(
  createRoute({
    method: "patch",
    path: "/usuarios/{id}",
    tags: ["Configuración"],
    summary: "Cambiar un usuario",
    description:
      "Cambia nombre, correo, rol, cliente, marcas de jefatura y admin, o lo activa o desactiva. Un usuario nunca se borra. Un administrador no puede quitarse a sí mismo el admin ni desactivarse. Solo el administrador.",
    request: { params: z.object({ id: Id }), body: cuerpo(UsuarioCambios) },
    responses: { 200: json(UsuarioConfig, "El usuario ya cambiado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const admin = exigirAdmin(exigirEscritura(c.get("quien")));
    const { id } = c.req.valid("param");
    const cambios = c.req.valid("json");
    const actual = await db.usuario.findUnique({ where: { id } });
    if (!actual) throw new ErrorApi(404, "Ese usuario no existe.");

    const datos = aplicarCambios(
      {
        nombre: actual.nombre,
        correo: actual.email,
        rol: actual.rol,
        clienteId: actual.rol === "CLIENTE" ? actual.organizationId : null,
        admin: actual.admin,
        jefatura: actual.jefatura,
        activo: actual.activo,
      },
      { ...cambios },
    );
    const faltan = camposFaltantes(datos);
    if (faltan) throw new ErrorApi(400, "Revisa los datos enviados.", faltan);
    const problema = problemaDeAutoEdicion(actual.id === admin.usuario.id, datos);
    if (problema) throw new ErrorApi(400, problema);
    await comprobarDestino(datos, actual);

    const guardado = await db.usuario.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        email: datos.correo,
        rol: datos.rol,
        organizationId: espacioDe(datos),
        admin: datos.admin,
        jefatura: datos.jefatura,
        activo: datos.activo,
      },
    });
    return c.json(usuarioParaConfig(guardado, await nombresDeClientes()), 200);
  },
);
