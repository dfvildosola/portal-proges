// Pruebas puras de la orden de Odoo y de los formularios de la obra (pieza E): sin base ni Odoo.
// La orden se arma a mano (recintos, líneas y anticipos), como lo hacía legado/scripts/probar-obra.ts.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { OrdenOdoo } from "../src/integraciones/odoo";
import {
  compararCuenta,
  monedaDeOrden,
  planDeOrden,
  type PartidaExistente,
  type PropiedadParaCuenta,
} from "../src/dominio/obra/orden-odoo";
import { aFechaCivil, archivosDe, esPdf, textoDeTareaCorreccion, validarFotos } from "../src/dominio/obra/formulario";

function linea(id: number, posicion: number, recinto: string, codigo: string, descripcion: string, cantidad: number, unidad: string, precioUnitario: number) {
  return { id, posicion, recinto, codigo, descripcion, detalle: null, cantidad, unidad, precioUnitario };
}
const L101 = linea(101, 0, "Cocina", "RR-001", "Cambio de piso", 12.5, "m2", 40_000);
const L102 = linea(102, 1, "Cocina", "RR-002", "Pintura de muros", 30, "m2", 8_000);
const L103 = linea(103, 2, "Baño", "RR-003", "Cambio de tina", 1, "un", 250_000);
const L104 = linea(104, 3, "Baño", "RR-004", "Grifería", 2, "un", 45_000);
const L105 = linea(105, 3, "Baño", "RR-005", "Espejo", 1, "un", 60_000);

const ORDEN_1: OrdenOdoo = {
  id: 1,
  numero: "S1",
  estado: "sale",
  cliente: "Cliente de prueba",
  total: 20_000_000,
  moneda: "CLP",
  cuentaAnalitica: { codigo: "4390-15", nombre: "Monjitas 550 dpto 15" },
  recintos: ["Cocina", "Baño"],
  lineas: [L101, L102, L103, L104],
  anticipos: [
    { id: 901, descripcion: "Anticipo (ref: FAC 000826 el 12/08/2026)", monto: 300_000 },
    { id: 902, descripcion: "Anticipo (ref: FAC 000840 el 02/09/2026)", monto: 200_000 },
  ],
};
// Lo que hace Odoo entre una traída y otra: sube el precio del piso (101), quita la tina (103) y
// agrega un espejo (105); la grifería (104) sube un lugar.
const DESPUES: OrdenOdoo = {
  ...ORDEN_1,
  lineas: [{ ...L101, precioUnitario: 42_000 }, L102, { ...L104, posicion: 2 }, L105],
};

function comoExistente(odooLineId: number, l = [L101, L102, L103, L104].find((x) => x.id === odooLineId)!): PartidaExistente {
  return {
    id: `p${odooLineId}`,
    odooLineId,
    quitadaEnOdoo: false,
    recinto: l.recinto,
    codigo: l.codigo,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    unidad: l.unidad,
    precioDueno: l.precioUnitario,
    posicion: l.posicion,
  };
}

describe("la orden de Odoo (pura)", () => {
  
  test("recintos, líneas y anticipos (los anticipos no son partidas)", () => {
    const plan = planDeOrden(ORDEN_1, []);
    assert.equal(plan.recintos, 2);
    assert.equal(plan.totalPartidas, 4);
    assert.deepEqual(plan.nuevas.map((p) => p.odooLineId), [101, 102, 103, 104]);
    assert.equal(plan.anticipos, 2);
    assert.equal(plan.facturado, 500_000);
    assert.equal(plan.moneda, "CLP");
  });

  test("lo que viene de Odoo nunca incluye avance, recepción, observación ni maestro", () => {
    const plan = planDeOrden(DESPUES, [comoExistente(101)]);
    const claves = [...plan.nuevas, ...plan.actualizadas.map((a) => a.datos)].flatMap((o) => Object.keys(o));
    for (const prohibida of ["avance", "recepcion", "observacion", "maestroId", "recibidaEl", "recibidaPorId"]) {
      assert.equal(claves.includes(prohibida), false, `el plan trae «${prohibida}»`);
    }
  });

  test("sin cambios en Odoo, volver a traer no hace nada; si cambió: una nueva, dos cambiadas, una quitada", () => {
    const todas = [101, 102, 103, 104].map((n) => comoExistente(n));
    const igual = planDeOrden(ORDEN_1, todas);
    assert.deepEqual([igual.nuevas.length, igual.actualizadas.length, igual.quitadas.length, igual.sinCambios], [0, 0, 0, 4]);
    const cambio = planDeOrden(DESPUES, todas);
    assert.deepEqual(cambio.nuevas.map((p) => p.odooLineId), [105]);
    assert.deepEqual(cambio.actualizadas.map((a) => a.id).sort(), ["p101", "p104"]);
    assert.deepEqual(cambio.quitadas, ["p103"]);
    assert.equal(cambio.sinCambios, 1);
  });

  test("una partida anotada a mano (sin línea de Odoo) nunca se marca quitada", () => {
    const aMano: PartidaExistente = { ...comoExistente(101), id: "a-mano", odooLineId: null };
    assert.deepEqual(planDeOrden(DESPUES, [aMano]).quitadas, []);
  });

  test("una moneda que no es CLP ni UF se rechaza con un error claro", () => {
    assert.equal(monedaDeOrden("UF"), "UF");
    assert.equal(monedaDeOrden(" clp "), "CLP");
    assert.throws(() => monedaDeOrden("USD"), /solo maneja CLP y UF/);
  });

  test("cuenta analítica: calza, es de otra propiedad, no calza con ninguna o no hay cuenta", () => {
    const propia: PropiedadParaCuenta = { id: "p1", direccion: "Monjitas 550 dpto 15", rolSII: "4390-15", odooCuentaAnalitica: null };
    const vecina: PropiedadParaCuenta = { id: "p2", direccion: "Monjitas 550 dpto 16", rolSII: null, odooCuentaAnalitica: "4390-16" };
    const gemela: PropiedadParaCuenta = { id: "p3", direccion: "Monjitas 550 dpto 17", rolSII: null, odooCuentaAnalitica: "4390-15" };
    const cuenta = { codigo: "4390-15", nombre: "x" };
    assert.equal(compararCuenta(cuenta, propia, [propia, vecina]).tipo, "calza");
    const otra = compararCuenta({ codigo: "4390-16", nombre: "x" }, propia, [propia, vecina]);
    assert.equal(otra.tipo, "otra");
    assert.deepEqual(otra.otras.map((o) => o.id), ["p2"]);
    assert.equal(compararCuenta({ codigo: "9999-99", nombre: "x" }, propia, [propia]).tipo, "ninguna");
    assert.equal(compararCuenta(null, propia, [propia]).tipo, "sin-cuenta");
    // Una cuenta que cubre dos unidades calza, pero avisa de la otra para que se confirme.
    const doble = compararCuenta(cuenta, propia, [propia, gemela]);
    assert.equal(doble.tipo, "calza");
    assert.deepEqual(doble.otras.map((o) => o.id), ["p3"]);
  });
});

describe("formularios de la obra (puros)", () => {
  const foto = (tipo: string, bytes = 10) => new File([new Uint8Array(bytes)], "f", { type: tipo });

  test("un PDF de verdad empieza con %PDF; una foto renombrada no", () => {
    assert.equal(esPdf(new TextEncoder().encode("%PDF-1.7 ...")), true);
    assert.equal(esPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), false);
  });

  test("las fotos: máximo 6, solo JPG/PNG/WebP, hasta 4 MB", () => {
    validarFotos([foto("image/jpeg"), foto("image/png"), foto("image/webp")]);
    assert.throws(() => validarFotos(Array.from({ length: 7 }, () => foto("image/jpeg"))), /Máximo 6/);
    assert.throws(() => validarFotos([foto("application/pdf")]), /JPG, PNG o WebP/);
    assert.throws(() => validarFotos([foto("image/jpeg", 4 * 1024 * 1024 + 1)]), /pesa demasiado/);
  });

  test("un archivo solo, varios o ninguno; un archivo vacío no cuenta; un texto no es archivo", () => {
    const uno = foto("image/jpeg");
    assert.deepEqual(archivosDe(uno, "fotos"), [uno]);
    assert.deepEqual(archivosDe([uno, uno], "fotos"), [uno, uno]);
    assert.deepEqual(archivosDe(undefined, "fotos"), []);
    assert.deepEqual(archivosDe(new File([], "vacio"), "fotos"), []);
    assert.throws(() => archivosDe("texto", "fotos"), /archivo/);
  });

  test("la tarea de una observada y las fechas «solo fecha»", () => {
    assert.equal(textoDeTareaCorreccion("Cambio de tina", "Quedó chueca"), "Corregir: Cambio de tina: Quedó chueca");
    assert.ok(textoDeTareaCorreccion("x".repeat(100), "obs").length < 100);
    assert.equal(aFechaCivil("2026-11-19").toISOString(), "2026-11-19T00:00:00.000Z");
  });
});

