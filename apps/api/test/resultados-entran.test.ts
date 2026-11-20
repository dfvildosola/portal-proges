// «Servicios que entran por semana»: no cuenta los cancelados ni los pedidos rechazados.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { entraAlConteo } from "../src/dominio/resultados/servicios";
import { crearEscenario, type Escenario } from "./ayuda";

let e: Escenario;
let catalogoId: string;

before(async () => {
  e = await crearEscenario();
  catalogoId = (
    await db.servicio.create({
      data: { organizationId: ORG_PROGES, codigo: `ET-W${e.ids.clienteA.slice(-14)}`, familia: "ET", nombre: "Evaluación resultados" },
    })
  ).id;
});
after(async () => {
  await e.limpiar();
  await db.servicio.delete({ where: { id: catalogoId } });
});

test("la regla: un cancelado no entra", () => {
  assert.equal(entraAlConteo({ estado: "ABIERTO" }), true);
  assert.equal(entraAlConteo({ estado: "TERMINADO" }), true);
  assert.equal(entraAlConteo({ estado: "CANCELADO" }), false);
});

test("entran por semana: cuenta el abierto, no el cancelado ni el pedido rechazado", async () => {
  const propiedad = await db.property.create({
    data: { organizationId: e.ids.clienteA, tipo: "CASA", direccion: "Calle resultados", comuna: "X", region: "RM" },
  });
  const nuevo = (estado: "ABIERTO" | "CANCELADO", abiertoEl: string) =>
    db.servicioEnCurso.create({
      data: { organizationId: e.ids.clienteA, propertyId: propiedad.id, servicioId: catalogoId, tipo: "EVALUACION", estado, abiertoEl: new Date(abiertoEl) },
    });
  await nuevo("ABIERTO", "2026-11-04T15:00:00Z");
  await nuevo("CANCELADO", "2026-11-05T15:00:00Z");

  // Un pedido que el equipo rechaza: nace hoy y queda CANCELADO.
  const pedido = await e.pedir("clienteA", "POST", "/v1/pedidos", { tipo: "EVALUACION", descripcion: "Pedido que se rechaza", propiedadId: propiedad.id });
  assert.equal(pedido.estado, 201, JSON.stringify(pedido.cuerpo));
  assert.equal((await e.pedir("equipo", "POST", `/v1/pedidos/${pedido.cuerpo.pedidoId}/rechazar`, { motivo: "No hacemos esto" })).estado, 200);

  const r = await e.pedir("jefatura", "GET", `/v1/resultados?cliente=${e.ids.clienteA}&desde=2026-11-02`);
  assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
  const entran = r.cuerpo.serviciosPorSemana.reduce((suma: number, s: { entran: number }) => suma + s.entran, 0);
  assert.equal(entran, 1);
});
