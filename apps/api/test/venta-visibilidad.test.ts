// Pruebas del corretaje que tocan quién ve qué y qué se puede reescribir: un dueño o una llave no
// ven el reporte ni responden ofertas de un servicio oculto (cancelado, por confirmar, por revisar),
// y una oferta que el dueño ya vio o respondió no cambia por debajo.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { crearEscenario, type Escenario } from "./ayuda";

describe("el corretaje y los servicios ocultos al dueño", () => {
  let e: Escenario;
  let codigoCatalogo: string;
  let catalogoId: string;
  let propiedadId: string;

  before(async () => {
    e = await crearEscenario();
    codigoCatalogo = `PRUEBA-VENTA-VIS-${e.ids.clienteA}`;
    catalogoId = (
      await db.servicio.create({
        data: { organizationId: ORG_PROGES, codigo: codigoCatalogo, familia: "NV", nombre: "Venta de prueba" },
      })
    ).id;
    propiedadId = (
      await db.property.create({
        data: { organizationId: e.ids.clienteA, tipo: "CASA", direccion: "Agustinas 715", comuna: "Santiago", region: "RM" },
      })
    ).id;
  });

  after(async () => {
    await e.limpiar();
    await db.servicio.deleteMany({ where: { organizationId: ORG_PROGES, codigo: codigoCatalogo } });
  });

  // Un servicio de venta del cliente A con una oferta ya mostrada al dueño.
  async function servicioConOferta(extra: { estado?: "CANCELADO"; porConfirmar?: boolean; porRevisar?: boolean } = {}) {
    const s = await db.servicioEnCurso.create({
      data: {
        organizationId: e.ids.clienteA,
        propertyId: propiedadId,
        servicioId: catalogoId,
        tipo: "VENTA",
        responsableId: e.ids.equipo,
        ...extra,
      },
    });
    const o = await db.oferta.create({
      data: {
        organizationId: e.ids.clienteA,
        servicioEnCursoId: s.id,
        fecha: new Date("2026-11-10T00:00:00Z"),
        monto: "3000",
        moneda: "UF",
        oferente: "Oferente de prueba",
        mostradaAlDuenoEl: new Date(),
        mostradaPorId: e.ids.equipo,
      },
    });
    return { servicioId: s.id, ofertaId: o.id };
  }

  const ocultos = [
    ["cancelado", { estado: "CANCELADO" }],
    ["por confirmar", { porConfirmar: true }],
    ["por revisar", { porRevisar: true }],
  ] as const;

  for (const [nombre, extra] of ocultos) {
    test(`servicio ${nombre}: el reporte y la respuesta dan 404 al dueño y a la llave; el equipo lo ve`, async () => {
      const { servicioId, ofertaId } = await servicioConOferta(extra);
      assert.equal((await e.pedir("clienteA", "GET", `/v1/servicios/${servicioId}/venta`)).estado, 404);
      assert.equal((await e.pedir("llaveA", "GET", `/v1/servicios/${servicioId}/venta`)).estado, 404);
      assert.equal((await e.pedir("equipo", "GET", `/v1/servicios/${servicioId}/venta`)).estado, 200);
      const r = await e.pedir("clienteA", "POST", `/v1/ofertas/${ofertaId}/responder`, { respuesta: "ACEPTA" });
      assert.equal(r.estado, 404);
      assert.equal((await db.oferta.findUniqueOrThrow({ where: { id: ofertaId } })).respuestaDueno, null);
    });
  }

  test("una oferta ya mostrada al dueño no cambia de monto, moneda ni fecha; lo demás sí", async () => {
    const { ofertaId } = await servicioConOferta();
    const ruta = `/v1/ofertas/${ofertaId}`;
    const monto = await e.pedir("equipo", "PATCH", ruta, { monto: { valor: "2500", moneda: "UF" } });
    assert.equal(monto.estado, 409);
    assert.match(monto.cuerpo.error.mensaje, /ya se le mostró al dueño/);
    assert.equal((await e.pedir("equipo", "PATCH", ruta, { monto: { valor: "3000", moneda: "CLP" } })).estado, 409);
    assert.equal((await e.pedir("equipo", "PATCH", ruta, { fecha: "2026-11-11" })).estado, 409);
    const guardada = await db.oferta.findUniqueOrThrow({ where: { id: ofertaId } });
    assert.equal(guardada.monto.toFixed(), "3000");

    // Mandar el mismo valor no molesta, y la nota interna o el estado antes de la respuesta sí se corrigen.
    assert.equal((await e.pedir("equipo", "PATCH", ruta, { monto: { valor: "3000", moneda: "UF" }, fecha: "2026-11-10" })).estado, 200);
    assert.equal((await e.pedir("equipo", "PATCH", ruta, { nota: "Llamó de nuevo" })).estado, 200);
    assert.equal((await e.pedir("equipo", "PATCH", ruta, { estado: "CAIDA" })).estado, 200);
  });

  test("una oferta que el dueño ya respondió no cambia de estado", async () => {
    const { ofertaId } = await servicioConOferta();
    await db.oferta.update({
      where: { id: ofertaId },
      data: { estado: "ACEPTADA", respuestaDueno: "ACEPTA", respondidaPorId: e.ids.usuarioA, respondidaEl: new Date() },
    });
    const ruta = `/v1/ofertas/${ofertaId}`;
    const r = await e.pedir("equipo", "PATCH", ruta, { estado: "RECHAZADA" });
    assert.equal(r.estado, 409);
    assert.match(r.cuerpo.error.mensaje, /ya respondió/);
    assert.equal((await db.oferta.findUniqueOrThrow({ where: { id: ofertaId } })).estado, "ACEPTADA");
    assert.equal((await e.pedir("equipo", "PATCH", ruta, { estado: "ACEPTADA" })).estado, 200);
  });

  test("una oferta que todavía no se muestra se corrige entera", async () => {
    const { ofertaId } = await servicioConOferta();
    await db.oferta.update({ where: { id: ofertaId }, data: { mostradaAlDuenoEl: null, mostradaPorId: null } });
    const r = await e.pedir("equipo", "PATCH", `/v1/ofertas/${ofertaId}`, { monto: { valor: "2900", moneda: "UF" }, fecha: "2026-11-09" });
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.monto.valor, "2900");
  });
});
