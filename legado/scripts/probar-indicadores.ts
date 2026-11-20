// Casos hechos a mano para los indicadores de src/lib/servicios.ts.
// Se corre con: npx tsx scripts/probar-indicadores.ts
// Tiene que dar lo mismo con TZ=UTC y con TZ=America/Santiago.

import assert from "node:assert/strict";
import {
  diasDesdeUltimaRebaja,
  diasPublicada,
  esComercial,
  familiasDelTipo,
  indicadoresComerciales,
  visitasPorSemana,
  visitasUltimaSemana,
} from "../src/lib/servicios";

// Un «hoy» fijo: 2026-11-18 a medianoche UTC (así lo entrega hoyChile()).
const HOY = new Date(Date.UTC(2026, 10, 18));
// Medianoche UTC de HOY menos n días (para visitas, que son «solo fecha»).
const dia = (n: number) => new Date(Date.UTC(2026, 10, 18 - n));
// Un instante al mediodía UTC de HOY menos n días (mediodía cae en el mismo
// día calendario de Chile, haya o no horario de verano).
const instante = (n: number) => new Date(Date.UTC(2026, 10, 18 - n, 12, 0));

let casos = 0;
function caso(nombre: string, prueba: () => void) {
  prueba();
  casos++;
  console.log(`ok  ${nombre}`);
}

// --- días publicada ---------------------------------------------------------

caso("publicada hace 10 días y nunca despublicada: 10", () => {
  assert.equal(diasPublicada([{ fecha: instante(10), publicada: true }], HOY), 10);
});

caso("5 publicada, 3 en «captada», 4 publicada de nuevo: 9", () => {
  const eventos = [
    { fecha: instante(12), publicada: true }, // 5 días
    { fecha: instante(7), publicada: false }, // 3 días, no cuentan
    { fecha: instante(4), publicada: true }, // 4 días hasta hoy
  ];
  assert.equal(diasPublicada(eventos, HOY), 9);
});

caso("eventos fuera de orden dan lo mismo", () => {
  const eventos = [
    { fecha: instante(4), publicada: true },
    { fecha: instante(12), publicada: true },
    { fecha: instante(7), publicada: false },
  ];
  assert.equal(diasPublicada(eventos, HOY), 9);
});

caso("servicio cerrado: cuenta hasta cerradoEl, no hasta hoy", () => {
  const eventos = [{ fecha: instante(10), publicada: true }];
  assert.equal(diasPublicada(eventos, HOY, instante(3)), 7);
});

caso("sin eventos publicados: 0", () => {
  assert.equal(diasPublicada([], HOY), 0);
  assert.equal(diasPublicada([{ fecha: instante(10), publicada: false }], HOY), 0);
});

caso("evento de hoy: 0 días", () => {
  assert.equal(diasPublicada([{ fecha: instante(0), publicada: true }], HOY), 0);
});

caso("evento a las 23:30 de Chile no se corre de día", () => {
  // 2026-11-10 23:30 en Chile (UTC-3 en verano): 02:30 UTC del día 11.
  // El día de Chile es el 10, así que a HOY (18) le faltan 8 días, no 7.
  const tarde = new Date("2026-11-11T02:30:00Z");
  assert.equal(diasPublicada([{ fecha: tarde, publicada: true }], HOY), 8);
  // Y a las 00:30 de Chile del día 11 (03:30 UTC) ya es el día 11: 7 días.
  const madrugada = new Date("2026-11-11T03:30:00Z");
  assert.equal(diasPublicada([{ fecha: madrugada, publicada: true }], HOY), 7);
});

// --- visitas ----------------------------------------------------------------

caso("visitas: borde de los 7 días (hoy-6 entra, hoy-7 no)", () => {
  assert.equal(visitasUltimaSemana([{ fecha: dia(6) }], HOY), 1);
  assert.equal(visitasUltimaSemana([{ fecha: dia(7) }], HOY), 0);
  assert.equal(visitasUltimaSemana([{ fecha: dia(0) }], HOY), 1);
});

caso("visitas: una visita futura no cuenta", () => {
  assert.equal(visitasUltimaSemana([{ fecha: dia(-1) }], HOY), 0);
});

caso("visitas: borde de los 28 días (hoy-27 entra, hoy-28 no)", () => {
  assert.equal(visitasPorSemana([{ fecha: dia(27) }], HOY), 0.3); // 1 ÷ 4 = 0,25 → 0,3
  assert.equal(visitasPorSemana([{ fecha: dia(28) }], HOY), 0);
});

caso("visitas por semana: promedio con un decimal", () => {
  const visitas = [0, 1, 8, 15, 22, 27].map((n) => ({ fecha: dia(n) }));
  assert.equal(visitasPorSemana(visitas, HOY), 1.5); // 6 ÷ 4
});

// --- rebajas ----------------------------------------------------------------

caso("una rebaja seguida de un alza: cuenta desde la rebaja", () => {
  const precios = [
    { fecha: instante(30), anterior: null, nuevo: 100, moneda: "UF" },
    { fecha: instante(20), anterior: 100, nuevo: 90, moneda: "UF" }, // rebaja
    { fecha: instante(5), anterior: 90, nuevo: 95, moneda: "UF" }, // alza
  ];
  assert.equal(diasDesdeUltimaRebaja(precios, HOY), 20);
});

caso("dos rebajas: cuenta desde la última", () => {
  const precios = [
    { fecha: instante(30), anterior: 100, nuevo: 90, moneda: "UF" },
    { fecha: instante(6), anterior: 90, nuevo: 85, moneda: "UF" },
  ];
  assert.equal(diasDesdeUltimaRebaja(precios, HOY), 6);
});

caso("precios sin rebaja: null", () => {
  const precios = [
    { fecha: instante(30), anterior: null, nuevo: 100, moneda: "UF" },
    { fecha: instante(10), anterior: 100, nuevo: 110, moneda: "UF" },
  ];
  assert.equal(diasDesdeUltimaRebaja(precios, HOY), null);
  assert.equal(diasDesdeUltimaRebaja([], HOY), null);
});

caso("pasar de UF a pesos (número menor) no es una rebaja", () => {
  const precios = [
    { fecha: instante(30), anterior: null, nuevo: 5000, moneda: "UF" },
    { fecha: instante(10), anterior: 5000, nuevo: 4000, moneda: "CLP" },
  ];
  assert.equal(diasDesdeUltimaRebaja(precios, HOY), null);
});

caso("el cambio de moneda no tapa una rebaja anterior", () => {
  const precios = [
    { fecha: instante(40), anterior: 5200, nuevo: 5000, moneda: "UF" }, // rebaja
    { fecha: instante(10), anterior: 5000, nuevo: 4000, moneda: "CLP" }, // cambio de moneda
  ];
  assert.equal(diasDesdeUltimaRebaja(precios, HOY), 40);
});

caso("rebaja a las 23:30 de Chile no se corre de día", () => {
  const tarde = new Date("2026-11-11T02:30:00Z"); // día 10 en Chile
  const precios = [{ fecha: tarde, anterior: 100, nuevo: 90, moneda: "UF" }];
  assert.equal(diasDesdeUltimaRebaja(precios, HOY), 8);
});

// --- junto y reglas ---------------------------------------------------------

caso("indicadoresComerciales junta los cuatro", () => {
  const r = indicadoresComerciales({
    eventosDeEtapa: [{ fecha: instante(10), publicada: true }],
    eventosDePrecio: [{ fecha: instante(2), anterior: 100, nuevo: 90, moneda: "UF" }],
    visitas: [{ fecha: dia(1) }, { fecha: dia(10) }],
    hoy: HOY,
  });
  assert.deepEqual(r, {
    diasPublicada: 10,
    visitasUltimaSemana: 1,
    visitasPorSemana: 0.5,
    diasDesdeUltimaRebaja: 2,
  });
});

caso("tipos: comerciales y familias del catálogo", () => {
  assert.equal(esComercial("VENTA"), true);
  assert.equal(esComercial("ARRIENDO"), true);
  assert.equal(esComercial("OBRA"), false);
  assert.deepEqual(familiasDelTipo("EVALUACION"), ["ET", "SC"]);
  assert.deepEqual(familiasDelTipo("ARRIENDO"), ["NV", "SC", "ADMP"]);
  assert.deepEqual(familiasDelTipo("OBRA"), ["RR", "SC"]);
});

console.log(`${casos} casos, todos pasan`);
