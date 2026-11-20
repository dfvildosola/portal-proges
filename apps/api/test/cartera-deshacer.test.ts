// Deshacer un pago mal anotado y borrar un cobro mal generado (pieza G), y las cuentas de plata
// con Decimal (saldo del cobro y reajuste). Los endpoints, con dos clientes y una llave.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { db, Prisma } from "@proges/db";
import { montoReajustado } from "../src/dominio/cartera/contratos";
import { esParcial, saldoCobro, saldoCobroDecimal } from "../src/dominio/cartera/cobros";
import { crearEscenario, type Escenario } from "./ayuda";

let e: Escenario;
let contratoA: string;
let contratoB: string;

before(async () => {
  e = await crearEscenario();
  const crear = async (org: string, nombre: string) => {
    const propiedad = await db.property.create({
      data: { organizationId: org, tipo: "DEPARTAMENTO", direccion: "Agustinas 715", comuna: "Santiago", region: "RM" },
    });
    const tenant = await db.tenant.create({ data: { organizationId: org, nombre, rut: `${nombre.length}-9` } });
    return (
      await db.leaseContract.create({
        data: {
          organizationId: org,
          propertyId: propiedad.id,
          tenantId: tenant.id,
          monto: "500000",
          fechaInicio: new Date("2026-01-01T00:00:00Z"),
          fechaTermino: new Date("2026-12-31T00:00:00Z"),
          diaPago: 5,
          plazoMeses: 12,
        },
      })
    ).id;
  };
  contratoA = await crear(e.ids.clienteA, "Ana Pérez");
  contratoB = await crear(e.ids.clienteB, "Beto");
});
after(() => e.limpiar());

const cobroDe = (contractId: string, organizationId: string, periodo: string, extra: Prisma.RentChargeUncheckedCreateInput | object = {}) =>
  db.rentCharge.create({
    data: {
      organizationId,
      contractId,
      periodo,
      montoEsperado: "500000",
      fechaVencimiento: new Date(`${periodo}-05T00:00:00Z`),
      ...extra,
    },
  });

test("deshacer el pago: vuelve a pendiente (y atrasado si ya venció) sin pagos; B y la llave no pueden", async () => {
  const cobro = await cobroDe(contratoA, e.ids.clienteA, "2026-03", {
    estado: "PAGADO",
    fechaPago: new Date("2026-03-04T00:00:00Z"),
    montoPagado: "500000",
    interesMora: "1000",
    notas: "transferencia",
  });
  const ruta = `/v1/cobros/${cobro.id}/anular-pago`;
  assert.equal((await e.pedir("llaveA", "POST", ruta)).estado, 403);
  assert.equal((await e.pedir("clienteB", "POST", ruta)).estado, 404);
  assert.equal((await e.pedir("anonimo", "POST", ruta)).estado, 401);
  assert.equal((await db.rentCharge.findUniqueOrThrow({ where: { id: cobro.id } })).estado, "PAGADO");

  const r = await e.pedir("clienteA", "POST", ruta);
  assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
  assert.equal(r.cuerpo.estado, "ATRASADO"); // marzo de 2026 ya venció
  assert.equal(r.cuerpo.fechaPago, null);
  assert.equal(r.cuerpo.montoPagado, null);
  assert.equal(r.cuerpo.interesMora, null);
  assert.equal(r.cuerpo.saldo.valor, "500000");
  assert.equal(r.cuerpo.parcial, false);
  assert.equal(r.cuerpo.notas, "transferencia");

  // Sin pagos no hay nada que deshacer.
  assert.equal((await e.pedir("clienteA", "POST", ruta)).estado, 409);
  // Y se puede volver a pagar.
  const otra = await e.pedir("clienteA", "POST", `/v1/cobros/${cobro.id}/pago`, {
    fechaPago: "2026-03-10",
    montoPagado: { valor: "500000", moneda: "CLP" },
  });
  assert.equal(otra.cuerpo.estado, "PAGADO");
});

test("deshacer un abono parcial también lo limpia; un cobro que no venció queda pendiente", async () => {
  const cobro = await cobroDe(contratoA, e.ids.clienteA, "2099-01", {
    fechaPago: new Date("2026-11-01T00:00:00Z"),
    montoPagado: "100000",
  });
  const r = await e.pedir("equipo", "POST", `/v1/cobros/${cobro.id}/anular-pago`);
  assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
  assert.equal(r.cuerpo.estado, "PENDIENTE");
  assert.equal(r.cuerpo.montoPagado, null);
});

test("borrar un cobro: solo sin pagos, y el cliente B y la llave no pueden", async () => {
  const sinPago = await cobroDe(contratoA, e.ids.clienteA, "2026-04");
  const pagado = await cobroDe(contratoA, e.ids.clienteA, "2026-05", { estado: "PAGADO", montoPagado: "500000", fechaPago: new Date("2026-05-04T00:00:00Z") });
  const ajeno = await cobroDe(contratoB, e.ids.clienteB, "2026-04");

  assert.equal((await e.pedir("llaveA", "DELETE", `/v1/cobros/${sinPago.id}`)).estado, 403);
  assert.equal((await e.pedir("clienteB", "DELETE", `/v1/cobros/${sinPago.id}`)).estado, 404);
  assert.equal((await e.pedir("clienteA", "DELETE", `/v1/cobros/${ajeno.id}`)).estado, 404);
  assert.ok(await db.rentCharge.findUnique({ where: { id: sinPago.id } }));
  assert.ok(await db.rentCharge.findUnique({ where: { id: ajeno.id } }));

  // Con pagos no se borra: primero se deshace el pago.
  const conPago = await e.pedir("clienteA", "DELETE", `/v1/cobros/${pagado.id}`);
  assert.equal(conPago.estado, 409);
  assert.match(conPago.cuerpo.error.mensaje, /deshaz el pago/);
  assert.ok(await db.rentCharge.findUnique({ where: { id: pagado.id } }));

  assert.equal((await e.pedir("clienteA", "DELETE", `/v1/cobros/${sinPago.id}`)).estado, 204);
  assert.equal(await db.rentCharge.findUnique({ where: { id: sinPago.id } }), null);
  assert.equal((await e.pedir("clienteA", "DELETE", `/v1/cobros/${sinPago.id}`)).estado, 404);

  await e.pedir("clienteA", "POST", `/v1/cobros/${pagado.id}/anular-pago`);
  assert.equal((await e.pedir("clienteA", "DELETE", `/v1/cobros/${pagado.id}`)).estado, 204);
});

// ---------------------------------------------------------------------------
// Plata con Decimal
// ---------------------------------------------------------------------------

test("saldo del cobro: Decimal, sin basura de float", () => {
  const uf = (esperado: string, pagado: string | null) => ({ montoEsperado: new Prisma.Decimal(esperado), montoPagado: pagado === null ? null : new Prisma.Decimal(pagado), moneda: "UF" as const });
  // Con float, 15,5 − 10,2 da 5.300000000000001.
  assert.equal(saldoCobroDecimal(uf("15.5", "10.2")).toFixed(), "5.3");
  assert.equal(saldoCobro(uf("15.5", "10.2")), 5.3);
  // Pagado exacto: el saldo es cero de verdad, no 5.5e-17.
  assert.ok(saldoCobroDecimal(uf("0.3", "0.3")).isZero());
  // Nunca negativo, y el CLP sale entero.
  assert.equal(saldoCobroDecimal(uf("10", "12")).toFixed(), "0");
  assert.equal(saldoCobroDecimal({ montoEsperado: "500000.40", montoPagado: null, moneda: "CLP" }).toFixed(), "500000");
  // Parcial: abonos sin llegar al total.
  assert.equal(esParcial({ estado: "PENDIENTE", montoPagado: new Prisma.Decimal("0.01") }), true);
  assert.equal(esParcial({ estado: "PENDIENTE", montoPagado: null }), false);
});

test("reajuste: Decimal, redondeado a los decimales de su moneda", () => {
  const m = (monto: string, pct: number, moneda: "CLP" | "UF") => montoReajustado(new Prisma.Decimal(monto), pct, moneda).toFixed();
  assert.equal(m("500000", 5, "CLP"), "525000");
  assert.equal(m("333333", 3.3, "CLP"), "344333"); // 344332,989 → entero
  assert.equal(m("100", 4.5, "UF"), "104.5");
  assert.equal(m("10.05", 5, "UF"), "10.55"); // 10,5525 → 2 decimales
  assert.equal(m("1.005", 100, "UF"), "2.01"); // 2,01 exacto (con float, 1.005 * 2 y round daban 2)
});
