// Casos hechos a mano para las cuentas de la administración de arriendos (src/lib/administracion.ts).
// Se corre con: npx tsx scripts/probar-administracion.ts
//
// Todo es puro: no usa la base ni la sesión, y «hoy» es una fecha fija. Tiene que dar lo mismo con
// TZ=UTC y con TZ=America/Santiago.
//
// La administración de prueba va del 10 de marzo al 20 de septiembre de 2026 con comisión del 8 %.
// Los meses se cuentan enteros (sin prorratear): marzo y septiembre cuentan completos.

import assert from "node:assert/strict";
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
} from "../src/lib/administracion";

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

let casos = 0;
function caso(nombre: string, prueba: () => void) {
  prueba();
  casos++;
  console.log(`ok  ${nombre}`);
}

// ---- Qué meses están dentro ----

caso("un mes está dentro si toca el rango desde..hasta, comparado por mes", () => {
  assert.equal(mesEnAdministracion(ADM, "2026-02"), false); // antes del mes de inicio
  assert.equal(mesEnAdministracion(ADM, "2026-03"), true); // el mes de inicio cuenta entero (empezó el 10)
  assert.equal(mesEnAdministracion(ADM, "2026-09"), true); // el mes de término cuenta entero (terminó el 20)
  assert.equal(mesEnAdministracion(ADM, "2026-10"), false); // después del término
});

caso("una administración sin fecha de término sigue abierta hacia adelante", () => {
  const abierta: AdministracionDato = { ...ADM, hasta: null };
  assert.equal(mesEnAdministracion(abierta, "2030-01"), true);
  assert.equal(mesEnAdministracion(abierta, "2026-02"), false);
});

caso("vigente hoy: sin término, con término que no pasa, o con término ya pasado", () => {
  assert.equal(administracionVigente({ ...ADM, hasta: null }, HOY), true);
  assert.equal(administracionVigente({ ...ADM, hasta: dia(2026, 7, 10) }, HOY), true); // termina hoy: aún vigente
  assert.equal(administracionVigente({ ...ADM, hasta: dia(2026, 7, 9) }, HOY), false);
});

// ---- Estado de cada mes ----

caso("mes pagado: estado PAGADO y comisión del 8 % de 500.000 = 40.000", () => {
  const mes = cuentaDelMes(ADM, COBROS, "2026-04", HOY);
  assert.equal(mes.estado, "PAGADO");
  assert.deepEqual(mes.esperado, [{ moneda: "CLP", monto: 500_000 }]);
  assert.deepEqual(mes.comision, [{ moneda: "CLP", monto: 40_000 }]);
});

caso("mes atrasado: un cobro pendiente que ya venció", () => {
  const mes = cuentaDelMes(ADM, COBROS, "2026-05", HOY);
  assert.equal(mes.estado, "ATRASADO");
});

caso("mes atrasado: un cobro marcado ATRASADO a mano", () => {
  assert.equal(cuentaDelMes(ADM, COBROS, "2026-06", HOY).estado, "ATRASADO");
});

caso("mes atrasado cobra la comisión igual (regla: es lo que Proges factura por el mes, se haya pagado o no)", () => {
  assert.deepEqual(cuentaDelMes(ADM, COBROS, "2026-05", HOY).comision, [{ moneda: "CLP", monto: 40_000 }]);
});

caso("mes por cobrar: pendiente que aún no vence", () => {
  assert.equal(cuentaDelMes(ADM, COBROS, "2026-07", HOY).estado, "POR_COBRAR");
});

caso("un cobro que vence hoy mismo todavía no está atrasado; al día siguiente sí", () => {
  const venceHoy = cobro("2026-07", "PENDIENTE", HOY);
  assert.equal(estadoDelCobro(venceHoy, HOY), "POR_COBRAR");
  assert.equal(estadoDelCobro(venceHoy, dia(2026, 7, 11)), "ATRASADO");
});

caso("mes dentro de la administración sin cobro generado: SIN_COBRO, sin comisión", () => {
  const mes = cuentaDelMes(ADM, COBROS, "2026-08", HOY);
  assert.equal(mes.estado, "SIN_COBRO");
  assert.deepEqual(mes.comision, []);
});

caso("mes fuera de desde/hasta: FUERA, sin comisión, aunque haya un cobro pagado ese mes", () => {
  for (const periodo of ["2026-02", "2026-10"]) {
    const mes = cuentaDelMes(ADM, COBROS, periodo, HOY);
    assert.equal(mes.estado, "FUERA", periodo);
    assert.deepEqual(mes.esperado, [], periodo);
    assert.deepEqual(mes.comision, [], periodo);
  }
});

caso("el mes de inicio y el de término cuentan enteros (sin prorrateo)", () => {
  assert.deepEqual(cuentaDelMes(ADM, COBROS, "2026-03", HOY).comision, [{ moneda: "CLP", monto: 40_000 }]);
  assert.deepEqual(cuentaDelMes(ADM, COBROS, "2026-09", HOY).comision, [{ moneda: "CLP", monto: 40_000 }]);
});

caso("la ficha: los últimos 6 meses terminando en julio dan los estados esperados", () => {
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

caso("la comisión del mes de julio (la de «este mes») es el 8 % del arriendo del mes", () => {
  assert.deepEqual(cuentaDelMes(ADM, COBROS, "2026-07", HOY).comision, [{ moneda: "CLP", monto: 40_000 }]);
});

// ---- Comisión: moneda y redondeo ----

caso("comisión en CLP se redondea al peso: 123.456 → 9.876 y 123.469 → 9.878", () => {
  assert.equal(comisionDelCobro(ADM, cobro("2026-04", "PAGADO", HOY, 123_456)), 9_876);
  assert.equal(comisionDelCobro(ADM, cobro("2026-04", "PAGADO", HOY, 123_469)), 9_878);
});

caso("comisión en UF se queda con 2 decimales: 25,5 UF → 2,04 y 12,345 UF → 0,99", () => {
  const uf = (monto: number): CobroDato => ({ ...cobro("2026-04", "PAGADO", HOY), montoEsperado: monto, moneda: "UF" });
  assert.equal(comisionDelCobro(ADM, uf(25.5)), 2.04);
  assert.equal(comisionDelCobro(ADM, uf(12.345)), 0.99);
});

caso("comisión de un cobro fuera de la administración: 0", () => {
  assert.equal(comisionDelCobro(ADM, cobro("2026-10", "PAGADO", HOY)), 0);
});

caso("un mes con dos cobros (CLP y UF) no mezcla monedas, y basta uno atrasado para atrasar el mes", () => {
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

caso("cobros atrasados: solo los de meses dentro de la administración, en orden de mes", () => {
  const conViejo = [cobro("2026-02", "PENDIENTE", dia(2026, 2, 5)), ...COBROS]; // febrero está fuera
  assert.deepEqual(
    cobrosAtrasados(ADM, conViejo, HOY).map((c) => c.periodo),
    ["2026-05", "2026-06"],
  );
});

caso("comisiones por cliente: suma por cliente y por moneda", () => {
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

caso("sumarPorMoneda deja CLP primero y no inventa monedas", () => {
  assert.deepEqual(
    sumarPorMoneda([{ moneda: "UF", monto: 1 }, { moneda: "CLP", monto: 3 }, { moneda: "UF", monto: 0.5 }]),
    [{ moneda: "CLP", monto: 3 }, { moneda: "UF", monto: 1.5 }],
  );
  assert.deepEqual(sumarPorMoneda([]), []);
});

// ---- Fechas y textos ----

caso("periodoDe usa la fecha civil (medianoche UTC) y ultimosMeses cruza el año", () => {
  assert.equal(periodoDe(dia(2026, 1, 1)), "2026-01");
  assert.equal(periodoDe(dia(2026, 12, 31)), "2026-12");
  assert.deepEqual(ultimosMeses("2026-02", 4), ["2025-11", "2025-12", "2026-01", "2026-02"]);
});

caso("textoMontos: sin montos es «—», y dos monedas se separan con « + »", () => {
  assert.equal(textoMontos([]), "—");
  const texto = textoMontos([{ moneda: "CLP", monto: 40_000 }, { moneda: "UF", monto: 2.04 }]);
  assert.match(texto, /40\.000 CLP \+ 2,04 UF/);
});

console.log(`${casos} casos, todos pasan`);
