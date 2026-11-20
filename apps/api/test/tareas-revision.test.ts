// La tarea «Revisar y repartir» de un pedido solo se cierra al aceptar o rechazar el pedido, y las
// tareas de un servicio cerrado no se tocan.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { crearEscenario, type Escenario } from "./ayuda";

let e: Escenario;
let propiedadA: string;
let catalogoId: string;

before(async () => {
  e = await crearEscenario();
  propiedadA = (
    await db.property.create({
      data: { organizationId: e.ids.clienteA, tipo: "CASA", direccion: "Calle revisión", comuna: "X", region: "RM" },
    })
  ).id;
  catalogoId = (
    await db.servicio.create({
      data: { organizationId: ORG_PROGES, codigo: `ET-V${e.ids.clienteA.slice(-14)}`, familia: "ET", nombre: "Evaluación revisión" },
    })
  ).id;
});
after(async () => {
  await e.limpiar();
  await db.servicio.delete({ where: { id: catalogoId } });
});

test("la tarea de revisión de un pedido no se edita, ni se marca hecha ni se reabre a mano", async () => {
  const pedido = await e.pedir("clienteA", "POST", "/v1/pedidos", {
    tipo: "EVALUACION",
    descripcion: "Pedido para probar la tarea de revisión",
    propiedadId: propiedadA,
  });
  assert.equal(pedido.estado, 201, JSON.stringify(pedido.cuerpo));
  const tarea = await db.tarea.findFirstOrThrow({ where: { servicioEnCursoId: pedido.cuerpo.servicioId, esRevision: true } });
  const ruta = `/v1/tareas/${tarea.id}`;

  for (const cambio of [{ hecha: true }, { que: "Otra cosa" }, { hecha: false }]) {
    const r = await e.pedir("equipo", "PATCH", ruta, cambio);
    assert.equal(r.estado, 409, JSON.stringify(cambio));
    assert.match(r.cuerpo.error.mensaje, /aceptar o rechazar el pedido en Repartir/);
  }
  const intacta = await db.tarea.findUniqueOrThrow({ where: { id: tarea.id } });
  assert.equal(intacta.hechaEl, null);
  assert.equal(intacta.que, tarea.que);

  // Las personas de afuera siguen igual: el dueño no es del equipo (403) y la llave no escribe.
  assert.equal((await e.pedir("clienteA", "PATCH", ruta, { hecha: true })).estado, 403);
  assert.equal((await e.pedir("llaveA", "PATCH", ruta, { hecha: true })).estado, 403);

  // Al rechazar el pedido, la tarea queda hecha por el sistema y sigue sin poder reabrirse a mano.
  const rechazo = await e.pedir("equipo", "POST", `/v1/pedidos/${pedido.cuerpo.pedidoId}/rechazar`, { motivo: "Fuera de zona" });
  assert.equal(rechazo.estado, 200, JSON.stringify(rechazo.cuerpo));
  assert.notEqual((await db.tarea.findUniqueOrThrow({ where: { id: tarea.id } })).hechaEl, null);
  assert.equal((await e.pedir("equipo", "PATCH", ruta, { hecha: false })).estado, 409);
});

test("una tarea normal se cambia mientras el servicio está abierto, y no cuando ya se cerró", async () => {
  const servicio = await db.servicioEnCurso.create({
    data: { organizationId: e.ids.clienteA, propertyId: propiedadA, servicioId: catalogoId, tipo: "EVALUACION" },
  });
  const creada = await e.pedir("equipo", "POST", `/v1/servicios/${servicio.id}/tareas`, { que: "Pedir el certificado" });
  assert.equal(creada.estado, 201, JSON.stringify(creada.cuerpo));
  const ruta = `/v1/tareas/${creada.cuerpo.id}`;
  const suelta = await e.pedir("equipo", "POST", `/v1/servicios/${servicio.id}/tareas`, { que: "Suelta" });

  const hecha = await e.pedir("equipo", "PATCH", ruta, { hecha: true });
  assert.equal(hecha.estado, 200, JSON.stringify(hecha.cuerpo));

  await db.servicioEnCurso.update({ where: { id: servicio.id }, data: { estado: "TERMINADO", cerradoEl: new Date() } });
  for (const cambio of [{ hecha: false }, { que: "Otra" }]) {
    const r = await e.pedir("equipo", "PATCH", ruta, cambio);
    assert.equal(r.estado, 409, JSON.stringify(cambio));
    assert.match(r.cuerpo.error.mensaje, /servicio ya está cerrado/);
  }
  assert.equal((await e.pedir("equipo", "PATCH", `/v1/tareas/${suelta.cuerpo.id}`, { hecha: true })).estado, 409);
});
