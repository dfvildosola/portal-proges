// Confirmar un servicio de la carga inicial: el dueño no lo ve hasta que el equipo lo confirma.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { crearEscenario, type Escenario } from "./ayuda";

let e: Escenario;
let catalogoId: string;
let propiedad: string;

before(async () => {
  e = await crearEscenario();
  const sufijo = e.ids.clienteA.slice(-14);
  catalogoId = (
    await db.servicio.create({
      data: { organizationId: ORG_PROGES, codigo: `ET-C${sufijo}`, familia: "ET", nombre: `Evaluación de prueba ${sufijo}` },
    })
  ).id;
  propiedad = (
    await db.property.create({
      data: { organizationId: e.ids.clienteA, tipo: "CASA", direccion: `Calle C ${sufijo}`, comuna: "Ñuñoa", region: "RM" },
    })
  ).id;
});

after(async () => {
  await e.limpiar();
  await db.servicio.deleteMany({ where: { id: catalogoId } });
});

describe("confirmar un servicio de la carga inicial", () => {
  test("el dueño no lo ve hasta que el equipo lo confirma; el dueño y una llave no pueden confirmar", async () => {
    const s = await db.servicioEnCurso.create({
      data: { organizationId: e.ids.clienteA, propertyId: propiedad, servicioId: catalogoId, tipo: "EVALUACION", porConfirmar: true },
    });
    assert.equal((await e.pedir("clienteA", "GET", `/v1/servicios/${s.id}`)).estado, 404);
    assert.equal((await e.pedir("equipo", "GET", `/v1/servicios/${s.id}`)).cuerpo.nuevo, true);
    assert.equal((await e.pedir("clienteA", "POST", `/v1/servicios/${s.id}/confirmar`)).estado, 403);
    assert.equal((await e.pedir("llaveA", "POST", `/v1/servicios/${s.id}/confirmar`)).estado, 403);

    const ok = await e.pedir("equipo", "POST", `/v1/servicios/${s.id}/confirmar`);
    assert.equal(ok.estado, 200, JSON.stringify(ok.cuerpo));
    assert.equal(ok.cuerpo.porConfirmar, false);
    // Confirmado pero sin responsable: sigue en «Nuevo». Con responsable, ya no.
    assert.equal(ok.cuerpo.nuevo, true);
    const conResponsable = await e.pedir("equipo", "PATCH", `/v1/servicios/${s.id}`, { responsableId: e.ids.equipo });
    assert.equal(conResponsable.estado, 200, JSON.stringify(conResponsable.cuerpo));
    assert.equal(conResponsable.cuerpo.nuevo, false);
    const delDueno = await e.pedir("clienteA", "GET", `/v1/servicios/${s.id}`);
    assert.equal(delDueno.estado, 200);
    assert.equal("nuevo" in delDueno.cuerpo, false, "«nuevo» es solo del equipo");
    // Confirmar otra vez no cambia nada.
    assert.equal((await e.pedir("equipo", "POST", `/v1/servicios/${s.id}/confirmar`)).estado, 200);
    assert.equal((await e.pedir("equipo", "POST", "/v1/servicios/no-existe/confirmar")).estado, 404);
  });
});
