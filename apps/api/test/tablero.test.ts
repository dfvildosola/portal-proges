// Pruebas del tablero de servicios y del Inicio: a qué columna va cada servicio, las cifras de
// arriba y la próxima tarea de cada tarjeta. Son funciones puras: sin base y con «hoy» fijo.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ServicioTableroItem } from "@proges/contrato";
import { cifrasDelInicio } from "../src/dominio/trabajo/inicio";
import { agruparTablero, conEspera, grupoDelTablero, type FilaDeTablero } from "../src/dominio/trabajo/tablero";
import { proximaTarea } from "../src/dominio/trabajo/tareas";

describe("tablero e inicio", () => {
  const HOY = new Date(Date.UTC(2026, 10, 19)); // 2026-11-19
  const d = (n: number) => new Date(Date.UTC(2026, 10, 19 + n));

  test("tablero: cada servicio cae en un solo grupo", () => {
    // Un servicio ya repartido y confirmado: parte de la regla de siempre.
    const listo = { porRevisar: false, porConfirmar: false, sinResponsable: false };
    assert.equal(grupoDelTablero({ ...listo, esperando: true, tareasPendientes: 3, tareasTotal: 3 }), "esperando");
    assert.equal(grupoDelTablero({ ...listo, esperando: false, tareasPendientes: 1, tareasTotal: 4 }), "nosToca");
    // Con tareas y todas hechas: falta entregarlo.
    assert.equal(grupoDelTablero({ ...listo, esperando: false, tareasPendientes: 0, tareasTotal: 4 }), "porEntregar");
    // Sin ninguna tarea nunca se trabajó: nos toca (no está «por entregar»).
    assert.equal(grupoDelTablero({ ...listo, esperando: false, tareasPendientes: 0, tareasTotal: 0 }), "nosToca");
    // Esperando a alguien gana aunque no tenga tareas.
    assert.equal(grupoDelTablero({ ...listo, esperando: true, tareasPendientes: 0, tareasTotal: 0 }), "esperando");
  });

  test("tablero: «nuevo» es por revisar, por confirmar o sin responsable, y manda sobre lo demás", () => {
    const base = { esperando: true, tareasPendientes: 3, tareasTotal: 3 };
    const listo = { porRevisar: false, porConfirmar: false, sinResponsable: false };
    assert.equal(grupoDelTablero({ ...listo, ...base, porRevisar: true }), "nuevo");
    assert.equal(grupoDelTablero({ ...listo, ...base, porConfirmar: true }), "nuevo");
    assert.equal(grupoDelTablero({ ...listo, ...base, sinResponsable: true }), "nuevo");
    // Aunque no tenga tareas o todas estén hechas.
    assert.equal(grupoDelTablero({ ...listo, esperando: false, tareasPendientes: 0, tareasTotal: 4, sinResponsable: true }), "nuevo");
    assert.equal(grupoDelTablero({ ...listo, esperando: false, tareasPendientes: 0, tareasTotal: 0, porConfirmar: true }), "nuevo");
  });

  // Una fila del tablero de prueba; cada prueba cambia lo que le importa.
  const fila = (id: string, cambios: Partial<ServicioTableroItem> = {}, tareasTotal = 0): FilaDeTablero => ({
    tareasTotal,
    item: {
      id,
      tipo: "VENTA",
      nombre: "x",
      propiedad: { id: "p", direccion: "d", comuna: "c" },
      cliente: { id: "c", nombre: "n" },
      responsable: { id: "r", nombre: "Ana Pérez" },
      esperando: null,
      porRevisar: false,
      porConfirmar: false,
      tareasPendientes: 0,
      proximaTarea: null,
      abiertoEl: "2026-11-01",
      ...cambios,
    },
  });

  test("tablero: agruparTablero manda cada fila a su columna", () => {
    const g = agruparTablero([
      fila("revisar", { porRevisar: true }),
      fila("confirmar", { porConfirmar: true }),
      fila("sin-dueno", { responsable: null, tareasPendientes: 2 }, 2),
      fila("toca", { tareasPendientes: 1 }, 1),
      fila("espera", { esperando: { a: "NOTARIA", detalle: null, desde: "2026-11-01", dias: 3 } }),
      fila("entregar", {}, 2),
    ]);
    assert.deepEqual(g.nuevo.map((i) => i.id).sort(), ["confirmar", "revisar", "sin-dueno"]);
    assert.deepEqual(g.nosToca.map((i) => i.id), ["toca"]);
    assert.deepEqual(g.esperando.map((i) => i.id), ["espera"]);
    assert.deepEqual(g.porEntregar.map((i) => i.id), ["entregar"]);
  });

  test("inicio: «nuevos» es la columna Nuevo y «en curso» solo deja afuera los pedidos sin aceptar", () => {
    const g = agruparTablero([
      fila("revisar", { porRevisar: true }),
      fila("confirmar-1", { porConfirmar: true, responsable: null }),
      fila("confirmar-2", { porConfirmar: true, responsable: null }),
      fila("sin-dueno", { responsable: null }),
      fila("toca", { tareasPendientes: 1 }, 1),
      fila("espera", { esperando: { a: "BANCO", detalle: null, desde: "2026-11-01", dias: 12 } }),
    ]);
    const c = cifrasDelInicio(g, 4);
    assert.equal(c.nuevosSinRepartir, 4);
    assert.equal(c.serviciosEnCurso, 5, "todos menos el pedido todavía no aceptado");
    assert.equal(c.esperando, 1);
    assert.equal(c.esperandoMasDe10Dias, 1);
    assert.equal(c.tareasAtrasadas, 4);
    // El caso real de Diego: 32 por confirmar y sin responsable ya no dicen «0 en curso».
    const todosNuevos = agruparTablero(Array.from({ length: 32 }, (_, i) => fila(`n${i}`, { porConfirmar: true, responsable: null })));
    assert.equal(cifrasDelInicio(todosNuevos, 0).nuevosSinRepartir, 32);
    assert.equal(cifrasDelInicio(todosNuevos, 0).serviciosEnCurso, 32);
  });

  test("inicio: lo que espera a alguien cuenta y sale en «Trabado» aunque siga en Nuevo", () => {
    // Un servicio por confirmar (o sin responsable) al que ya se le puso «esperando a conservador»
    // va a la columna Nuevo, pero su espera no se puede perder: la revisión del 2026-11-20 lo pilló.
    const espera = (dias: number) => ({ a: "CONSERVADOR" as const, detalle: null, desde: "2026-11-01", dias });
    const g = agruparTablero([
      fila("confirmado", { esperando: espera(12) }),
      fila("por-confirmar", { porConfirmar: true, esperando: espera(15) }),
      fila("sin-dueno", { responsable: null, esperando: espera(20) }),
      fila("nuevo-sin-espera", { porConfirmar: true }),
    ]);
    assert.deepEqual(g.esperando.map((i) => i.id), ["confirmado"]);
    assert.deepEqual(conEspera(g).map((i) => i.id), ["sin-dueno", "por-confirmar", "confirmado"], "los que más esperan, primero");
    const c = cifrasDelInicio(g, 0);
    assert.equal(c.esperando, 3);
    assert.equal(c.esperandoMasDe10Dias, 3);
  });

  test("próxima tarea: la que vence primero, las sin fecha al final, y «atrasada» según hoy", () => {
    const t = (que: string, vence: Date | null, creada = 0, hecha = false) => ({
      que,
      vence,
      hechaEl: hecha ? d(-1) : null,
      createdAt: d(creada),
    });
    assert.equal(proximaTarea([], HOY), null);
    // Solo hechas: no hay próxima.
    assert.equal(proximaTarea([t("a", d(1), 0, true)], HOY), null);
    const p = proximaTarea([t("sin fecha", null), t("después", d(5)), t("antes", d(2)), t("hecha", d(-9), 0, true)], HOY);
    assert.deepEqual(p, { que: "antes", vence: d(2), atrasada: false });
    // Vencida ayer: atrasada. Vence hoy: no.
    assert.equal(proximaTarea([t("ayer", d(-1))], HOY)?.atrasada, true);
    assert.equal(proximaTarea([t("hoy", d(0))], HOY)?.atrasada, false);
    // Sin fecha nunca está atrasada; entre dos sin fecha gana la más antigua.
    assert.deepEqual(proximaTarea([t("nueva", null, 3), t("vieja", null, 1)], HOY), { que: "vieja", vence: null, atrasada: false });
    // Una atrasada le gana a una de mañana.
    assert.equal(proximaTarea([t("mañana", d(1)), t("atrasada", d(-3))], HOY)?.que, "atrasada");
  });

  test("tablero: en «esperando» los que llevan más días van primero", () => {
    const espera = (id: string, dias: number) => fila(id, { esperando: { a: "NOTARIA", detalle: null, desde: "2026-11-01", dias } });
    const g = agruparTablero([espera("a", 2), espera("b", 12), espera("c", 5)]);
    assert.deepEqual(
      g.esperando.map((i) => i.id),
      ["b", "c", "a"],
    );
  });
});
