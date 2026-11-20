// Rutas de lo que el dueño paga y anota por una propiedad: gastos (cuentas de gasto común, luz,
// agua, gas), contribuciones (impuesto territorial) y movimientos (el libro de ingresos y
// gastos). Pieza G; se monta desde cartera.ts.
//
// El equipo puede todo y un dueño solo lo suyo (decisión d25); una llave solo lee. Cada gasto y
// cada contribución guardan quién los anotó (`anotadoPorId`), aunque ese dato no sale hacia el
// dueño: es de Proges.
import { createRoute, z } from "@hono/zod-openapi";
import { db, Prisma } from "@proges/db";
import {
  Contribucion,
  ContribucionCambio,
  ContribucionEntrada,
  ContribucionesConsulta,
  ContribucionesGenerar,
  Gasto,
  GastoCambio,
  GastoEntrada,
  GastosConsulta,
  Id,
  Movimiento,
  MovimientoEntrada,
  MovimientosConsulta,
  Pagina,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import type { Quien } from "../acceso/quien";
import { espacioParaEscribirEn, espaciosQueLee, exigirEscritura } from "../permisos";
import { vencimientoDeCuota } from "../dominio/cartera/contribuciones";
import { paginar, respuestaPagina } from "../dominio/cartera/consultas";
import {
  aDecimal,
  deFechaISO,
  exigirMontoPositivo,
  exigirMontoValido,
  resolverPago,
} from "../dominio/cartera/entrada";
import { contribucionParaDueno, gastoParaDueno, movimientoParaDueno } from "../dominio/cartera/recorte";
import { errores, json } from "./ayuda";

export const cuentas = nuevoRouter();

const ParamId = z.object({ id: Id });
const SinContenido = { 204: { description: "Hecho; no hay nada que devolver." } } as const;

// El espacio donde se escribe algo que cuelga de una propiedad: el de la propiedad misma (nunca
// uno que mande la web). Llave → 403; propiedad que no existe o es de otro cliente → 404.
async function espacioDeLaPropiedad(quien: Quien, propiedadId: string): Promise<string> {
  const propiedad = await db.property.findUnique({ where: { id: propiedadId }, select: { organizationId: true } });
  return espacioParaEscribirEn(quien, propiedad?.organizationId);
}

// ---------------------------------------------------------------------------
// Gastos (cuentas de la propiedad)
// ---------------------------------------------------------------------------

cuentas.openapi(
  createRoute({
    method: "get",
    path: "/gastos",
    tags: ["Gastos"],
    summary: "Lista de gastos (cuentas)",
    description:
      "Las cuentas que el dueño paga por sus propiedades, las más nuevas primero. Se puede filtrar por propiedad, mes (`periodo`) y estado. El equipo ve todos los clientes; un dueño o una llave, solo lo suyo.",
    request: { query: GastosConsulta },
    responses: { 200: json(Pagina(Gasto), "Una página de gastos."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const where: Prisma.PropertyBillWhereInput = {
      organizationId: { in: await espaciosQueLee(quien, q.clienteId) },
      ...(q.propiedadId && { propertyId: q.propiedadId }),
      ...(q.periodo && { periodo: q.periodo }),
      ...(q.estado && { estado: q.estado }),
    };
    const [total, filas] = await Promise.all([
      db.propertyBill.count({ where }),
      db.propertyBill.findMany({
        where,
        orderBy: [{ periodo: "desc" }, { fechaVencimiento: "desc" }, { id: "asc" }],
        ...paginar(q),
      }),
    ]);
    return c.json(respuestaPagina(filas.map(gastoParaDueno), total, q), 200);
  },
);

cuentas.openapi(
  createRoute({
    method: "post",
    path: "/gastos",
    tags: ["Gastos"],
    summary: "Anotar un gasto",
    description:
      "Anota una cuenta de una propiedad, pendiente de pago. El espacio sale de la propiedad. Queda guardado quién la anotó. Una llave no puede.",
    request: { body: { content: { "application/json": { schema: GastoEntrada } }, required: true } },
    responses: { 201: json(Gasto, "El gasto anotado."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const body = c.req.valid("json");
    const orgId = await espacioDeLaPropiedad(quien, body.propiedadId);
    exigirMontoValido(body.monto, "monto");
    const fila = await db.propertyBill.create({
      data: {
        organizationId: orgId,
        propertyId: body.propiedadId,
        tipo: body.tipo,
        periodo: body.periodo,
        monto: body.monto ? aDecimal(body.monto) : null,
        ...(body.monto && { moneda: body.monto.moneda }),
        fechaVencimiento: deFechaISO(body.fechaVencimiento),
        estado: "PENDIENTE",
        notas: body.notas || null,
        anotadoPorId: persona.usuario.id,
      },
    });
    return c.json(gastoParaDueno(fila), 201);
  },
);

cuentas.openapi(
  createRoute({
    method: "patch",
    path: "/gastos/{id}",
    tags: ["Gastos"],
    summary: "Cambiar un gasto o marcarlo pagado",
    description:
      "Cambia solo los campos que se manden. Para marcarlo pagado: `estado: PAGADA` con `fechaPago`. Un dueño solo cambia los suyos (404 si es de otro cliente).",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: GastoCambio } }, required: true },
    },
    responses: { 200: json(Gasto, "El gasto ya cambiado."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");
    const actual = await db.propertyBill.findUnique({ where: { id } });
    await espacioParaEscribirEn(quien, actual?.organizationId);
    if (!actual) throw new ErrorApi(404, "No se encontró lo que buscas.");
    exigirMontoValido(cambio.monto, "monto");
    const pago = resolverPago(actual, cambio);
    const fila = await db.propertyBill.update({
      where: { id },
      data: {
        tipo: cambio.tipo,
        periodo: cambio.periodo,
        monto: cambio.monto === undefined ? undefined : cambio.monto ? aDecimal(cambio.monto) : null,
        moneda: cambio.monto?.moneda,
        fechaVencimiento: cambio.fechaVencimiento ? deFechaISO(cambio.fechaVencimiento) : undefined,
        notas: cambio.notas === undefined ? undefined : cambio.notas || null,
        estado: pago.estado,
        fechaPago: pago.fechaPago,
      },
    });
    return c.json(gastoParaDueno(fila), 200);
  },
);

cuentas.openapi(
  createRoute({
    method: "delete",
    path: "/gastos/{id}",
    tags: ["Gastos"],
    summary: "Borrar un gasto",
    description: "Borra un gasto anotado. Un dueño solo borra los suyos (404 si es de otro cliente).",
    request: { params: ParamId },
    responses: { ...SinContenido, ...errores(401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const actual = await db.propertyBill.findUnique({ where: { id }, select: { organizationId: true } });
    const orgId = await espacioParaEscribirEn(quien, actual?.organizationId);
    await db.propertyBill.deleteMany({ where: { id, organizationId: orgId } });
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// Contribuciones (impuesto territorial)
// ---------------------------------------------------------------------------

// Las contribuciones se anotan en pesos: la base no guarda moneda para ellas.
function montoDeContribucion(monto: { valor: string; moneda: string } | null | undefined) {
  if (!monto) return null;
  if (monto.moneda !== "CLP") {
    throw new ErrorApi(400, "Revisa los campos.", { monto: "Las contribuciones se anotan en pesos (CLP)." });
  }
  return new Prisma.Decimal(monto.valor);
}

const YA_EXISTE = "Ya existe una contribución para ese año y cuota.";

cuentas.openapi(
  createRoute({
    method: "get",
    path: "/contribuciones",
    tags: ["Contribuciones"],
    summary: "Lista de contribuciones",
    description:
      "Las cuotas de contribuciones (impuesto territorial), de la más nueva a la más antigua. Se puede filtrar por propiedad, año y estado. El equipo ve todos los clientes; un dueño o una llave, solo lo suyo.",
    request: { query: ContribucionesConsulta },
    responses: { 200: json(Pagina(Contribucion), "Una página de cuotas."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const where: Prisma.PropertyTaxWhereInput = {
      organizationId: { in: await espaciosQueLee(quien, q.clienteId) },
      ...(q.propiedadId && { propertyId: q.propiedadId }),
      ...(q.anio && { anio: q.anio }),
      ...(q.estado && { estado: q.estado }),
    };
    const [total, filas] = await Promise.all([
      db.propertyTax.count({ where }),
      db.propertyTax.findMany({ where, orderBy: [{ anio: "desc" }, { cuota: "desc" }, { id: "asc" }], ...paginar(q) }),
    ]);
    return c.json(respuestaPagina(filas.map(contribucionParaDueno), total, q), 200);
  },
);

cuentas.openapi(
  createRoute({
    method: "post",
    path: "/contribuciones",
    tags: ["Contribuciones"],
    summary: "Anotar una cuota de contribuciones",
    description:
      "Anota la cuota 1 a 4 de un año para una propiedad. El vencimiento se calcula con el calendario del SII (abril, junio, septiembre y noviembre). 409 si esa cuota ya existe. Queda guardado quién la anotó. Una llave no puede.",
    request: { body: { content: { "application/json": { schema: ContribucionEntrada } }, required: true } },
    responses: { 201: json(Contribucion, "La cuota anotada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const body = c.req.valid("json");
    const orgId = await espacioDeLaPropiedad(quien, body.propiedadId);
    const monto = montoDeContribucion(body.monto);
    exigirMontoValido(body.monto, "monto");
    const existente = await db.propertyTax.findUnique({
      where: { propertyId_anio_cuota: { propertyId: body.propiedadId, anio: body.anio, cuota: body.cuota } },
      select: { id: true },
    });
    if (existente) throw new ErrorApi(409, YA_EXISTE);
    try {
      const fila = await db.propertyTax.create({
        data: {
          organizationId: orgId,
          propertyId: body.propiedadId,
          anio: body.anio,
          cuota: body.cuota,
          monto,
          fechaVencimiento: vencimientoDeCuota(body.anio, body.cuota),
          estado: "PENDIENTE",
          anotadoPorId: persona.usuario.id,
        },
      });
      return c.json(contribucionParaDueno(fila), 201);
    } catch (error) {
      // Otra petición la creó entre la revisión de arriba y este guardado.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ErrorApi(409, YA_EXISTE);
      }
      throw error;
    }
  },
);

cuentas.openapi(
  createRoute({
    method: "post",
    path: "/propiedades/{id}/contribuciones/generar",
    tags: ["Contribuciones"],
    summary: "Generar las cuatro cuotas de un año",
    description:
      "Crea las cuatro cuotas del año para la propiedad, sin monto. Las que ya existían no se tocan, así que se puede pedir más de una vez. Devuelve las cuatro.",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: ContribucionesGenerar } }, required: true },
    },
    responses: { 200: json(z.array(Contribucion), "Las cuatro cuotas del año."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { id: propiedadId } = c.req.valid("param");
    const { anio } = c.req.valid("json");
    const orgId = await espacioDeLaPropiedad(quien, propiedadId);
    await db.propertyTax.createMany({
      data: [1, 2, 3, 4].map((cuota) => ({
        organizationId: orgId,
        propertyId: propiedadId,
        anio,
        cuota,
        monto: null,
        fechaVencimiento: vencimientoDeCuota(anio, cuota),
        estado: "PENDIENTE" as const,
        anotadoPorId: persona.usuario.id,
      })),
      skipDuplicates: true,
    });
    const filas = await db.propertyTax.findMany({
      where: { propertyId: propiedadId, anio },
      orderBy: { cuota: "asc" },
    });
    return c.json(filas.map(contribucionParaDueno), 200);
  },
);

cuentas.openapi(
  createRoute({
    method: "patch",
    path: "/contribuciones/{id}",
    tags: ["Contribuciones"],
    summary: "Cambiar una cuota o marcarla pagada",
    description:
      "Cambia el monto o el estado. Para marcarla pagada: `estado: PAGADA` con `fechaPago`. Un dueño solo cambia las suyas (404 si es de otro cliente).",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: ContribucionCambio } }, required: true },
    },
    responses: { 200: json(Contribucion, "La cuota ya cambiada."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");
    const actual = await db.propertyTax.findUnique({ where: { id } });
    await espacioParaEscribirEn(quien, actual?.organizationId);
    if (!actual) throw new ErrorApi(404, "No se encontró lo que buscas.");
    const monto = cambio.monto === undefined ? undefined : montoDeContribucion(cambio.monto);
    exigirMontoValido(cambio.monto, "monto");
    const pago = resolverPago(actual, cambio);
    const fila = await db.propertyTax.update({
      where: { id },
      data: { monto, estado: pago.estado, fechaPago: pago.fechaPago },
    });
    return c.json(contribucionParaDueno(fila), 200);
  },
);

cuentas.openapi(
  createRoute({
    method: "delete",
    path: "/contribuciones/{id}",
    tags: ["Contribuciones"],
    summary: "Borrar una cuota",
    description: "Borra una cuota anotada. Un dueño solo borra las suyas (404 si es de otro cliente).",
    request: { params: ParamId },
    responses: { ...SinContenido, ...errores(401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const actual = await db.propertyTax.findUnique({ where: { id }, select: { organizationId: true } });
    const orgId = await espacioParaEscribirEn(quien, actual?.organizationId);
    await db.propertyTax.deleteMany({ where: { id, organizationId: orgId } });
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// Movimientos (libro de ingresos y gastos)
// ---------------------------------------------------------------------------

cuentas.openapi(
  createRoute({
    method: "get",
    path: "/movimientos",
    tags: ["Movimientos"],
    summary: "Lista de movimientos",
    description:
      "Los ingresos y gastos anotados en el libro de las propiedades, los más recientes primero. Se puede filtrar por propiedad, tipo, categoría y rango de fechas (`desde` y `hasta`, ambas incluidas). El equipo ve todos los clientes; un dueño o una llave, solo lo suyo.",
    request: { query: MovimientosConsulta },
    responses: { 200: json(Pagina(Movimiento), "Una página de movimientos."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const fecha = {
      ...(q.desde && { gte: deFechaISO(q.desde) }),
      ...(q.hasta && { lte: deFechaISO(q.hasta) }),
    };
    const where: Prisma.MovementWhereInput = {
      organizationId: { in: await espaciosQueLee(quien, q.clienteId) },
      ...(q.propiedadId && { propertyId: q.propiedadId }),
      ...(q.tipo && { tipo: q.tipo }),
      ...(q.categoria && { categoria: q.categoria }),
      ...(Object.keys(fecha).length > 0 && { fecha }),
    };
    const [total, filas] = await Promise.all([
      db.movement.count({ where }),
      db.movement.findMany({ where, orderBy: [{ fecha: "desc" }, { id: "asc" }], ...paginar(q) }),
    ]);
    return c.json(respuestaPagina(filas.map(movimientoParaDueno), total, q), 200);
  },
);

cuentas.openapi(
  createRoute({
    method: "post",
    path: "/movimientos",
    tags: ["Movimientos"],
    summary: "Anotar un movimiento",
    description:
      "Anota un ingreso o un gasto en el libro de una propiedad. El espacio sale de la propiedad. Una llave no puede.",
    request: { body: { content: { "application/json": { schema: MovimientoEntrada } }, required: true } },
    responses: { 201: json(Movimiento, "El movimiento anotado."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const body = c.req.valid("json");
    const orgId = await espacioDeLaPropiedad(quien, body.propiedadId);
    exigirMontoPositivo(body.monto, "monto");
    const fila = await db.movement.create({
      data: {
        organizationId: orgId,
        propertyId: body.propiedadId,
        tipo: body.tipo,
        categoria: body.categoria,
        monto: aDecimal(body.monto),
        moneda: body.monto.moneda,
        fecha: deFechaISO(body.fecha),
        descripcion: body.descripcion || null,
      },
    });
    return c.json(movimientoParaDueno(fila), 201);
  },
);
