// Rutas de la administración de arriendos (ADR 0012). Pieza G.
//
// Cuando Proges «administra» el arriendo de una propiedad, el arrendatario le paga directo al
// dueño: Proges lleva la lista de quién pagó y quién no, y cobra una comisión (un porcentaje del
// arriendo de cada mes). Poner una propiedad en administración, cambiarla o terminarla es solo del
// EQUIPO (el dueño la ve, no la maneja). Una propiedad tiene a lo más una administración vigente a
// la vez: no se permite que dos se pisen en el tiempo. La cuenta de cada mes está en
// dominio/cartera/administracion.ts.
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import {
  Administracion,
  AdministracionCambio,
  AdministracionEntrada,
  ComisionConsulta,
  ComisionDelMes,
  Id,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { espacioParaEscribirEn, espaciosQueLee, exigirEquipo, legible } from "../permisos";
import { hoyChile, mesActual, rangoDelMes } from "../util/fechas";
import { comisionesPorCliente, cuentaDelMes, type CobroDato } from "../dominio/cartera/administracion";
import { deFechaISO, deFechaISOONull } from "../dominio/cartera/entrada";
import { administracionParaDueno, montosParaDueno } from "../dominio/cartera/recorte";
import { errores, json } from "./ayuda";

export const administracion = nuevoRouter();

const ParamId = z.object({ id: Id });

const MENSAJE_SOLAPE =
  "Esta propiedad ya tiene una administración en esas fechas. Edítala o termínala antes de poner otra.";

// ¿Hay otra administración de esa propiedad que se pise con el rango desde..hasta? Dos rangos se
// pisan si cada uno empieza antes de que termine el otro (un rango sin «hasta» no termina nunca).
// `exceptoId` es la que se está editando: no se pisa a sí misma.
async function haySolape(propertyId: string, desde: Date, hasta: Date | null, exceptoId?: string): Promise<boolean> {
  const otra = await db.administracion.findFirst({
    where: {
      propertyId,
      ...(exceptoId ? { id: { not: exceptoId } } : {}),
      OR: [{ hasta: null }, { hasta: { gte: desde } }],
      ...(hasta ? { desde: { lte: hasta } } : {}),
    },
    select: { id: true },
  });
  return otra !== null;
}

administracion.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}/administracion",
    tags: ["Administración"],
    summary: "Administraciones de una propiedad",
    description:
      "El historial de períodos en que Proges administró (o administra) el arriendo de la propiedad, del más reciente al más antiguo. Vacío si nunca la administró. 404 si la propiedad no existe o es de otro cliente.",
    request: { params: ParamId },
    responses: { 200: json(z.array(Administracion), "Las administraciones de la propiedad."), ...errores(401, 404) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    await legible(c.get("quien"), await db.property.findUnique({ where: { id }, select: { organizationId: true } }));
    const filas = await db.administracion.findMany({ where: { propertyId: id }, orderBy: { desde: "desc" } });
    const hoy = hoyChile();
    return c.json(filas.map((f) => administracionParaDueno(f, hoy)), 200);
  },
);

administracion.openapi(
  createRoute({
    method: "post",
    path: "/propiedades/{id}/administracion",
    tags: ["Administración"],
    summary: "Poner una propiedad en administración",
    description:
      "Empieza la administración del arriendo desde una fecha, con su porcentaje de comisión. Queda abierta (sin término). Solo el equipo. 409 si ya hay otra administración en esas fechas.",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: AdministracionEntrada } }, required: true },
    },
    responses: { 201: json(Administracion, "La administración creada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const propiedad = await db.property.findUnique({ where: { id }, select: { organizationId: true } });
    const orgId = await espacioParaEscribirEn(quien, propiedad?.organizationId);
    const desde = deFechaISO(body.desde);
    if (await haySolape(id, desde, null)) throw new ErrorApi(409, MENSAJE_SOLAPE);
    const fila = await db.administracion.create({
      data: { organizationId: orgId, propertyId: id, desde, comisionPct: body.comisionPct },
    });
    return c.json(administracionParaDueno(fila, hoyChile()), 201);
  },
);

administracion.openapi(
  createRoute({
    method: "patch",
    path: "/propiedades/{id}/administracion",
    tags: ["Administración"],
    summary: "Cambiar o terminar la administración",
    description:
      "Cambia la administración más reciente de la propiedad (solo los campos que se manden). Terminarla es mandar `hasta`: la comisión del mes en que termina se cobra completa (los meses se cuentan enteros), y no se borra nada, el historial queda. Solo el equipo.",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: AdministracionCambio } }, required: true },
    },
    responses: { 200: json(Administracion, "La administración ya cambiada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");
    const propiedad = await db.property.findUnique({ where: { id }, select: { organizationId: true } });
    await espacioParaEscribirEn(quien, propiedad?.organizationId);
    const actual = await db.administracion.findFirst({ where: { propertyId: id }, orderBy: { desde: "desc" } });
    if (!actual) throw new ErrorApi(404, "Esta propiedad no tiene administración.");

    const desde = cambio.desde ? deFechaISO(cambio.desde) : actual.desde;
    const hasta = cambio.hasta === undefined ? actual.hasta : deFechaISOONull(cambio.hasta);
    if (hasta && hasta < desde) {
      throw new ErrorApi(400, "Revisa los campos.", { hasta: "No puede ser anterior al inicio." });
    }
    if (await haySolape(id, desde, hasta, actual.id)) throw new ErrorApi(409, MENSAJE_SOLAPE);
    const fila = await db.administracion.update({
      where: { id: actual.id },
      data: { desde, hasta, comisionPct: cambio.comisionPct },
    });
    return c.json(administracionParaDueno(fila, hoyChile()), 200);
  },
);

administracion.openapi(
  createRoute({
    method: "get",
    path: "/administracion/comision",
    tags: ["Administración"],
    summary: "Comisión de administración de un mes",
    description:
      "Por cada propiedad administrada en el mes: su estado (pagado, atrasado, por cobrar, sin cobro), lo esperado y la comisión de Proges (arriendo × porcentaje, sin mirar si se pagó). Y el total por cliente, que es lo que se factura. Sin `mes`, el mes de hoy. El equipo ve todos los clientes (o uno, con `clienteId`); un dueño o una llave, solo lo suyo.",
    request: { query: ComisionConsulta },
    responses: { 200: json(ComisionDelMes, "La comisión del mes."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const mes = q.mes ?? mesActual();
    const hoy = hoyChile();
    const { inicio, fin } = rangoDelMes(mes);
    const organizationId = { in: await espaciosQueLee(quien, q.clienteId) };

    // Una administración toca el mes si empezó antes de que termine y no terminó antes de que empiece.
    const adms = await db.administracion.findMany({
      where: { organizationId, desde: { lte: fin }, OR: [{ hasta: null }, { hasta: { gte: inicio } }] },
      include: { property: { select: { direccion: true } } },
      orderBy: [{ organizationId: "asc" }, { desde: "asc" }],
    });
    const cobros = adms.length
      ? await db.rentCharge.findMany({
          where: { organizationId, periodo: mes, contract: { propertyId: { in: adms.map((a) => a.propertyId) } } },
          select: {
            periodo: true,
            montoEsperado: true,
            moneda: true,
            fechaVencimiento: true,
            estado: true,
            contract: { select: { propertyId: true } },
          },
        })
      : [];

    const filas = adms.map((a) => {
      const delaPropiedad: CobroDato[] = cobros
        .filter((k) => k.contract.propertyId === a.propertyId)
        .map((k) => ({
          periodo: k.periodo,
          montoEsperado: Number(k.montoEsperado),
          moneda: k.moneda,
          fechaVencimiento: k.fechaVencimiento,
          estado: k.estado,
        }));
      const cuenta = cuentaDelMes({ desde: a.desde, hasta: a.hasta, comisionPct: Number(a.comisionPct) }, delaPropiedad, mes, hoy);
      return { adm: a, cuenta };
    });

    const totales = comisionesPorCliente(filas.map((f) => ({ clienteId: f.adm.organizationId, comision: f.cuenta.comision })));
    const clientes = await db.organizacion.findMany({
      where: { id: { in: totales.map((t) => t.clienteId) } },
      select: { id: true, nombre: true },
    });
    return c.json(
      {
        mes,
        propiedades: filas.map(({ adm, cuenta }) => ({
          propiedadId: adm.propertyId,
          propiedadDireccion: adm.property.direccion,
          clienteId: adm.organizationId,
          periodo: mes,
          estado: cuenta.estado,
          esperado: montosParaDueno(cuenta.esperado),
          comision: montosParaDueno(cuenta.comision),
        })),
        totalesPorCliente: totales.map((t) => ({
          clienteId: t.clienteId,
          clienteNombre: clientes.find((k) => k.id === t.clienteId)?.nombre ?? "",
          total: montosParaDueno(t.total),
        })),
      },
      200,
    );
  },
);
