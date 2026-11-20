// Cuentas puras de la cartera (pieza G): vencimiento de las contribuciones, marcar pagada una cuenta,
// reglas del contrato, resumen del mes y valor de la cartera. No tocan la base.
import assert from "node:assert/strict";
import { test } from "node:test";
import { vencimientoDeCuota } from "../src/dominio/cartera/contribuciones";
import { problemasDelContrato, resolverPago } from "../src/dominio/cartera/entrada";
import { resumenDelMes } from "../src/dominio/cartera/resumen";
import { valorPorCliente } from "../src/dominio/cartera/valor";
import type { ErrorApi } from "../src/errores";

test("contribuciones: cada cuota vence el último día de su mes del calendario del SII", () => {
  assert.equal(vencimientoDeCuota(2026, 1).toISOString().slice(0, 10), "2026-04-30");
  assert.equal(vencimientoDeCuota(2026, 2).toISOString().slice(0, 10), "2026-06-30");
  assert.equal(vencimientoDeCuota(2026, 3).toISOString().slice(0, 10), "2026-09-30");
  assert.equal(vencimientoDeCuota(2026, 4).toISOString().slice(0, 10), "2026-11-30");
  assert.throws(() => vencimientoDeCuota(2026, 5), /no existe/);
});

test("pagar una cuenta: PAGADA pide fecha, PENDIENTE no puede tenerla", () => {
  const pendiente = { estado: "PENDIENTE" as const, fechaPago: null };
  assert.throws(() => resolverPago(pendiente, { estado: "PAGADA" }), (e: ErrorApi) => "fechaPago" in (e.campos ?? {}));
  const pagada = resolverPago(pendiente, { estado: "PAGADA", fechaPago: "2026-11-10" });
  assert.equal(pagada.estado, "PAGADA");
  assert.equal(pagada.fechaPago?.toISOString().slice(0, 10), "2026-11-10");
  // Volver a pendiente borra la fecha.
  assert.deepEqual(resolverPago(pagada, { estado: "PENDIENTE" }), { estado: "PENDIENTE", fechaPago: null });
  assert.throws(() => resolverPago(pendiente, { estado: "PENDIENTE", fechaPago: "2026-11-10" }), (e: ErrorApi) => "fechaPago" in (e.campos ?? {}));
});

test("reglas del contrato: término, reajuste, salida y garantía", () => {
  const bueno = {
    propiedadId: "p",
    arrendatarioId: "t",
    monto: { valor: "500000", moneda: "CLP" as const },
    reajusteTipo: "NINGUNO" as const,
    fechaInicio: "2026-01-01",
    fechaTermino: "2026-12-31",
    renovacionAutomatica: true,
    diasAviso: 60,
    diaPago: 5,
  };
  assert.deepEqual(problemasDelContrato(bueno), {});
  const malo = problemasDelContrato({
    ...bueno,
    monto: { valor: "0", moneda: "CLP" },
    fechaTermino: "2025-12-31",
    reajusteTipo: "IPC",
    fechaSalida: "2025-06-01",
    garantia: { valor: "100", moneda: "UF" },
  });
  assert.deepEqual(Object.keys(malo).sort(), ["fechaSalida", "fechaTermino", "garantia", "monto", "reajusteFrecuenciaMeses"]);
});

test("resumen del mes: cuenta pagados, cobrado, gastos y atrasados sin mezclar monedas", () => {
  const cobro = (estado: "PENDIENTE" | "PAGADO" | "ATRASADO", esperado: number, pagado: number | null, moneda: "CLP" | "UF" = "CLP") => ({
    estado,
    montoEsperado: esperado,
    montoPagado: pagado,
    moneda,
  });
  const r = resumenDelMes({
    cobrosDelMes: [cobro("PAGADO", 500_000, 500_000), cobro("PENDIENTE", 300_000, 100_000), cobro("PENDIENTE", 10, null, "UF")],
    gastosDelMes: [
      { estado: "PAGADA", monto: 40_000, moneda: "CLP" },
      { estado: "PENDIENTE", monto: null, moneda: "CLP" },
    ],
    atrasados: [cobro("ATRASADO", 300_000, 100_000)],
  });
  assert.equal(r.arriendos.pagados, 1);
  assert.equal(r.arriendos.total, 3);
  assert.deepEqual(r.arriendos.esperado, [{ moneda: "CLP", monto: 800_000 }, { moneda: "UF", monto: 10 }]);
  assert.deepEqual(r.arriendos.cobrado, [{ moneda: "CLP", monto: 600_000 }]);
  assert.deepEqual(r.gastos, { cantidad: 2, sinPagar: 1, total: [{ moneda: "CLP", monto: 40_000 }] });
  assert.deepEqual(r.atrasados, { cantidad: 1, saldo: [{ moneda: "CLP", monto: 200_000 }] });
});

test("valor de la cartera: suma por cliente, la deuda cuenta sin valor, y sin UF se avisa", () => {
  const prop = (org: string, valor: number | null, deuda: number | null, moneda: "CLP" | "UF" = "CLP") => ({
    organizationId: org,
    valorComercial: valor === null ? null : String(valor),
    valorComercialMoneda: "CLP" as const,
    deudaSaldo: deuda === null ? null : String(deuda),
    deudaMoneda: moneda,
  });
  const filas = valorPorCliente(
    [prop("a", 100_000_000, 40_000_000), prop("a", null, 5_000_000), prop("b", 50_000_000, 1000, "UF")],
    null,
  );
  const a = filas.find((f) => f.clienteId === "a");
  assert.deepEqual(a, {
    clienteId: "a",
    propiedades: 2,
    propiedadesSinValor: 1,
    valorComercial: 100_000_000,
    deuda: 45_000_000,
    valorNeto: 55_000_000,
    deudasSinConvertir: 0,
  });
  const b = filas.find((f) => f.clienteId === "b");
  assert.equal(b?.deudasSinConvertir, 1); // deuda en UF sin valor de UF: no se suma, se avisa
  assert.equal(b?.deuda, 0);
  // Con UF a 40.000 pesos, 1000 UF son 40 millones.
  const conUf = valorPorCliente([prop("b", 50_000_000, 1000, "UF")], 40_000);
  assert.equal(conUf[0].deuda, 40_000_000);
  assert.equal(conUf[0].valorNeto, 10_000_000);
});

