// Rutas de la cartera del dueño: arrendatarios, contratos de arriendo (con su ciclo: renovar,
// terminar, reajustar), el resumen del mes y el valor de la cartera. Pieza G.
//
// Es lo que un dueño lleva de su propiedad. El equipo puede todo y un dueño solo lo suyo
// (decisión d25): toda lectura filtra por `espaciosQueLee`, y toda escritura saca el espacio del
// registro que toca (`espacioParaEscribirEn`) o del cliente elegido (`espacioParaCrear`). Una
// llave de la API solo lee.
//
// Los cobros, gastos, contribuciones y movimientos viven en cartera-cobros.ts y
// cartera-cuentas.ts (un archivo no pasa de 800 líneas) y se montan al final de este. La
// administración de arriendos, en administracion.ts.
import { createRoute, z } from "@hono/zod-openapi";
import { db, Prisma } from "@proges/db";
import {
  Arrendatario,
  ArrendatarioCambio,
  ArrendatarioEntrada,
  ArrendatariosConsulta,
  Contrato,
  ContratoCambio,
  ContratoEntrada,
  ContratoReajustar,
  ContratosConsulta,
  ContratoTerminar,
  Id,
  Pagina,
  ResumenCartera,
  ResumenConsulta,
  ValorCartera,
  ValorConsulta,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { espacioParaCrear, espacioParaEscribirEn, espaciosQueLee, exigirEscritura, legible } from "../permisos";
import { aMonto } from "../util/al-contrato";
import { getLatestUf } from "../util/currency";
import { hoyChile, mesActual } from "../util/fechas";
import { formatDate } from "../util/format";
import {
  CONTRATO_INCLUYE,
  paginar,
  respuestaPagina,
  whereEstadoCobro,
  whereEstadoContrato,
} from "../dominio/cartera/consultas";
import {
  estadoContrato,
  estaVigente,
  montoReajustado,
  plazoEnMeses,
  terminoRenovado,
} from "../dominio/cartera/contratos";
import {
  contratoComoEntrada,
  datosDeContrato,
  deFechaISO,
  exigirContratoValido,
} from "../dominio/cartera/entrada";
import { arrendatarioParaDueno, contratoParaDueno, montosParaDueno } from "../dominio/cartera/recorte";
import { resumenDelMes } from "../dominio/cartera/resumen";
import { totalDelValor, valorPorCliente } from "../dominio/cartera/valor";
import { cobros } from "./cartera-cobros";
import { cuentas } from "./cartera-cuentas";
import { errores, json } from "./ayuda";

export const cartera = nuevoRouter();

const ParamId = z.object({ id: Id });

// Cobros sin ningún pago: no hay plata de por medio, se pueden borrar o repreciar.
const SIN_PAGO = { montoPagado: null, estado: { not: "PAGADO" } } as const;

// ---------------------------------------------------------------------------
// Arrendatarios
// ---------------------------------------------------------------------------

cartera.openapi(
  createRoute({
    method: "get",
    path: "/arrendatarios",
    tags: ["Cartera"],
    summary: "Lista de arrendatarios",
    description:
      "Los arrendatarios de la cartera, por nombre. El equipo ve los de todos los clientes (o de uno, con `clienteId`); un dueño o una llave, solo los suyos.",
    request: { query: ArrendatariosConsulta },
    responses: { 200: json(Pagina(Arrendatario), "Una página de arrendatarios."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const where: Prisma.TenantWhereInput = { organizationId: { in: await espaciosQueLee(quien, q.clienteId) } };
    const [total, filas] = await Promise.all([
      db.tenant.count({ where }),
      db.tenant.findMany({ where, orderBy: [{ nombre: "asc" }, { id: "asc" }], ...paginar(q) }),
    ]);
    return c.json(respuestaPagina(filas.map(arrendatarioParaDueno), total, q), 200);
  },
);

cartera.openapi(
  createRoute({
    method: "get",
    path: "/arrendatarios/{id}",
    tags: ["Cartera"],
    summary: "Un arrendatario",
    description: "Un arrendatario por su id. 404 si no existe o es de otro cliente.",
    request: { params: ParamId },
    responses: { 200: json(Arrendatario, "El arrendatario."), ...errores(401, 404) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const fila = await legible(c.get("quien"), await db.tenant.findUnique({ where: { id } }));
    return c.json(arrendatarioParaDueno(fila), 200);
  },
);

cartera.openapi(
  createRoute({
    method: "post",
    path: "/arrendatarios",
    tags: ["Cartera"],
    summary: "Crear un arrendatario",
    description:
      "Un dueño crea en lo suyo (si manda `clienteId` se ignora). El equipo tiene que elegir el cliente con `clienteId`. Una llave no puede.",
    request: { body: { content: { "application/json": { schema: ArrendatarioEntrada } }, required: true } },
    responses: { 201: json(Arrendatario, "El arrendatario creado."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const body = c.req.valid("json");
    const orgId = await espacioParaCrear(quien, body.clienteId);
    const fila = await db.tenant.create({
      data: {
        organizationId: orgId,
        nombre: body.nombre,
        rut: body.rut,
        email: body.email || null,
        telefono: body.telefono || null,
      },
    });
    return c.json(arrendatarioParaDueno(fila), 201);
  },
);

cartera.openapi(
  createRoute({
    method: "patch",
    path: "/arrendatarios/{id}",
    tags: ["Cartera"],
    summary: "Cambiar un arrendatario",
    description: "Cambia solo los campos que se manden. Un dueño solo cambia los suyos (404 si es de otro cliente).",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: ArrendatarioCambio } }, required: true },
    },
    responses: { 200: json(Arrendatario, "El arrendatario ya cambiado."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");
    const actual = await db.tenant.findUnique({ where: { id } });
    await espacioParaEscribirEn(quien, actual?.organizationId);
    const fila = await db.tenant.update({
      where: { id },
      data: {
        nombre: cambio.nombre,
        rut: cambio.rut,
        // null o vacío borra el dato; sin mandarlo, queda como estaba.
        email: cambio.email === undefined ? undefined : cambio.email || null,
        telefono: cambio.telefono === undefined ? undefined : cambio.telefono || null,
      },
    });
    return c.json(arrendatarioParaDueno(fila), 200);
  },
);

// ---------------------------------------------------------------------------
// Contratos de arriendo
// ---------------------------------------------------------------------------

async function leerContrato(id: string) {
  return db.leaseContract.findUniqueOrThrow({ where: { id }, include: CONTRATO_INCLUYE });
}

// La propiedad y el arrendatario de un contrato tienen que ser del mismo cliente que el contrato.
async function exigirReferencias(orgId: string, propiedadId: string, arrendatarioId: string): Promise<void> {
  const [propiedad, arrendatario] = await Promise.all([
    db.property.findFirst({ where: { id: propiedadId, organizationId: orgId }, select: { id: true } }),
    db.tenant.findFirst({ where: { id: arrendatarioId, organizationId: orgId }, select: { id: true } }),
  ]);
  const campos: Record<string, string> = {};
  if (!propiedad) campos.propiedadId = "Elige una propiedad de este cliente.";
  if (!arrendatario) campos.arrendatarioId = "Elige un arrendatario de este cliente.";
  if (Object.keys(campos).length > 0) {
    throw new ErrorApi(400, "La propiedad o el arrendatario no existen o son de otro cliente.", campos);
  }
}

cartera.openapi(
  createRoute({
    method: "get",
    path: "/contratos",
    tags: ["Cartera"],
    summary: "Lista de contratos de arriendo",
    description:
      "Los contratos, del más reciente al más antiguo. Se puede filtrar por propiedad, arrendatario y estado (el estado de hoy: vigente, vencido, etc.). El equipo ve todos los clientes; un dueño o una llave, solo lo suyo.",
    request: { query: ContratosConsulta },
    responses: { 200: json(Pagina(Contrato), "Una página de contratos."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const hoy = hoyChile();
    const where: Prisma.LeaseContractWhereInput = {
      organizationId: { in: await espaciosQueLee(quien, q.clienteId) },
      ...(q.propiedadId && { propertyId: q.propiedadId }),
      ...(q.arrendatarioId && { tenantId: q.arrendatarioId }),
      ...(q.estado && whereEstadoContrato(q.estado, hoy)),
    };
    const [total, filas] = await Promise.all([
      db.leaseContract.count({ where }),
      db.leaseContract.findMany({
        where,
        include: CONTRATO_INCLUYE,
        orderBy: [{ fechaInicio: "desc" }, { id: "asc" }],
        ...paginar(q),
      }),
    ]);
    return c.json(respuestaPagina(filas.map((f) => contratoParaDueno(f, hoy)), total, q), 200);
  },
);

cartera.openapi(
  createRoute({
    method: "get",
    path: "/contratos/{id}",
    tags: ["Cartera"],
    summary: "Un contrato de arriendo",
    description: "Un contrato por su id. 404 si no existe o es de otro cliente.",
    request: { params: ParamId },
    responses: { 200: json(Contrato, "El contrato."), ...errores(401, 404) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const fila = await legible(
      c.get("quien"),
      await db.leaseContract.findUnique({ where: { id }, include: CONTRATO_INCLUYE }),
    );
    return c.json(contratoParaDueno(fila, hoyChile()), 200);
  },
);

cartera.openapi(
  createRoute({
    method: "post",
    path: "/contratos",
    tags: ["Cartera"],
    summary: "Crear un contrato de arriendo",
    description:
      "El contrato nace en el cliente de su propiedad, y el arrendatario tiene que ser de ese mismo cliente. Queda anotado quién lo guardó. Una llave no puede.",
    request: { body: { content: { "application/json": { schema: ContratoEntrada } }, required: true } },
    responses: { 201: json(Contrato, "El contrato creado."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const body = c.req.valid("json");
    const propiedad = await db.property.findUnique({
      where: { id: body.propiedadId },
      select: { organizationId: true },
    });
    const orgId = await espacioParaEscribirEn(quien, propiedad?.organizationId);
    await exigirReferencias(orgId, body.propiedadId, body.arrendatarioId);
    exigirContratoValido(body);
    const creado = await db.leaseContract.create({
      data: { ...datosDeContrato(body, persona.usuario.id, plazoEnMeses), organizationId: orgId },
    });
    return c.json(contratoParaDueno(await leerContrato(creado.id), hoyChile()), 201);
  },
);

cartera.openapi(
  createRoute({
    method: "patch",
    path: "/contratos/{id}",
    tags: ["Cartera"],
    summary: "Cambiar un contrato de arriendo",
    description:
      "Cambia solo los campos que se manden; el contrato resultante se revisa completo (por ejemplo, el término no puede quedar antes del inicio). El equipo y el dueño editan lo mismo: vale el último, y queda quién fue. Un dueño solo cambia los suyos (404 si es de otro cliente).",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: ContratoCambio } }, required: true },
    },
    responses: { 200: json(Contrato, "El contrato ya cambiado."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");
    const actual = await db.leaseContract.findUnique({ where: { id } });
    const orgId = await espacioParaEscribirEn(quien, actual?.organizationId);
    if (!actual) throw new ErrorApi(404, "No se encontró lo que buscas.");

    const fusion = { ...contratoComoEntrada(actual), ...cambio };
    await exigirReferencias(orgId, fusion.propiedadId, fusion.arrendatarioId);
    exigirContratoValido(fusion);
    await db.leaseContract.update({ where: { id }, data: datosDeContrato(fusion, persona.usuario.id, plazoEnMeses) });
    return c.json(contratoParaDueno(await leerContrato(id), hoyChile()), 200);
  },
);

cartera.openapi(
  createRoute({
    method: "post",
    path: "/contratos/{id}/renovar",
    tags: ["Cartera"],
    summary: "Renovar un contrato",
    description:
      "Corre el término del contrato un plazo más (siempre hasta una fecha que no sea anterior a hoy). No se puede renovar un contrato con salida fijada ni uno que aún no empieza.",
    request: { params: ParamId },
    responses: { 200: json(Contrato, "El contrato renovado."), ...errores(401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const actual = await db.leaseContract.findUnique({ where: { id } });
    await espacioParaEscribirEn(quien, actual?.organizationId);
    if (!actual) throw new ErrorApi(404, "No se encontró lo que buscas.");
    const hoy = hoyChile();
    if (actual.fechaSalida || estadoContrato(actual, hoy) === "POR_EMPEZAR") {
      throw new ErrorApi(409, "Este contrato no se puede renovar (tiene salida o aún no empieza).");
    }
    await db.leaseContract.update({
      where: { id },
      data: { fechaTermino: terminoRenovado(actual, hoy), modificadoPorId: persona.usuario.id },
    });
    return c.json(contratoParaDueno(await leerContrato(id), hoy), 200);
  },
);

cartera.openapi(
  createRoute({
    method: "post",
    path: "/contratos/{id}/terminar",
    tags: ["Cartera"],
    summary: "Terminar un contrato",
    description:
      "Fija el día de salida del arrendatario. Los cobros sin pago de los meses posteriores a la salida se borran; los que tienen pagos no se tocan.",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: ContratoTerminar } }, required: true },
    },
    responses: { 200: json(Contrato, "El contrato con su salida."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const { fechaSalida } = c.req.valid("json");
    const actual = await db.leaseContract.findUnique({ where: { id } });
    const orgId = await espacioParaEscribirEn(quien, actual?.organizationId);
    if (!actual) throw new ErrorApi(404, "No se encontró lo que buscas.");
    if (actual.fechaSalida) {
      throw new ErrorApi(409, "El contrato ya tiene fecha de salida; corrígela cambiando el contrato.");
    }
    const salida = deFechaISO(fechaSalida);
    if (salida < actual.fechaInicio) {
      throw new ErrorApi(400, "Revisa los campos.", { fechaSalida: "La salida no puede ser anterior al inicio." });
    }
    await db.$transaction([
      db.leaseContract.update({ where: { id }, data: { fechaSalida: salida, modificadoPorId: persona.usuario.id } }),
      db.rentCharge.deleteMany({
        where: { contractId: id, organizationId: orgId, periodo: { gt: fechaSalida.slice(0, 7) }, ...SIN_PAGO },
      }),
    ]);
    return c.json(contratoParaDueno(await leerContrato(id), hoyChile()), 200);
  },
);

cartera.openapi(
  createRoute({
    method: "post",
    path: "/contratos/{id}/reajustar",
    tags: ["Cartera"],
    summary: "Reajustar el arriendo de un contrato",
    description:
      "Sube el arriendo en un porcentaje, desde una fecha efectiva. Cambia el monto del contrato y el de sus cobros sin pago desde ese mes. Solo contratos vigentes que tengan reajuste.",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: ContratoReajustar } }, required: true },
    },
    responses: { 200: json(Contrato, "El contrato con el arriendo nuevo."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const { porcentaje, fechaEfectiva } = c.req.valid("json");
    const actual = await db.leaseContract.findUnique({ where: { id } });
    const orgId = await espacioParaEscribirEn(quien, actual?.organizationId);
    if (!actual) throw new ErrorApi(404, "No se encontró lo que buscas.");
    if (!actual.aplicaReajuste) throw new ErrorApi(409, "Este contrato no tiene reajuste.");
    if (!estaVigente(actual, hoyChile())) throw new ErrorApi(409, "Solo se puede reajustar un contrato vigente.");
    const efectiva = deFechaISO(fechaEfectiva);
    if (efectiva < actual.fechaInicio) {
      throw new ErrorApi(400, "Revisa los campos.", {
        fechaEfectiva: "La fecha no puede ser anterior al inicio del contrato.",
      });
    }
    const mes = fechaEfectiva.slice(0, 7);
    if (mes > mesActual()) {
      const desde = new Date(`${mes}-01T00:00:00.000Z`);
      throw new ErrorApi(400, "Revisa los campos.", {
        fechaEfectiva: `Se puede aplicar desde el ${formatDate(desde)}: antes, los cobros que aún no se generan saldrían con el monto nuevo.`,
      });
    }
    const nuevo = new Prisma.Decimal(montoReajustado(Number(actual.monto), porcentaje, actual.moneda));
    await db.$transaction([
      db.leaseContract.update({
        where: { id },
        data: { monto: nuevo, ultimoReajuste: efectiva, modificadoPorId: persona.usuario.id },
      }),
      db.rentCharge.updateMany({
        where: { contractId: id, organizationId: orgId, periodo: { gte: mes }, ...SIN_PAGO },
        data: { montoEsperado: nuevo },
      }),
    ]);
    return c.json(contratoParaDueno(await leerContrato(id), hoyChile()), 200);
  },
);

// ---------------------------------------------------------------------------
// Resumen del mes y valor de la cartera
// ---------------------------------------------------------------------------

cartera.openapi(
  createRoute({
    method: "get",
    path: "/cartera/resumen",
    tags: ["Cartera"],
    summary: "Resumen del mes del dueño",
    description:
      "El inicio del dueño autónomo en una llamada: arriendos del mes pagados de cuántos, lo esperado y lo cobrado, las cuentas (gastos) del mes y los cobros atrasados de hoy. Sin `mes`, el mes de hoy. El equipo ve todos los clientes (o uno, con `clienteId`).",
    request: { query: ResumenConsulta },
    responses: { 200: json(ResumenCartera, "Cómo va el mes."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const mes = q.mes ?? mesActual();
    const hoy = hoyChile();
    const organizationId = { in: await espaciosQueLee(quien, q.clienteId) };
    const camposCobro = { estado: true, montoEsperado: true, montoPagado: true, moneda: true } as const;
    const [cobrosDelMes, gastosDelMes, atrasados] = await Promise.all([
      db.rentCharge.findMany({ where: { organizationId, periodo: mes }, select: camposCobro }),
      db.propertyBill.findMany({
        where: { organizationId, periodo: mes },
        select: { estado: true, monto: true, moneda: true },
      }),
      db.rentCharge.findMany({ where: { organizationId, ...whereEstadoCobro("ATRASADO", hoy) }, select: camposCobro }),
    ]);
    const r = resumenDelMes({ cobrosDelMes, gastosDelMes, atrasados });
    return c.json(
      {
        mes,
        arriendos: {
          pagados: r.arriendos.pagados,
          total: r.arriendos.total,
          esperado: montosParaDueno(r.arriendos.esperado),
          cobrado: montosParaDueno(r.arriendos.cobrado),
        },
        gastos: {
          cantidad: r.gastos.cantidad,
          sinPagar: r.gastos.sinPagar,
          total: montosParaDueno(r.gastos.total),
        },
        atrasados: { cantidad: r.atrasados.cantidad, saldo: montosParaDueno(r.atrasados.saldo) },
      },
      200,
    );
  },
);

cartera.openapi(
  createRoute({
    method: "get",
    path: "/cartera/valor",
    tags: ["Cartera"],
    summary: "Valor de la cartera y deudas por cliente",
    description:
      "Lo que vale la cartera (valor comercial de las propiedades), lo que se debe (deuda hipotecaria) y lo que queda, por cliente y en total, todo en pesos. Lo que está en UF se pasa con el valor de la UF más reciente; si falta, lo que no se pudo convertir se cuenta aparte. Un dueño ve solo su cliente.",
    request: { query: ValorConsulta },
    responses: { 200: json(ValorCartera, "El valor de la cartera."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const espacios = await espaciosQueLee(quien, q.clienteId);
    const [uf, propiedades, clientes] = await Promise.all([
      getLatestUf(),
      db.property.findMany({
        where: { organizationId: { in: espacios } },
        select: {
          organizationId: true,
          valorComercial: true,
          valorComercialMoneda: true,
          deudaSaldo: true,
          deudaMoneda: true,
        },
      }),
      db.organizacion.findMany({
        where: { id: { in: espacios } },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      }),
    ]);
    const filas = valorPorCliente(propiedades, uf);
    const total = totalDelValor(filas);
    const clp = (n: number) => aMonto(n, "CLP");
    return c.json(
      {
        valorUf: uf === null ? null : String(uf),
        moneda: "CLP" as const,
        clientes: clientes.flatMap((cliente) => {
          const f = filas.find((x) => x.clienteId === cliente.id);
          if (!f) return [];
          return [
            {
              clienteId: cliente.id,
              clienteNombre: cliente.nombre,
              propiedades: f.propiedades,
              propiedadesSinValor: f.propiedadesSinValor,
              valorComercial: clp(f.valorComercial),
              deuda: clp(f.deuda),
              valorNeto: clp(f.valorNeto),
              deudasSinConvertir: f.deudasSinConvertir,
            },
          ];
        }),
        total: {
          propiedades: total.propiedades,
          valorComercial: clp(total.valorComercial),
          deuda: clp(total.deuda),
          valorNeto: clp(total.valorNeto),
        },
      },
      200,
    );
  },
);

// Cobros, gastos, contribuciones y movimientos: en sus archivos, montados aquí.
cartera.route("/", cobros);
cartera.route("/", cuentas);
