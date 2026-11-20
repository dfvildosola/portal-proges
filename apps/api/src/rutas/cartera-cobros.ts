// Rutas de los cobros de arriendo (RentCharge): la lista por mes y estado, los atrasados, un
// cobro, anotar un pago y generar los cobros de un mes. Pieza G; se monta desde cartera.ts.
//
// Un cobro es lo que un contrato debe cobrar en un mes. Anotar que se pagó lo puede hacer el
// equipo o el dueño (decisión d25); una llave solo lee.
import { createRoute, z } from "@hono/zod-openapi";
import { db, Prisma } from "@proges/db";
import {
  Cobro,
  CobroPago,
  CobrosAtrasadosConsulta,
  CobrosConsulta,
  CobrosGenerados,
  CobrosGenerar,
  Id,
  Pagina,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { espacioParaCrear, espacioParaEscribirEn, espaciosQueLee, exigirEscritura, legible } from "../permisos";
import { hoyChile, vencimientoDelMes } from "../util/fechas";
import { COBRO_INCLUYE, paginar, respuestaPagina, whereEstadoCobro } from "../dominio/cartera/consultas";
import { saldoCobro } from "../dominio/cartera/cobros";
import { whereCubreMes } from "../dominio/cartera/contratos";
import { aDecimal, deFechaISO, exigirMontoPositivo, exigirMontoValido } from "../dominio/cartera/entrada";
import { cobroParaDueno } from "../dominio/cartera/recorte";
import { errores, json } from "./ayuda";

export const cobros = nuevoRouter();

const ParamId = z.object({ id: Id });
const ORDEN = [{ periodo: "desc" }, { fechaVencimiento: "asc" }, { id: "asc" }] as const;

cobros.openapi(
  createRoute({
    method: "get",
    path: "/cobros",
    tags: ["Cobros"],
    summary: "Lista de cobros de arriendo",
    description:
      "Los cobros, del mes más reciente al más antiguo. Se puede filtrar por mes (`mes=2026-11`), por estado (el real de hoy: un cobro sin pagar que ya venció sale ATRASADO), propiedad o contrato. El equipo ve todos los clientes; un dueño o una llave, solo lo suyo.",
    request: { query: CobrosConsulta },
    responses: { 200: json(Pagina(Cobro), "Una página de cobros."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const hoy = hoyChile();
    const where: Prisma.RentChargeWhereInput = {
      organizationId: { in: await espaciosQueLee(quien, q.clienteId) },
      ...(q.mes && { periodo: q.mes }),
      ...(q.estado && whereEstadoCobro(q.estado, hoy)),
      ...(q.contratoId && { contractId: q.contratoId }),
      ...(q.propiedadId && { contract: { propertyId: q.propiedadId } }),
    };
    const [total, filas] = await Promise.all([
      db.rentCharge.count({ where }),
      db.rentCharge.findMany({ where, include: COBRO_INCLUYE, orderBy: [...ORDEN], ...paginar(q) }),
    ]);
    return c.json(respuestaPagina(filas.map((f) => cobroParaDueno(f, hoy)), total, q), 200);
  },
);

// Va antes de «/cobros/{id}» para que «atrasados» no se lea como un id.
cobros.openapi(
  createRoute({
    method: "get",
    path: "/cobros/atrasados",
    tags: ["Cobros"],
    summary: "Cobros atrasados",
    description:
      "Los cobros sin pagar que ya vencieron (o que alguien marcó atrasados), de cualquier mes, los más viejos primero. Cada uno trae su saldo.",
    request: { query: CobrosAtrasadosConsulta },
    responses: { 200: json(Pagina(Cobro), "Una página de cobros atrasados."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const hoy = hoyChile();
    const where: Prisma.RentChargeWhereInput = {
      organizationId: { in: await espaciosQueLee(quien, q.clienteId) },
      ...whereEstadoCobro("ATRASADO", hoy),
      ...(q.propiedadId && { contract: { propertyId: q.propiedadId } }),
    };
    const [total, filas] = await Promise.all([
      db.rentCharge.count({ where }),
      db.rentCharge.findMany({
        where,
        include: COBRO_INCLUYE,
        orderBy: [{ periodo: "asc" }, { fechaVencimiento: "asc" }, { id: "asc" }],
        ...paginar(q),
      }),
    ]);
    return c.json(respuestaPagina(filas.map((f) => cobroParaDueno(f, hoy)), total, q), 200);
  },
);

cobros.openapi(
  createRoute({
    method: "get",
    path: "/cobros/{id}",
    tags: ["Cobros"],
    summary: "Un cobro",
    description: "Un cobro por su id. 404 si no existe o es de otro cliente.",
    request: { params: ParamId },
    responses: { 200: json(Cobro, "El cobro."), ...errores(401, 404) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const fila = await legible(
      c.get("quien"),
      await db.rentCharge.findUnique({ where: { id }, include: COBRO_INCLUYE }),
    );
    return c.json(cobroParaDueno(fila, hoyChile()), 200);
  },
);

cobros.openapi(
  createRoute({
    method: "post",
    path: "/cobros/{id}/pago",
    tags: ["Cobros"],
    summary: "Anotar un pago de un cobro",
    description:
      "Suma un pago (o abono) a lo ya pagado del cobro, con su fecha. Si con eso el saldo llega a cero, el cobro queda PAGADO; si no, sigue abierto con su abono. El monto va en la moneda del cobro. Lo puede anotar el equipo o el dueño; una llave no.",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: CobroPago } }, required: true },
    },
    responses: { 200: json(Cobro, "El cobro con el pago sumado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const pago = c.req.valid("json");
    const hoy = hoyChile();

    const actual = await db.rentCharge.findUnique({ where: { id }, select: { organizationId: true } });
    const orgId = await espacioParaEscribirEn(quien, actual?.organizationId);
    exigirMontoPositivo(pago.montoPagado, "montoPagado");
    exigirMontoValido(pago.interesMora, "interesMora");

    // Dos abonos a la vez (o un reintento) no se pueden pisar: la transacción bloquea la fila del
    // cobro hasta terminar, y el segundo lee el total ya sumado.
    const fila = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "RentCharge" WHERE id = ${id} AND "organizationId" = ${orgId} FOR UPDATE`;
      const cobro = await tx.rentCharge.findFirst({ where: { id, organizationId: orgId } });
      if (!cobro) throw new ErrorApi(404, "No se encontró lo que buscas.");
      if (cobro.estado === "PAGADO") throw new ErrorApi(409, "Este cobro ya está pagado.");
      if (pago.montoPagado.moneda !== cobro.moneda) {
        throw new ErrorApi(400, "Revisa los campos.", { montoPagado: `El cobro es en ${cobro.moneda}.` });
      }
      if (pago.interesMora && pago.interesMora.moneda !== cobro.moneda) {
        throw new ErrorApi(400, "Revisa los campos.", { interesMora: `El cobro es en ${cobro.moneda}.` });
      }

      // Cada pago se suma a lo ya pagado. Decimal, no Number: la UF tiene decimales.
      const totalPagado = (cobro.montoPagado ?? new Prisma.Decimal(0)).plus(aDecimal(pago.montoPagado));
      const cubierto = saldoCobro({ ...cobro, montoPagado: totalPagado }) === 0;
      const notas = pago.notas || null;
      return tx.rentCharge.update({
        where: { id },
        data: {
          estado: cubierto ? "PAGADO" : cobro.estado,
          modificadoPorId: persona.usuario.id,
          fechaPago: deFechaISO(pago.fechaPago),
          montoPagado: totalPagado,
          ...(pago.interesMora && { interesMora: aDecimal(pago.interesMora) }),
          ...(notas !== null && { notas: cobro.notas ? `${cobro.notas} · ${notas}` : notas }),
        },
        include: COBRO_INCLUYE,
      });
    });
    return c.json(cobroParaDueno(fila, hoy), 200);
  },
);

cobros.openapi(
  createRoute({
    method: "post",
    path: "/cobros/generar",
    tags: ["Cobros"],
    summary: "Generar los cobros de un mes",
    description:
      "Crea un cobro por cada contrato que cubre el mes pedido, con el arriendo del contrato y su vencimiento. Los contratos que ya tienen su cobro de ese mes no se tocan, así que se puede pedir más de una vez. Un dueño genera los suyos; el equipo elige el cliente con `clienteId`.",
    request: { body: { content: { "application/json": { schema: CobrosGenerar } }, required: true } },
    responses: { 200: json(CobrosGenerados, "Cuántos cobros se crearon."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { mes, clienteId } = c.req.valid("json");
    const orgId = await espacioParaCrear(quien, clienteId);
    const contratos = await db.leaseContract.findMany({
      where: { organizationId: orgId, ...whereCubreMes(mes) },
      select: { id: true, monto: true, moneda: true, diaPago: true },
    });
    const { count } = await db.rentCharge.createMany({
      data: contratos.map((k) => ({
        organizationId: orgId,
        modificadoPorId: persona.usuario.id,
        contractId: k.id,
        periodo: mes,
        montoEsperado: k.monto,
        moneda: k.moneda,
        fechaVencimiento: vencimientoDelMes(mes, k.diaPago),
        estado: "PENDIENTE" as const,
      })),
      skipDuplicates: true,
    });
    return c.json({ mes, creados: count, yaExistian: contratos.length - count }, 200);
  },
);
