// Pruebas de la cartera del dueño (pieza G): contratos, arrendatarios, cobros, gastos,
// contribuciones, movimientos, administración de arriendos y el resumen del mes.
//
// Primero van las cuentas puras (las de legado/scripts/probar-administracion.ts, que ahora son
// pruebas de verdad) y después los endpoints, con dos clientes y una llave: el cliente A ve y
// edita lo suyo, el B no ve nada de A (404), y la llave de A lee pero no escribe (403).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { administracion } from "../src/rutas/administracion";
import { cartera } from "../src/rutas/cartera";
import {
  administracionVigente,
  cobrosAtrasados,
  comisionDelCobro,
  comisionesPorCliente,
  cuentaDeMeses,
  cuentaDelMes,
  estadoDelCobro,
  mesEnAdministracion,
  periodoDe,
  sumarPorMoneda,
  textoMontos,
  ultimosMeses,
  type AdministracionDato,
  type CobroDato,
} from "../src/dominio/cartera/administracion";
import { clavesInternas, crearEscenario, type Escenario } from "./ayuda";

// ---------------------------------------------------------------------------
// Cuentas puras de la administración (antes: legado/scripts/probar-administracion.ts)
// ---------------------------------------------------------------------------

// La administración de prueba va del 10 de marzo al 20 de septiembre de 2026 con comisión del 8 %.
// Los meses se cuentan enteros (sin prorratear): marzo y septiembre cuentan completos.
const dia = (anio: number, mes: number, d: number) => new Date(Date.UTC(anio, mes - 1, d));

// Un «hoy» fijo: 10 de julio de 2026.
const HOY = dia(2026, 7, 10);

const ADM: AdministracionDato = { desde: dia(2026, 3, 10), hasta: dia(2026, 9, 20), comisionPct: 8 };

function cobro(periodo: string, estado: CobroDato["estado"], vence: Date, monto = 500_000): CobroDato {
  return { periodo, montoEsperado: monto, moneda: "CLP", fechaVencimiento: vence, estado };
}

// Febrero y octubre están fuera de la administración; agosto no tiene cobro generado.
const COBROS: CobroDato[] = [
  cobro("2026-02", "PAGADO", dia(2026, 2, 5)),
  cobro("2026-03", "PAGADO", dia(2026, 3, 5)),
  cobro("2026-04", "PAGADO", dia(2026, 4, 5)),
  cobro("2026-05", "PENDIENTE", dia(2026, 5, 5)), // venció y nadie lo pagó
  cobro("2026-06", "ATRASADO", dia(2026, 6, 5)), // marcado a mano
  cobro("2026-07", "PENDIENTE", dia(2026, 7, 12)), // vence en dos días
  cobro("2026-09", "PENDIENTE", dia(2026, 9, 5)),
  cobro("2026-10", "PAGADO", dia(2026, 10, 5)),
];


// ---- Qué meses están dentro ----

test("un mes está dentro si toca el rango desde..hasta, comparado por mes", () => {
  assert.equal(mesEnAdministracion(ADM, "2026-02"), false); // antes del mes de inicio
  assert.equal(mesEnAdministracion(ADM, "2026-03"), true); // el mes de inicio cuenta entero (empezó el 10)
  assert.equal(mesEnAdministracion(ADM, "2026-09"), true); // el mes de término cuenta entero (terminó el 20)
  assert.equal(mesEnAdministracion(ADM, "2026-10"), false); // después del término
});

test("una administración sin fecha de término sigue abierta hacia adelante", () => {
  const abierta: AdministracionDato = { ...ADM, hasta: null };
  assert.equal(mesEnAdministracion(abierta, "2030-01"), true);
  assert.equal(mesEnAdministracion(abierta, "2026-02"), false);
});

test("vigente hoy: sin término, con término que no pasa, o con término ya pasado", () => {
  assert.equal(administracionVigente({ ...ADM, hasta: null }, HOY), true);
  assert.equal(administracionVigente({ ...ADM, hasta: dia(2026, 7, 10) }, HOY), true); // termina hoy: aún vigente
  assert.equal(administracionVigente({ ...ADM, hasta: dia(2026, 7, 9) }, HOY), false);
});

// ---- Estado de cada mes ----

test("mes pagado: estado PAGADO y comisión del 8 % de 500.000 = 40.000", () => {
  const mes = cuentaDelMes(ADM, COBROS, "2026-04", HOY);
  assert.equal(mes.estado, "PAGADO");
  assert.deepEqual(mes.esperado, [{ moneda: "CLP", monto: 500_000 }]);
  assert.deepEqual(mes.comision, [{ moneda: "CLP", monto: 40_000 }]);
});

test("mes atrasado: un cobro pendiente que ya venció", () => {
  const mes = cuentaDelMes(ADM, COBROS, "2026-05", HOY);
  assert.equal(mes.estado, "ATRASADO");
});

test("mes atrasado: un cobro marcado ATRASADO a mano", () => {
  assert.equal(cuentaDelMes(ADM, COBROS, "2026-06", HOY).estado, "ATRASADO");
});

test("mes atrasado cobra la comisión igual (regla: es lo que Proges factura por el mes, se haya pagado o no)", () => {
  assert.deepEqual(cuentaDelMes(ADM, COBROS, "2026-05", HOY).comision, [{ moneda: "CLP", monto: 40_000 }]);
});

test("mes por cobrar: pendiente que aún no vence", () => {
  assert.equal(cuentaDelMes(ADM, COBROS, "2026-07", HOY).estado, "POR_COBRAR");
});

test("un cobro que vence hoy mismo todavía no está atrasado; al día siguiente sí", () => {
  const venceHoy = cobro("2026-07", "PENDIENTE", HOY);
  assert.equal(estadoDelCobro(venceHoy, HOY), "POR_COBRAR");
  assert.equal(estadoDelCobro(venceHoy, dia(2026, 7, 11)), "ATRASADO");
});

test("mes dentro de la administración sin cobro generado: SIN_COBRO, sin comisión", () => {
  const mes = cuentaDelMes(ADM, COBROS, "2026-08", HOY);
  assert.equal(mes.estado, "SIN_COBRO");
  assert.deepEqual(mes.comision, []);
});

test("mes fuera de desde/hasta: FUERA, sin comisión, aunque haya un cobro pagado ese mes", () => {
  for (const periodo of ["2026-02", "2026-10"]) {
    const mes = cuentaDelMes(ADM, COBROS, periodo, HOY);
    assert.equal(mes.estado, "FUERA", periodo);
    assert.deepEqual(mes.esperado, [], periodo);
    assert.deepEqual(mes.comision, [], periodo);
  }
});

test("el mes de inicio y el de término cuentan enteros (sin prorrateo)", () => {
  assert.deepEqual(cuentaDelMes(ADM, COBROS, "2026-03", HOY).comision, [{ moneda: "CLP", monto: 40_000 }]);
  assert.deepEqual(cuentaDelMes(ADM, COBROS, "2026-09", HOY).comision, [{ moneda: "CLP", monto: 40_000 }]);
});

test("la ficha: los últimos 6 meses terminando en julio dan los estados esperados", () => {
  const meses = cuentaDeMeses(ADM, COBROS, ultimosMeses("2026-07", 6), HOY);
  assert.deepEqual(
    meses.map((m) => [m.periodo, m.estado]),
    [
      ["2026-02", "FUERA"],
      ["2026-03", "PAGADO"],
      ["2026-04", "PAGADO"],
      ["2026-05", "ATRASADO"],
      ["2026-06", "ATRASADO"],
      ["2026-07", "POR_COBRAR"],
    ],
  );
});

test("la comisión del mes de julio (la de «este mes») es el 8 % del arriendo del mes", () => {
  assert.deepEqual(cuentaDelMes(ADM, COBROS, "2026-07", HOY).comision, [{ moneda: "CLP", monto: 40_000 }]);
});

// ---- Comisión: moneda y redondeo ----

test("comisión en CLP se redondea al peso: 123.456 → 9.876 y 123.469 → 9.878", () => {
  assert.equal(comisionDelCobro(ADM, cobro("2026-04", "PAGADO", HOY, 123_456)), 9_876);
  assert.equal(comisionDelCobro(ADM, cobro("2026-04", "PAGADO", HOY, 123_469)), 9_878);
});

test("comisión en UF se queda con 2 decimales: 25,5 UF → 2,04 y 12,345 UF → 0,99", () => {
  const uf = (monto: number): CobroDato => ({ ...cobro("2026-04", "PAGADO", HOY), montoEsperado: monto, moneda: "UF" });
  assert.equal(comisionDelCobro(ADM, uf(25.5)), 2.04);
  assert.equal(comisionDelCobro(ADM, uf(12.345)), 0.99);
});

test("comisión de un cobro fuera de la administración: 0", () => {
  assert.equal(comisionDelCobro(ADM, cobro("2026-10", "PAGADO", HOY)), 0);
});

test("un mes con dos cobros (CLP y UF) no mezcla monedas, y basta uno atrasado para atrasar el mes", () => {
  const mixtos: CobroDato[] = [
    cobro("2026-04", "PAGADO", dia(2026, 4, 5), 500_000),
    { periodo: "2026-04", montoEsperado: 10, moneda: "UF", fechaVencimiento: dia(2026, 4, 5), estado: "PENDIENTE" },
  ];
  const mes = cuentaDelMes(ADM, mixtos, "2026-04", HOY);
  assert.equal(mes.estado, "ATRASADO");
  assert.deepEqual(mes.esperado, [
    { moneda: "CLP", monto: 500_000 },
    { moneda: "UF", monto: 10 },
  ]);
  assert.deepEqual(mes.comision, [
    { moneda: "CLP", monto: 40_000 },
    { moneda: "UF", monto: 0.8 },
  ]);
});

// ---- Atrasados y totales ----

test("cobros atrasados: solo los de meses dentro de la administración, en orden de mes", () => {
  const conViejo = [cobro("2026-02", "PENDIENTE", dia(2026, 2, 5)), ...COBROS]; // febrero está fuera
  assert.deepEqual(
    cobrosAtrasados(ADM, conViejo, HOY).map((c) => c.periodo),
    ["2026-05", "2026-06"],
  );
});

test("comisiones por cliente: suma por cliente y por moneda", () => {
  const totales = comisionesPorCliente([
    { clienteId: "a", comision: [{ moneda: "CLP", monto: 40_000 }] },
    { clienteId: "b", comision: [{ moneda: "UF", monto: 2.04 }] },
    { clienteId: "a", comision: [{ moneda: "CLP", monto: 25_000 }, { moneda: "UF", monto: 1.5 }] },
  ]);
  assert.deepEqual(totales, [
    { clienteId: "a", total: [{ moneda: "CLP", monto: 65_000 }, { moneda: "UF", monto: 1.5 }] },
    { clienteId: "b", total: [{ moneda: "UF", monto: 2.04 }] },
  ]);
});

test("sumarPorMoneda deja CLP primero y no inventa monedas", () => {
  assert.deepEqual(
    sumarPorMoneda([{ moneda: "UF", monto: 1 }, { moneda: "CLP", monto: 3 }, { moneda: "UF", monto: 0.5 }]),
    [{ moneda: "CLP", monto: 3 }, { moneda: "UF", monto: 1.5 }],
  );
  assert.deepEqual(sumarPorMoneda([]), []);
});

// ---- Fechas y textos ----

test("periodoDe usa la fecha civil (medianoche UTC) y ultimosMeses cruza el año", () => {
  assert.equal(periodoDe(dia(2026, 1, 1)), "2026-01");
  assert.equal(periodoDe(dia(2026, 12, 31)), "2026-12");
  assert.deepEqual(ultimosMeses("2026-02", 4), ["2025-11", "2025-12", "2026-01", "2026-02"]);
});

test("textoMontos: sin montos es «—», y dos monedas se separan con « + »", () => {
  assert.equal(textoMontos([]), "—");
  const texto = textoMontos([{ moneda: "CLP", monto: 40_000 }, { moneda: "UF", monto: 2.04 }]);
  assert.match(texto, /40\.000 CLP \+ 2,04 UF/);
});


// ---------------------------------------------------------------------------
// Los endpoints
// ---------------------------------------------------------------------------

let e: Escenario;
let propA: string;
let propB: string;
let tenantA: string;
let tenantB: string;
let contratoA: string;
let contratoB: string;

const contratoBase = (propiedadId: string, arrendatarioId: string) => ({
  propiedadId,
  arrendatarioId,
  monto: { valor: "500000", moneda: "CLP" },
  fechaInicio: "2026-01-01",
  fechaTermino: "2026-12-31",
  diaPago: 5,
});

async function nuevaPropiedad(organizationId: string, extra: object = {}) {
  return db.property.create({
    data: { organizationId, tipo: "DEPARTAMENTO", direccion: "Agustinas 715", comuna: "Santiago", region: "RM", ...extra },
  });
}

before(async () => {
  e = await crearEscenario();
  propA = (await nuevaPropiedad(e.ids.clienteA)).id;
  propB = (await nuevaPropiedad(e.ids.clienteB)).id;
  tenantA = (await db.tenant.create({ data: { organizationId: e.ids.clienteA, nombre: "Ana Pérez", rut: "1-9" } })).id;
  tenantB = (await db.tenant.create({ data: { organizationId: e.ids.clienteB, nombre: "Beto Díaz", rut: "2-7" } })).id;
  const crear = async (org: string, propertyId: string, tenantId: string) =>
    (
      await db.leaseContract.create({
        data: {
          organizationId: org,
          propertyId,
          tenantId,
          monto: "500000",
          fechaInicio: new Date("2026-01-01T00:00:00Z"),
          fechaTermino: new Date("2026-12-31T00:00:00Z"),
          diaPago: 5,
          plazoMeses: 12,
        },
      })
    ).id;
  contratoA = await crear(e.ids.clienteA, propA, tenantA);
  contratoB = await crear(e.ids.clienteB, propB, tenantB);
});
after(() => e.limpiar());

test("contratos: A ve lo suyo, B no lo ve (404), la llave de A lo ve sin datos internos", async () => {
  const a = await e.pedir("clienteA", "GET", "/v1/contratos");
  assert.equal(a.estado, 200);
  assert.deepEqual(a.cuerpo.items.map((i: { id: string }) => i.id), [contratoA]);
  assert.equal(a.cuerpo.items[0].arrendatarioNombre, "Ana Pérez");
  assert.equal(a.cuerpo.items[0].estado, "VIGENTE");

  assert.equal((await e.pedir("clienteB", "GET", `/v1/contratos/${contratoA}`)).estado, 404);
  const deB = await e.pedir("clienteB", "GET", "/v1/contratos");
  assert.deepEqual(deB.cuerpo.items.map((i: { id: string }) => i.id), [contratoB]);

  const llave = await e.pedir("llaveA", "GET", `/v1/contratos/${contratoA}`);
  assert.equal(llave.estado, 200);
  assert.deepEqual(clavesInternas(llave.cuerpo), []);
  // El equipo puede filtrar por cliente.
  const equipo = await e.pedir("equipo", "GET", `/v1/contratos?clienteId=${e.ids.clienteA}`);
  assert.deepEqual(equipo.cuerpo.items.map((i: { id: string }) => i.id), [contratoA]);
});

test("un dueño edita su contrato pero no el de otro cliente (404); una llave no escribe (403)", async () => {
  const propio = await e.pedir("clienteA", "PATCH", `/v1/contratos/${contratoA}`, { monto: { valor: "520000", moneda: "CLP" } });
  assert.equal(propio.estado, 200);
  assert.equal(propio.cuerpo.monto.valor, "520000");
  // Cambiar el monto no tocó lo demás (el reajuste no vuelve a «ninguno» por un default).
  assert.equal(propio.cuerpo.diasAviso, 60);
  const fila = await db.leaseContract.findUniqueOrThrow({ where: { id: contratoA } });
  assert.equal(fila.modificadoPorId, e.ids.usuarioA);

  assert.equal(
    (await e.pedir("clienteB", "PATCH", `/v1/contratos/${contratoA}`, { diaPago: 10 })).estado,
    404,
  );
  assert.equal(
    (await e.pedir("llaveA", "PATCH", `/v1/contratos/${contratoA}`, { diaPago: 10 })).estado,
    403,
  );
  // El cambio se revisa junto con lo que ya tenía: el término no puede quedar antes del inicio.
  const malo = await e.pedir("clienteA", "PATCH", `/v1/contratos/${contratoA}`, { fechaTermino: "2025-01-01" });
  assert.equal(malo.estado, 400);
  assert.ok(malo.cuerpo.error.campos.fechaTermino);
  // Y un contrato no puede apuntar al arrendatario de otro cliente.
  const ajeno = await e.pedir("clienteA", "PATCH", `/v1/contratos/${contratoA}`, { arrendatarioId: tenantB });
  assert.equal(ajeno.estado, 400);
});

test("crear un contrato: nace en el cliente de su propiedad", async () => {
  const p2 = (await nuevaPropiedad(e.ids.clienteA, { direccion: "Monjitas 550" })).id;
  const ok = await e.pedir("clienteA", "POST", "/v1/contratos", contratoBase(p2, tenantA));
  assert.equal(ok.estado, 201);
  assert.equal(ok.cuerpo.clienteId, e.ids.clienteA);
  assert.equal(ok.cuerpo.plazoMeses, 12);
  assert.equal(ok.cuerpo.reajusteTipo, "NINGUNO");
  assert.equal((await e.pedir("clienteA", "POST", "/v1/contratos", contratoBase(propB, tenantA))).estado, 404);
  assert.equal((await e.pedir("llaveA", "POST", "/v1/contratos", contratoBase(p2, tenantA))).estado, 403);
  // Sin reajuste no hay frecuencia; con reajuste, es obligatoria.
  const sinFrecuencia = await e.pedir("clienteA", "POST", "/v1/contratos", { ...contratoBase(p2, tenantA), reajusteTipo: "IPC" });
  assert.equal(sinFrecuencia.estado, 400);
  assert.ok(sinFrecuencia.cuerpo.error.campos.reajusteFrecuenciaMeses);
});

test("arrendatarios: el dueño crea en lo suyo; el equipo debe elegir cliente", async () => {
  const nuevo = { nombre: "Carla Soto", rut: "3-5", email: "carla@correo.cl" };
  const a = await e.pedir("clienteA", "POST", "/v1/arrendatarios", { ...nuevo, clienteId: e.ids.clienteB });
  assert.equal(a.estado, 201);
  assert.equal(a.cuerpo.clienteId, e.ids.clienteA); // lo que manda la web se ignora
  assert.equal((await e.pedir("equipo", "POST", "/v1/arrendatarios", nuevo)).estado, 400);
  const equipo = await e.pedir("equipo", "POST", "/v1/arrendatarios", { ...nuevo, clienteId: e.ids.clienteB });
  assert.equal(equipo.estado, 201);
  assert.equal(equipo.cuerpo.clienteId, e.ids.clienteB);
  assert.equal((await e.pedir("llaveA", "POST", "/v1/arrendatarios", nuevo)).estado, 403);

  assert.equal((await e.pedir("clienteB", "PATCH", `/v1/arrendatarios/${tenantA}`, { nombre: "X" })).estado, 404);
  const cambio = await e.pedir("clienteA", "PATCH", `/v1/arrendatarios/${tenantA}`, { telefono: "+56 9 1111 2222" });
  assert.equal(cambio.estado, 200);
  assert.equal(cambio.cuerpo.telefono, "+56 9 1111 2222");
  assert.equal(cambio.cuerpo.nombre, "Ana Pérez");
  const lista = await e.pedir("clienteB", "GET", "/v1/arrendatarios");
  assert.ok(lista.cuerpo.items.every((t: { clienteId: string }) => t.clienteId === e.ids.clienteB));
});

test("cobros: generar el mes, anotar un pago parcial y luego el resto", async () => {
  // Un solo contrato vigente del cliente A cubre mayo de 2026 (el creado en la prueba anterior
  // también: por eso se cuenta lo que genera, no un número fijo).
  const gen = await e.pedir("clienteA", "POST", "/v1/cobros/generar", { mes: "2026-05" });
  assert.equal(gen.estado, 200);
  assert.ok(gen.cuerpo.creados >= 1);
  const otra = await e.pedir("clienteA", "POST", "/v1/cobros/generar", { mes: "2026-05" });
  assert.equal(otra.cuerpo.creados, 0); // se puede pedir otra vez sin duplicar
  assert.equal(otra.cuerpo.yaExistian, gen.cuerpo.creados);

  const lista = await e.pedir("clienteA", "GET", `/v1/cobros?mes=2026-05&propiedadId=${propA}`);
  assert.equal(lista.cuerpo.items.length, 1);
  const cobro = lista.cuerpo.items[0];
  assert.equal(cobro.montoEsperado.valor, "520000");
  assert.equal(cobro.fechaVencimiento, "2026-05-05");
  assert.equal(cobro.estado, "ATRASADO"); // ya venció y nadie lo pagó

  assert.equal((await e.pedir("clienteB", "GET", `/v1/cobros/${cobro.id}`)).estado, 404);
  assert.equal((await e.pedir("llaveA", "GET", `/v1/cobros/${cobro.id}`)).estado, 200);

  const abono = { fechaPago: "2026-05-20", montoPagado: { valor: "200000", moneda: "CLP" } };
  assert.equal((await e.pedir("llaveA", "POST", `/v1/cobros/${cobro.id}/pago`, abono)).estado, 403);
  assert.equal((await e.pedir("clienteB", "POST", `/v1/cobros/${cobro.id}/pago`, abono)).estado, 404);
  const enUf = await e.pedir("clienteA", "POST", `/v1/cobros/${cobro.id}/pago`, { ...abono, montoPagado: { valor: "1", moneda: "UF" } });
  assert.equal(enUf.estado, 400);

  const parcial = await e.pedir("clienteA", "POST", `/v1/cobros/${cobro.id}/pago`, abono);
  assert.equal(parcial.estado, 200);
  assert.equal(parcial.cuerpo.parcial, true);
  assert.equal(parcial.cuerpo.saldo.valor, "320000");
  assert.notEqual(parcial.cuerpo.estado, "PAGADO");

  const resto = await e.pedir("equipo", "POST", `/v1/cobros/${cobro.id}/pago`, {
    fechaPago: "2026-05-28",
    montoPagado: { valor: "320000", moneda: "CLP" },
    notas: "transferencia",
  });
  assert.equal(resto.estado, 200);
  assert.equal(resto.cuerpo.estado, "PAGADO");
  assert.equal(resto.cuerpo.saldo.valor, "0");
  assert.equal(resto.cuerpo.montoPagado.valor, "520000");
  assert.equal((await e.pedir("clienteA", "POST", `/v1/cobros/${cobro.id}/pago`, abono)).estado, 409);
});

test("cobros atrasados: los sin pagar que ya vencieron, de cualquier mes", async () => {
  const b = await db.rentCharge.create({
    data: {
      organizationId: e.ids.clienteB,
      contractId: contratoB,
      periodo: "2026-03",
      montoEsperado: "500000",
      fechaVencimiento: new Date("2026-03-05T00:00:00Z"),
    },
  });
  await db.rentCharge.create({
    data: {
      organizationId: e.ids.clienteB,
      contractId: contratoB,
      periodo: "2999-01",
      montoEsperado: "500000",
      fechaVencimiento: new Date("2999-01-05T00:00:00Z"),
    },
  });
  const r = await e.pedir("clienteB", "GET", "/v1/cobros/atrasados");
  assert.equal(r.estado, 200);
  assert.deepEqual(r.cuerpo.items.map((i: { id: string }) => i.id), [b.id]);
  assert.equal(r.cuerpo.items[0].estado, "ATRASADO");
  const porEstado = await e.pedir("clienteB", "GET", "/v1/cobros?estado=PENDIENTE");
  assert.deepEqual(porEstado.cuerpo.items.map((i: { periodo: string }) => i.periodo), ["2999-01"]);
});

test("ciclo del contrato: renovar, reajustar y terminar", async () => {
  const p = (await nuevaPropiedad(e.ids.clienteA, { direccion: "Ciclo 1" })).id;
  const creado = await e.pedir("clienteA", "POST", "/v1/contratos", {
    ...contratoBase(p, tenantA),
    reajusteTipo: "IPC",
    reajusteFrecuenciaMeses: 6,
    renovacionAutomatica: false,
    fechaInicio: "2026-01-01",
    fechaTermino: "2026-06-30",
    plazoMeses: 6,
  });
  assert.equal(creado.estado, 201);
  const id = creado.cuerpo.id;
  assert.equal(creado.cuerpo.estado, "VENCIDO");
  assert.equal(creado.cuerpo.proximoReajuste, "2026-07-01");

  // Renovar corre el término un plazo (hasta una fecha que no sea anterior a hoy).
  const renovado = await e.pedir("clienteA", "POST", `/v1/contratos/${id}/renovar`);
  assert.equal(renovado.estado, 200);
  assert.ok(renovado.cuerpo.fechaTermino > "2026-06-30");
  assert.equal(renovado.cuerpo.estado, "VIGENTE");
  assert.equal((await e.pedir("llaveA", "POST", `/v1/contratos/${id}/renovar`)).estado, 403);
  assert.equal((await e.pedir("clienteB", "POST", `/v1/contratos/${id}/renovar`)).estado, 404);

  // Reajustar: sube el arriendo del contrato y el de sus cobros sin pago.
  await db.rentCharge.create({
    data: {
      organizationId: e.ids.clienteA,
      contractId: id,
      periodo: "2026-11",
      montoEsperado: "500000",
      fechaVencimiento: new Date("2026-11-05T00:00:00Z"),
    },
  });
  const futuro = await e.pedir("clienteA", "POST", `/v1/contratos/${id}/reajustar`, { porcentaje: 4, fechaEfectiva: "2999-01-01" });
  assert.equal(futuro.estado, 400);
  const reajustado = await e.pedir("clienteA", "POST", `/v1/contratos/${id}/reajustar`, { porcentaje: 4, fechaEfectiva: "2026-11-01" });
  assert.equal(reajustado.estado, 200);
  assert.equal(reajustado.cuerpo.monto.valor, "520000");
  assert.equal(reajustado.cuerpo.ultimoReajuste, "2026-11-01");
  const cobro = await db.rentCharge.findFirstOrThrow({ where: { contractId: id, periodo: "2026-11" } });
  assert.equal(cobro.montoEsperado.toFixed(), "520000");

  // Terminar: fija la salida y borra los cobros sin pago de los meses posteriores.
  await db.rentCharge.create({
    data: {
      organizationId: e.ids.clienteA,
      contractId: id,
      periodo: "2027-01",
      montoEsperado: "520000",
      fechaVencimiento: new Date("2027-01-05T00:00:00Z"),
    },
  });
  const terminado = await e.pedir("clienteA", "POST", `/v1/contratos/${id}/terminar`, { fechaSalida: "2026-12-15" });
  assert.equal(terminado.estado, 200);
  assert.equal(terminado.cuerpo.fechaSalida, "2026-12-15");
  assert.equal(await db.rentCharge.count({ where: { contractId: id, periodo: "2027-01" } }), 0);
  assert.equal(await db.rentCharge.count({ where: { contractId: id, periodo: "2026-11" } }), 1);
  assert.equal((await e.pedir("clienteA", "POST", `/v1/contratos/${id}/terminar`, { fechaSalida: "2026-12-20" })).estado, 409);
});

test("gastos: anotar guarda quién lo anotó; se marca pagado; una llave no escribe", async () => {
  const cuerpo = {
    propiedadId: propA,
    tipo: "GASTO_COMUN",
    periodo: "2026-11",
    monto: { valor: "85000", moneda: "CLP" },
    fechaVencimiento: "2026-11-10",
  };
  assert.equal((await e.pedir("llaveA", "POST", "/v1/gastos", cuerpo)).estado, 403);
  assert.equal((await e.pedir("clienteB", "POST", "/v1/gastos", cuerpo)).estado, 404);

  const creado = await e.pedir("clienteA", "POST", "/v1/gastos", cuerpo);
  assert.equal(creado.estado, 201);
  assert.equal(creado.cuerpo.estado, "PENDIENTE");
  const fila = await db.propertyBill.findUniqueOrThrow({ where: { id: creado.cuerpo.id } });
  assert.equal(fila.anotadoPorId, e.ids.usuarioA);
  assert.equal(fila.organizationId, e.ids.clienteA);
  assert.deepEqual(clavesInternas(creado.cuerpo), []);
  assert.equal("anotadoPorId" in creado.cuerpo, false);

  // El equipo también anota, y queda su nombre, no el del dueño.
  const delEquipo = await e.pedir("equipo", "POST", "/v1/gastos", { ...cuerpo, tipo: "LUZ" });
  assert.equal(delEquipo.estado, 201);
  assert.equal((await db.propertyBill.findUniqueOrThrow({ where: { id: delEquipo.cuerpo.id } })).anotadoPorId, e.ids.equipo);

  const sinFecha = await e.pedir("clienteA", "PATCH", `/v1/gastos/${creado.cuerpo.id}`, { estado: "PAGADA" });
  assert.equal(sinFecha.estado, 400);
  const pagado = await e.pedir("clienteA", "PATCH", `/v1/gastos/${creado.cuerpo.id}`, { estado: "PAGADA", fechaPago: "2026-11-08" });
  assert.equal(pagado.estado, 200);
  assert.equal(pagado.cuerpo.fechaPago, "2026-11-08");
  assert.equal(pagado.cuerpo.monto.valor, "85000");

  const lista = await e.pedir("clienteA", "GET", "/v1/gastos?periodo=2026-11&estado=PAGADA");
  assert.deepEqual(lista.cuerpo.items.map((i: { id: string }) => i.id), [creado.cuerpo.id]);
  assert.equal((await e.pedir("clienteB", "GET", "/v1/gastos")).cuerpo.items.length, 0);

  assert.equal((await e.pedir("llaveA", "DELETE", `/v1/gastos/${creado.cuerpo.id}`)).estado, 403);
  assert.equal((await e.pedir("clienteB", "DELETE", `/v1/gastos/${creado.cuerpo.id}`)).estado, 404);
  assert.equal((await e.pedir("clienteA", "DELETE", `/v1/gastos/${creado.cuerpo.id}`)).estado, 204);
  assert.equal(await db.propertyBill.count({ where: { id: creado.cuerpo.id } }), 0);
});

test("contribuciones: vencimiento del SII, cuota repetida, generar el año y anotar quién", async () => {
  const cuerpo = { propiedadId: propA, anio: 2026, cuota: 2, monto: { valor: "120000", moneda: "CLP" } };
  const creada = await e.pedir("clienteA", "POST", "/v1/contribuciones", cuerpo);
  assert.equal(creada.estado, 201);
  assert.equal(creada.cuerpo.fechaVencimiento, "2026-06-30");
  assert.equal((await db.propertyTax.findUniqueOrThrow({ where: { id: creada.cuerpo.id } })).anotadoPorId, e.ids.usuarioA);
  assert.equal((await e.pedir("clienteA", "POST", "/v1/contribuciones", cuerpo)).estado, 409);
  assert.equal((await e.pedir("llaveA", "POST", "/v1/contribuciones", { ...cuerpo, cuota: 3 })).estado, 403);
  assert.equal(
    (await e.pedir("clienteA", "POST", "/v1/contribuciones", { ...cuerpo, cuota: 3, monto: { valor: "1", moneda: "UF" } })).estado,
    400,
  );

  const generadas = await e.pedir("clienteA", "POST", `/v1/propiedades/${propA}/contribuciones/generar`, { anio: 2026 });
  assert.equal(generadas.estado, 200);
  assert.deepEqual(generadas.cuerpo.map((x: { cuota: number }) => x.cuota), [1, 2, 3, 4]);
  // La que ya existía no se pisó.
  assert.equal(generadas.cuerpo[1].monto.valor, "120000");

  const pagada = await e.pedir("clienteA", "PATCH", `/v1/contribuciones/${creada.cuerpo.id}`, { estado: "PAGADA", fechaPago: "2026-06-20" });
  assert.equal(pagada.estado, 200);
  assert.equal(pagada.cuerpo.estado, "PAGADA");
  assert.equal((await e.pedir("clienteB", "PATCH", `/v1/contribuciones/${creada.cuerpo.id}`, { estado: "PENDIENTE" })).estado, 404);
  const lista = await e.pedir("llaveA", "GET", "/v1/contribuciones?anio=2026&estado=PAGADA");
  assert.equal(lista.estado, 200);
  assert.deepEqual(lista.cuerpo.items.map((i: { id: string }) => i.id), [creada.cuerpo.id]);
  assert.equal((await e.pedir("clienteA", "DELETE", `/v1/contribuciones/${creada.cuerpo.id}`)).estado, 204);
});

test("movimientos: se anotan en lo propio y se filtran por fecha", async () => {
  const base = { propiedadId: propA, tipo: "GASTO", categoria: "REPARACION", monto: { valor: "30000", moneda: "CLP" } };
  assert.equal((await e.pedir("llaveA", "POST", "/v1/movimientos", { ...base, fecha: "2026-03-10" })).estado, 403);
  assert.equal((await e.pedir("clienteB", "POST", "/v1/movimientos", { ...base, fecha: "2026-03-10" })).estado, 404);
  assert.equal(
    (await e.pedir("clienteA", "POST", "/v1/movimientos", { ...base, monto: { valor: "0", moneda: "CLP" }, fecha: "2026-03-10" })).estado,
    400,
  );
  assert.equal((await e.pedir("clienteA", "POST", "/v1/movimientos", { ...base, fecha: "2026-03-10", descripcion: "Llave de agua" })).estado, 201);
  assert.equal((await e.pedir("clienteA", "POST", "/v1/movimientos", { ...base, fecha: "2026-08-02" })).estado, 201);
  const marzo = await e.pedir("clienteA", "GET", "/v1/movimientos?desde=2026-03-01&hasta=2026-03-31");
  assert.equal(marzo.cuerpo.items.length, 1);
  assert.equal(marzo.cuerpo.items[0].descripcion, "Llave de agua");
  assert.equal((await e.pedir("clienteB", "GET", "/v1/movimientos")).cuerpo.items.length, 0);
});

test("administración: solo el equipo; la comisión cuadra en un mes pagado, uno atrasado y uno fuera", async () => {
  const p = (await nuevaPropiedad(e.ids.clienteA, { direccion: "Administrada 1" })).id;
  const k = (
    await db.leaseContract.create({
      data: {
        organizationId: e.ids.clienteA,
        propertyId: p,
        tenantId: tenantA,
        monto: "500000",
        fechaInicio: new Date("2026-01-01T00:00:00Z"),
        fechaTermino: new Date("2026-12-31T00:00:00Z"),
        diaPago: 5,
        plazoMeses: 12,
      },
    })
  ).id;
  const cobro = (periodo: string, estado: "PAGADO" | "PENDIENTE") =>
    db.rentCharge.create({
      data: {
        organizationId: e.ids.clienteA,
        contractId: k,
        periodo,
        montoEsperado: "500000",
        estado,
        fechaVencimiento: new Date(`${periodo}-05T00:00:00Z`),
      },
    });
  await cobro("2026-02", "PAGADO"); // antes de la administración
  await cobro("2026-04", "PAGADO"); // pagado
  await cobro("2026-05", "PENDIENTE"); // venció y nadie lo pagó

  const cuerpo = { desde: "2026-03-10", comisionPct: 8 };
  assert.equal((await e.pedir("clienteA", "POST", `/v1/propiedades/${p}/administracion`, cuerpo)).estado, 403);
  assert.equal((await e.pedir("llaveA", "POST", `/v1/propiedades/${p}/administracion`, cuerpo)).estado, 403);
  const creada = await e.pedir("equipo", "POST", `/v1/propiedades/${p}/administracion`, cuerpo);
  assert.equal(creada.estado, 201);
  assert.equal(creada.cuerpo.vigente, true);
  assert.equal(creada.cuerpo.comisionPct, 8);
  assert.equal((await e.pedir("equipo", "POST", `/v1/propiedades/${p}/administracion`, { desde: "2026-06-01", comisionPct: 5 })).estado, 409);

  const termina = await e.pedir("equipo", "PATCH", `/v1/propiedades/${p}/administracion`, { hasta: "2026-09-20" });
  assert.equal(termina.estado, 200);
  assert.equal(termina.cuerpo.hasta, "2026-09-20");
  assert.equal((await e.pedir("clienteA", "PATCH", `/v1/propiedades/${p}/administracion`, { hasta: "2026-09-21" })).estado, 403);
  assert.equal((await e.pedir("equipo", "PATCH", `/v1/propiedades/${p}/administracion`, { hasta: "2026-01-01" })).estado, 400);

  const delMes = async (mes: string, quien: "clienteA" | "clienteB" | "llaveA" = "clienteA") =>
    (await e.pedir(quien, "GET", `/v1/administracion/comision?mes=${mes}`)).cuerpo;
  const pagado = await delMes("2026-04");
  const fila = pagado.propiedades.find((x: { propiedadId: string }) => x.propiedadId === p);
  assert.equal(fila.estado, "PAGADO");
  assert.deepEqual(fila.comision, [{ valor: "40000", moneda: "CLP" }]);
  assert.deepEqual(pagado.totalesPorCliente[0].total, [{ valor: "40000", moneda: "CLP" }]);

  const atrasado = (await delMes("2026-05")).propiedades.find((x: { propiedadId: string }) => x.propiedadId === p);
  assert.equal(atrasado.estado, "ATRASADO");
  assert.deepEqual(atrasado.comision, [{ valor: "40000", moneda: "CLP" }]); // se cobra igual

  // Fuera del período (febrero, antes de marzo; octubre, después de septiembre): sin comisión.
  for (const mes of ["2026-02", "2026-10"]) {
    const r = await delMes(mes);
    assert.equal(r.propiedades.some((x: { propiedadId: string }) => x.propiedadId === p), false, mes);
  }
  // Marzo y septiembre cuentan enteros; agosto no tiene cobro generado.
  const agosto = (await delMes("2026-08")).propiedades.find((x: { propiedadId: string }) => x.propiedadId === p);
  assert.equal(agosto.estado, "SIN_COBRO");

  // Cada cual ve lo suyo: B no ve la comisión de A y la llave de A sí.
  assert.equal((await delMes("2026-04", "clienteB")).propiedades.length, 0);
  assert.equal((await delMes("2026-04", "llaveA")).propiedades.length, 1);
  const historial = await e.pedir("clienteA", "GET", `/v1/propiedades/${p}/administracion`);
  assert.equal(historial.cuerpo.length, 1);
  assert.equal((await e.pedir("clienteB", "GET", `/v1/propiedades/${p}/administracion`)).estado, 404);
});

test("resumen del mes: cuenta bien los pagados, el cobrado, los gastos y los atrasados", async () => {
  // Cliente B (autónomo) con datos propios y un mes fijo, así las cifras son exactas.
  const p2 = (await nuevaPropiedad(e.ids.clienteB, { direccion: "Segunda B" })).id;
  const k2 = await db.leaseContract.create({
    data: {
      organizationId: e.ids.clienteB,
      propertyId: p2,
      tenantId: tenantB,
      monto: "300000",
      fechaInicio: new Date("2026-01-01T00:00:00Z"),
      fechaTermino: new Date("2026-12-31T00:00:00Z"),
      diaPago: 10,
      plazoMeses: 12,
    },
  });
  const cobro = (contractId: string, estado: "PAGADO" | "PENDIENTE", monto: string, pagado: string | null) =>
    db.rentCharge.create({
      data: {
        organizationId: e.ids.clienteB,
        contractId,
        periodo: "2026-07",
        montoEsperado: monto,
        montoPagado: pagado,
        estado,
        fechaPago: pagado ? new Date("2026-07-08T00:00:00Z") : null,
        fechaVencimiento: new Date("2026-07-10T00:00:00Z"),
      },
    });
  await cobro(contratoB, "PAGADO", "500000", "500000");
  await cobro(k2.id, "PENDIENTE", "300000", "100000"); // abonó 100.000 y falta el resto
  await db.propertyBill.create({
    data: {
      organizationId: e.ids.clienteB,
      propertyId: propB,
      tipo: "LUZ",
      periodo: "2026-07",
      monto: "25000",
      fechaVencimiento: new Date("2026-07-15T00:00:00Z"),
    },
  });

  const r = await e.pedir("clienteB", "GET", "/v1/cartera/resumen?mes=2026-07");
  assert.equal(r.estado, 200);
  assert.equal(r.cuerpo.mes, "2026-07");
  assert.equal(r.cuerpo.arriendos.pagados, 1);
  assert.equal(r.cuerpo.arriendos.total, 2);
  assert.deepEqual(r.cuerpo.arriendos.esperado, [{ valor: "800000", moneda: "CLP" }]);
  assert.deepEqual(r.cuerpo.arriendos.cobrado, [{ valor: "600000", moneda: "CLP" }]);
  assert.deepEqual(r.cuerpo.gastos, { cantidad: 1, sinPagar: 1, total: [{ valor: "25000", moneda: "CLP" }] });
  // Atrasados de B: el de julio (200.000 de saldo) y el de marzo de la prueba de atrasados (500.000).
  assert.equal(r.cuerpo.atrasados.cantidad, 2);
  assert.deepEqual(r.cuerpo.atrasados.saldo, [{ valor: "700000", moneda: "CLP" }]);

  // A no ve nada de B, y la llave de A lee lo de A.
  const deA = await e.pedir("clienteA", "GET", "/v1/cartera/resumen?mes=2026-07");
  assert.equal(deA.cuerpo.arriendos.total, 0);
  const llave = await e.pedir("llaveA", "GET", "/v1/cartera/resumen?mes=2026-05");
  assert.equal(llave.estado, 200);
  assert.deepEqual(clavesInternas(llave.cuerpo), []);
  assert.equal((await e.pedir("clienteA", "GET", "/v1/cartera/resumen?mes=julio")).estado, 400);
});

test("valor de la cartera: valor, deuda y neto por cliente, solo del cliente de quien pregunta", async () => {
  await db.property.update({
    where: { id: propA },
    data: { valorComercial: "100000000", deudaSaldo: "40000000", deudaMoneda: "CLP" },
  });
  const r = await e.pedir("clienteA", "GET", "/v1/cartera/valor");
  assert.equal(r.estado, 200);
  assert.equal(r.cuerpo.clientes.length, 1);
  assert.equal(r.cuerpo.clientes[0].clienteId, e.ids.clienteA);
  assert.equal(r.cuerpo.clientes[0].valorComercial.valor, "100000000");
  assert.equal(r.cuerpo.clientes[0].deuda.valor, "40000000");
  assert.equal(r.cuerpo.clientes[0].valorNeto.valor, "60000000");
  assert.equal(r.cuerpo.total.valorNeto.valor, "60000000");
  const deB = await e.pedir("clienteB", "GET", "/v1/cartera/valor");
  assert.equal(deB.cuerpo.clientes.every((c: { clienteId: string }) => c.clienteId === e.ids.clienteB), true);
  const llave = await e.pedir("llaveA", "GET", "/v1/cartera/valor");
  assert.equal(llave.estado, 200);
  assert.deepEqual(clavesInternas(llave.cuerpo), []);
  const equipo = await e.pedir("equipo", "GET", `/v1/cartera/valor?clienteId=${e.ids.clienteA}`);
  assert.equal(equipo.cuerpo.clientes.length, 1);
});

test("sin sesión nada de esto responde; /docs lista las rutas de la cartera", async () => {
  assert.equal((await e.pedir("anonimo", "GET", "/v1/contratos")).estado, 401);
  assert.equal((await e.pedir("anonimo", "GET", "/v1/cartera/resumen")).estado, 401);
  // El /openapi.json de toda la API lo arman todas las piezas juntas; aquí se arma solo con las rutas de la cartera.
  const solo = new OpenAPIHono().route("/v1", cartera).route("/v1", administracion);
  const doc = solo.getOpenAPI31Document({ openapi: "3.1.0", info: { title: "cartera", version: "v1" } });
  const rutas = Object.keys(doc.paths ?? {});
  for (const ruta of ["/v1/contratos", "/v1/cobros/{id}/pago", "/v1/cartera/resumen", "/v1/cartera/valor", "/v1/administracion/comision", "/v1/gastos", "/v1/contribuciones", "/v1/movimientos", "/v1/arrendatarios"]) {
    assert.ok(rutas.includes(ruta), ruta);
  }
  // Cada endpoint dice qué hace, en español.
  for (const operaciones of Object.values(doc.paths ?? {})) {
    for (const op of Object.values(operaciones as Record<string, { description?: string }>)) {
      assert.ok(op.description && op.description.length > 20);
    }
  }
});
