// Rutas de los maestros: gente que hace los trabajos en las obras (ADR 0014, d23).
//
// Un maestro no se inventa en el portal: es un PROVEEDOR de Odoo. Aquí solo se busca entre los que
// Odoo ya tiene, se elige uno y se le agrega lo que Odoo no sabe (su especialidad y su teléfono de
// trabajo). Es como anotar en la libreta de contactos de la oficina: el nombre y el RUT los dicta
// Odoo; el portal solo agrega «es gasfíter».
//
// Los maestros viven en el espacio de Proges (ORG_PROGES) y valen para todos los clientes: se
// leen y se escriben con exigirEquipo, no con las funciones de espacios de clientes. Un dueño o una
// llave nunca los ven (403). Cualquiera del equipo puede agregarlos (no hace falta jefatura).
import { createRoute, z } from "@hono/zod-openapi";
import { db, ORG_PROGES, type Maestro as MaestroDeBase } from "@proges/db";
import {
  FacturasOdooRespuesta,
  Id,
  Maestro,
  MaestroCambio,
  MaestroNuevo,
  MaestrosRespuesta,
  ProveedoresRespuesta,
} from "@proges/contrato";
import { ErrorApi } from "../errores";
import { nuevoRouter } from "../entorno";
import { desdeAfuera } from "../dominio/obra/permisos-obra";
import { facturasOdooDeMaestro } from "../dominio/obra/facturas";
import { textoONull } from "../dominio/obra/formulario";
import { exigirEquipo, exigirEscritura } from "../permisos";
import { errores, json } from "./ayuda";

export const maestros = nuevoRouter();

const aContrato = (m: MaestroDeBase): Maestro => ({
  id: m.id,
  odooPartnerId: m.odooPartnerId,
  nombre: m.nombre,
  especialidad: m.especialidad,
  telefono: m.telefono,
  activo: m.activo,
});

maestros.openapi(
  createRoute({
    method: "get",
    path: "/maestros",
    tags: ["Maestros"],
    summary: "Los maestros",
    description:
      "Los maestros de Proges (proveedores de Odoo con su especialidad), por nombre. Solo para el equipo: un dueño o una llave reciben 403.",
    request: { query: z.object({ soloActivos: z.stringbool().optional().meta({ description: "true: solo los activos (los que se ofrecen al cargar presupuestos)." }) }) },
    responses: { 200: json(MaestrosRespuesta, "Los maestros."), ...errores(401, 403) },
  }),
  async (c) => {
    exigirEquipo(c.get("quien"));
    const { soloActivos } = c.req.valid("query");
    const filas = await db.maestro.findMany({
      where: { organizationId: ORG_PROGES, ...(soloActivos ? { activo: true } : {}) },
      orderBy: { nombre: "asc" },
    });
    return c.json({ items: filas.map(aContrato) }, 200);
  },
);

// Busca proveedores en Odoo por nombre. Es una lectura: no guarda nada.
maestros.openapi(
  createRoute({
    method: "get",
    path: "/maestros/odoo",
    tags: ["Maestros"],
    summary: "Buscar proveedores en Odoo",
    description:
      "Busca proveedores de Odoo por nombre (cada palabra tiene que aparecer, con o sin tilde) y marca cuáles ya son maestros. Los que tienen más facturas salen primero. Odoo solo se lee.",
    request: { query: z.object({ q: z.string().trim().min(2, "Escribe al menos dos letras del nombre.").meta({ description: "Parte del nombre del proveedor." }) }) },
    responses: { 200: json(ProveedoresRespuesta, "Los proveedores encontrados."), ...errores(400, 401, 403, 502) },
  }),
  async (c) => {
    exigirEquipo(c.get("quien"));
    const { q } = c.req.valid("query");
    const encontrados = await desdeAfuera("Odoo", () => c.get("dep").odoo.buscarProveedores(q));
    const existentes = await db.maestro.findMany({
      where: { organizationId: ORG_PROGES, odooPartnerId: { in: encontrados.map((p) => p.id) } },
      select: { odooPartnerId: true },
    });
    const yaEstan = new Set(existentes.map((m) => m.odooPartnerId));
    return c.json({ items: encontrados.map((p) => ({ ...p, yaAgregado: yaEstan.has(p.id) })) }, 200);
  },
);

maestros.openapi(
  createRoute({
    method: "post",
    path: "/maestros",
    tags: ["Maestros"],
    summary: "Agregar un maestro",
    description:
      "Agrega un proveedor de Odoo como maestro. La API lo vuelve a leer en Odoo por su `odooPartnerId` y copia el nombre de ahí (no el que mande el navegador). Si ya está agregado, responde 409.",
    request: { body: { content: { "application/json": { schema: MaestroNuevo } }, required: true } },
    responses: { 201: json(Maestro, "El maestro agregado."), ...errores(400, 401, 403, 409, 502) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    exigirEquipo(quien);
    const pedido = c.req.valid("json");

    const repetido = await db.maestro.findUnique({ where: { odooPartnerId: pedido.odooPartnerId }, select: { nombre: true } });
    if (repetido) throw new ErrorApi(409, `${repetido.nombre} ya está agregado como maestro.`);

    const proveedor = await desdeAfuera("Odoo", () => c.get("dep").odoo.leerProveedor(pedido.odooPartnerId));
    if (!proveedor) throw new ErrorApi(400, "No encontré ese proveedor en Odoo. Búscalo de nuevo.", { odooPartnerId: "No está en Odoo." });

    const creado = await db.maestro.create({
      data: {
        organizationId: ORG_PROGES,
        odooPartnerId: pedido.odooPartnerId,
        nombre: proveedor.nombre,
        especialidad: textoONull(pedido.especialidad),
        // Si no se escribió un teléfono, se parte con el que tiene Odoo.
        telefono: textoONull(pedido.telefono) ?? proveedor.telefono,
      },
    });
    return c.json(aContrato(creado), 201);
  },
);

maestros.openapi(
  createRoute({
    method: "patch",
    path: "/maestros/{id}",
    tags: ["Maestros"],
    summary: "Cambiar un maestro",
    description:
      "Cambia la especialidad, el teléfono o si está activo. Con `refrescarNombreDeOdoo` vuelve a copiar el nombre desde Odoo. Un maestro desactivado deja de ofrecerse al cargar presupuestos, pero sus presupuestos y partidas siguen: nunca se borra.",
    request: {
      params: z.object({ id: Id }),
      body: { content: { "application/json": { schema: MaestroCambio } }, required: true },
    },
    responses: { 200: json(Maestro, "El maestro, ya cambiado."), ...errores(400, 401, 403, 404, 502) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");

    // El maestro tiene que ser del espacio de Proges.
    const maestro = await db.maestro.findFirst({ where: { id, organizationId: ORG_PROGES } });
    if (!maestro) throw new ErrorApi(404, "No se encontró lo que buscas.");

    let nombre: string | undefined;
    if (cambio.refrescarNombreDeOdoo) {
      const proveedor = await desdeAfuera("Odoo", () => c.get("dep").odoo.leerProveedor(maestro.odooPartnerId));
      if (!proveedor) throw new ErrorApi(404, "No lo encontré en Odoo: puede que lo hayan borrado o fusionado con otro.");
      nombre = proveedor.nombre;
    }

    const actualizado = await db.maestro.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(cambio.especialidad !== undefined ? { especialidad: textoONull(cambio.especialidad) } : {}),
        ...(cambio.telefono !== undefined ? { telefono: textoONull(cambio.telefono) } : {}),
        ...(cambio.activo !== undefined ? { activo: cambio.activo } : {}),
      },
    });
    return c.json(aContrato(actualizado), 200);
  },
);

maestros.openapi(
  createRoute({
    method: "get",
    path: "/maestros/{id}/facturas-odoo",
    tags: ["Maestros"],
    summary: "Facturas de un maestro en Odoo",
    description:
      "Las facturas de proveedor del maestro en Odoo, la más reciente primero, con cuánto de cada una ya está asignado a obras y cuánto queda por asignar. Odoo solo se lee. Solo para el equipo.",
    request: { params: z.object({ id: Id }) },
    responses: { 200: json(FacturasOdooRespuesta, "Las facturas del maestro."), ...errores(401, 403, 404, 502) },
  }),
  async (c) => {
    exigirEquipo(c.get("quien"));
    const { id } = c.req.valid("param");
    return c.json(await facturasOdooDeMaestro(c.get("dep").odoo, id), 200);
  },
);
