// Pruebas del trabajo del día: servicios y «esperando a», tareas, bitácora y fotos, pedidos,
// inicio y novedades. Las primeras son de funciones puras (sin base, con «hoy» fijo); las demás
// llaman a la API como cada persona del escenario.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { crearEscenario, clavesInternas, type Escenario } from "./ayuda";
import { NOS_TOCA, planearEspera } from "../src/dominio/trabajo/espera";
import { cargaDelEquipo, clasificarPorDia, clasificarPorSemana } from "../src/dominio/trabajo/tareas";
import { textoTareaDeRevision } from "../src/dominio/trabajo/pedidos";
import { tipoUnicoDeFamilia, tiposDeFamilia } from "../src/dominio/trabajo/catalogo";
import { ErrorApi } from "../src/errores";
import { hoyChile, sumarDias } from "../src/util/fechas";

const dia = (n: number) => sumarDias(hoyChile(), n).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Reglas puras (con «hoy» fijo, sin depender del reloj)
// ---------------------------------------------------------------------------

describe("reglas puras", () => {
  const HOY = new Date(Date.UTC(2026, 10, 19)); // 2026-11-19
  const d = (n: number) => new Date(Date.UTC(2026, 10, 19 + n));

  test("espera: cambiar a quién se espera fija el día y deja el evento", () => {
    const sin = { esperandoA: null, esperandoDetalle: null, esperandoDesde: null };
    const plan = planearEspera(sin, { esperandoA: "CONSERVADOR" }, HOY);
    assert.deepEqual(plan.datos, { esperandoA: "CONSERVADOR", esperandoDetalle: null, esperandoDesde: HOY });
    assert.deepEqual(plan.evento, { anterior: NOS_TOCA, nuevo: "CONSERVADOR", motivo: null });

    const espera = { esperandoA: "CONSERVADOR" as const, esperandoDetalle: null, esperandoDesde: d(-4) };
    // Pedir lo mismo no cambia nada.
    assert.deepEqual(planearEspera(espera, { esperandoA: "CONSERVADOR" }, HOY), { datos: {}, evento: null });
    // Solo el detalle: se actualiza sin reiniciar el día ni dejar evento.
    const soloDetalle = planearEspera(espera, { esperandoDetalle: "Ingreso 4421" }, HOY);
    assert.deepEqual(soloDetalle, { datos: { esperandoDetalle: "Ingreso 4421" }, evento: null });
    // Volver a «nos toca».
    const vuelve = planearEspera(espera, { esperandoA: null }, HOY);
    assert.deepEqual(vuelve.datos, { esperandoA: null, esperandoDetalle: null, esperandoDesde: null });
    assert.deepEqual(vuelve.evento, { anterior: "CONSERVADOR", nuevo: NOS_TOCA, motivo: null });
  });

  test("espera: «Otro» exige el detalle", () => {
    const sin = { esperandoA: null, esperandoDetalle: null, esperandoDesde: null };
    assert.throws(
      () => planearEspera(sin, { esperandoA: "OTRO" }, HOY),
      (e: unknown) => e instanceof ErrorApi && e.estado === 400,
    );
    assert.equal(planearEspera(sin, { esperandoA: "OTRO", esperandoDetalle: "SII" }, HOY).evento?.motivo, "SII");
  });

  test("tareas: «hoy» separa atrasadas, hoy y mañana", () => {
    const t = (id: string, vence: Date | null) => ({ id, vence });
    const g = clasificarPorDia([t("sin", null), t("m", d(1)), t("h", d(0)), t("a", d(-3)), t("l", d(2))], HOY);
    assert.deepEqual(g.atrasadas.map((x) => x.id), ["a"]);
    assert.deepEqual(g.hoy.map((x) => x.id), ["h"]);
    assert.deepEqual(g.manana.map((x) => x.id), ["m"]);
    assert.deepEqual(g.masAdelante.map((x) => x.id).sort(), ["l", "sin"]);
  });

  test("tareas: la semana llega hasta 7 días y la carga cuenta a cada persona", () => {
    const t = (responsableId: string | null, vence: Date | null) => ({ responsableId, vence });
    const abiertas = [t("ana", d(-1)), t("ana", d(7)), t("ana", d(8)), t("beto", null), t(null, d(0))];
    const g = clasificarPorSemana(abiertas, HOY);
    assert.equal(g.atrasadas.length, 1);
    assert.equal(g.estaSemana.length, 2); // d(7) y el de hoy
    assert.equal(g.despues.length, 2);
    const carga = cargaDelEquipo(
      [
        { id: "ana", nombre: "Ana" },
        { id: "beto", nombre: "Beto" },
        { id: "cata", nombre: "Cata" },
      ],
      abiertas,
      HOY,
    );
    assert.deepEqual(
      carga.map((c) => [c.persona.id, c.abiertas, c.atrasadas, c.estaSemana]),
      [
        ["ana", 3, 1, 1],
        ["beto", 1, 0, 0],
        ["cata", 0, 0, 0],
      ],
    );
  });

  test("pedido: el texto de la tarea de revisión queda en una línea corta", () => {
    const texto = textoTareaDeRevision(`Quiero  pintar\n${"x".repeat(300)}`);
    assert.ok(texto.startsWith("Revisar y repartir: Quiero pintar x"));
    assert.ok(texto.length <= 160);
    assert.ok(!texto.includes("\n"));
  });

  test("catálogo: el tipo se deduce solo si la familia sirve a uno", () => {
    assert.equal(tipoUnicoDeFamilia("RR"), "OBRA");
    assert.equal(tipoUnicoDeFamilia("ET"), "EVALUACION");
    assert.equal(tipoUnicoDeFamilia("NV"), null);
    assert.deepEqual(tiposDeFamilia("NV").sort(), ["ARRIENDO", "VENTA"]);
  });
});

// ---------------------------------------------------------------------------
// La API
// ---------------------------------------------------------------------------

let e: Escenario;
let catalogoId: string; // un servicio del catálogo de la familia ET (evaluación)
let propiedadA: string;
let propiedadB: string;
let servicioA: string; // un servicio abierto de A, para casi todas las pruebas
let contadorDeFotos = 0;
// Cada foto subida recibe un id de Drive distinto (la base no admite dos fotos con el mismo).
const idDeFotoFalso = () => `drive_file_prueba_${process.pid}_${Date.now().toString(36)}_${++contadorDeFotos}`;

before(async () => {
  e = await crearEscenario({
    drive: {
      subirArchivo: async () => ({ driveFileId: idDeFotoFalso() }),
      leerArchivo: async () => ({ datos: Buffer.from("JPEGFALSO"), mime: "image/jpeg", nombre: "foto.jpg" }),
      miniatura: async () => ({ datos: Buffer.from("MINI"), mime: "image/jpeg" }),
    },
  });
  const sufijo = e.ids.clienteA.slice(-14);
  const catalogo = await db.servicio.create({
    data: { organizationId: ORG_PROGES, codigo: `ET-T${sufijo}`, familia: "ET", nombre: `Evaluación de prueba ${sufijo}` },
  });
  catalogoId = catalogo.id;
  const crearPropiedad = (organizationId: string, direccion: string, driveCarpetaId: string | null) =>
    db.property.create({ data: { organizationId, tipo: "CASA", direccion, comuna: "Ñuñoa", region: "RM", driveCarpetaId } });
  propiedadA = (await crearPropiedad(e.ids.clienteA, `Calle A ${sufijo}`, "carpeta_prueba_aaaaaaaa")).id;
  propiedadB = (await crearPropiedad(e.ids.clienteB, `Calle B ${sufijo}`, null)).id;

  const r = await e.pedir("equipo", "POST", "/v1/servicios", {
    propiedadId: propiedadA,
    servicioId: catalogoId,
    responsableId: e.ids.equipo,
    nota: "Abierto por la prueba",
  });
  assert.equal(r.estado, 201, JSON.stringify(r.cuerpo));
  servicioA = r.cuerpo.id;
});

after(async () => {
  await e.limpiar();
  await db.servicio.deleteMany({ where: { id: catalogoId } });
});

describe("catálogo y servicios", () => {
  test("el catálogo lo lee cualquiera que haya entrado, con los tipos de cada servicio", async () => {
    for (const quien of ["equipo", "clienteA", "llaveA"] as const) {
      const r = await e.pedir(quien, "GET", "/v1/catalogo");
      assert.equal(r.estado, 200);
      const el = r.cuerpo.items.find((i: { id: string }) => i.id === catalogoId);
      assert.deepEqual(el.tipos, ["EVALUACION"]);
    }
    assert.equal((await e.pedir("anonimo", "GET", "/v1/catalogo")).estado, 401);
  });

  test("abrir a mano: el tipo se deduce de la familia; una familia ambigua pide el tipo", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/servicios/${servicioA}`);
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.tipo, "EVALUACION");
    assert.equal(r.cuerpo.responsable.id, e.ids.equipo);
    assert.equal(r.cuerpo.cliente.id, e.ids.clienteA);
    assert.equal(r.cuerpo.esperando, null);

    const nv = await db.servicio.create({
      data: { organizationId: ORG_PROGES, codigo: `NV-T${e.ids.clienteA.slice(-14)}`, familia: "NV", nombre: "Venta de prueba" },
    });
    try {
      const sinTipo = await e.pedir("equipo", "POST", "/v1/servicios", { propiedadId: propiedadA, servicioId: nv.id });
      assert.equal(sinTipo.estado, 400);
      assert.ok(sinTipo.cuerpo.error.campos.tipo);
      const conTipo = await e.pedir("equipo", "POST", "/v1/servicios", {
        propiedadId: propiedadA,
        servicioId: nv.id,
        tipo: "ARRIENDO",
      });
      assert.equal(conTipo.estado, 201);
      // Un tipo que esa familia no ofrece, no.
      const malTipo = await e.pedir("equipo", "POST", "/v1/servicios", {
        propiedadId: propiedadA,
        servicioId: nv.id,
        tipo: "OBRA",
      });
      assert.equal(malTipo.estado, 400);
    } finally {
      await db.servicioEnCurso.deleteMany({ where: { servicioId: nv.id } });
      await db.servicio.delete({ where: { id: nv.id } });
    }
  });

  test("abrir: una propiedad de otro cliente o un responsable de afuera no sirven", async () => {
    const r = await e.pedir("equipo", "POST", "/v1/servicios", {
      propiedadId: propiedadA,
      servicioId: catalogoId,
      responsableId: e.ids.usuarioA, // es de un cliente, no del equipo
    });
    assert.equal(r.estado, 400);
    assert.ok(r.cuerpo.error.campos.responsableId);
    assert.equal(
      (await e.pedir("equipo", "POST", "/v1/servicios", { propiedadId: "no_existe", servicioId: catalogoId })).estado,
      404,
    );
  });

  test("marcar «esperando a» registra el evento y lo mueve en el tablero", async () => {
    const tablero = async () =>
      (await e.pedir("equipo", "GET", `/v1/servicios?vista=tablero&cliente=${e.ids.clienteA}`)).cuerpo;
    const ids = (lista: { id: string }[]) => lista.map((i) => i.id);

    // Recién abierto y sin tareas: «nos toca» (nunca se trabajó, no está por entregar).
    const antes = await tablero();
    assert.ok(ids(antes.nosToca).includes(servicioA));
    assert.ok(!ids(antes.porEntregar).includes(servicioA));

    const r = await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioA}`, { esperandoA: "CONSERVADOR" });
    assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
    assert.equal(r.cuerpo.esperando.a, "CONSERVADOR");
    assert.equal(r.cuerpo.esperando.desde, dia(0));
    assert.equal(r.cuerpo.esperando.dias, 0);
    assert.equal(r.cuerpo.historialEspera.length, 1);
    assert.equal(r.cuerpo.historialEspera[0].de, null);
    assert.equal(r.cuerpo.historialEspera[0].a, "CONSERVADOR");

    const evento = await db.evento.findFirstOrThrow({ where: { servicioEnCursoId: servicioA, tipo: "ESPERA" } });
    assert.equal(evento.anterior, NOS_TOCA);
    assert.equal(evento.nuevo, "CONSERVADOR");
    assert.equal(evento.autorId, e.ids.equipo);

    const durante = await tablero();
    assert.ok(ids(durante.esperando).includes(servicioA));
    assert.ok(!ids(durante.porEntregar).includes(servicioA));
    assert.equal(durante.esperando.find((i: { id: string }) => i.id === servicioA).esperando.a, "CONSERVADOR");

    // Con una tarea pendiente y de vuelta a «nos toca», pasa a «nos toca».
    const t = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/tareas`, { que: "Llamar al conservador" });
    assert.equal(t.estado, 201);
    const vuelve = await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioA}`, { esperandoA: null });
    assert.equal(vuelve.cuerpo.esperando, null);
    assert.equal(vuelve.cuerpo.historialEspera[0].de, "CONSERVADOR");
    assert.equal(vuelve.cuerpo.historialEspera[0].a, null);
    const despues = await tablero();
    assert.ok(ids(despues.nosToca).includes(servicioA));
    // Con la tarea hecha (y sin espera): «por entregar».
    const hecha = await e.pedir("equipo", "PATCH", `/v1/tareas/${t.cuerpo.id}`, { hecha: true });
    assert.equal(hecha.estado, 200, JSON.stringify(hecha.cuerpo));
    const porEntregar = await tablero();
    assert.ok(ids(porEntregar.porEntregar).includes(servicioA));
    await e.pedir("equipo", "DELETE", `/v1/tareas/${t.cuerpo.id}`);
  });

  test("«Otro» sin detalle es un 400, con detalle pasa; y se filtra por responsable", async () => {
    const mal = await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioA}`, { esperandoA: "OTRO" });
    assert.equal(mal.estado, 400);
    assert.ok(mal.cuerpo.error.campos.esperandoDetalle);
    const bien = await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioA}`, {
      esperandoA: "OTRO",
      esperandoDetalle: "El SII",
    });
    assert.equal(bien.cuerpo.esperando.detalle, "El SII");
    await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioA}`, { esperandoA: null });

    const suyos = await e.pedir("equipo", "GET", `/v1/servicios?vista=tablero&cliente=${e.ids.clienteA}&responsable=${e.ids.equipo}`);
    const todos = [...suyos.cuerpo.nosToca, ...suyos.cuerpo.porEntregar, ...suyos.cuerpo.esperando];
    assert.ok(todos.some((i: { id: string }) => i.id === servicioA));
    const sin = await e.pedir("equipo", "GET", `/v1/servicios?vista=tablero&cliente=${e.ids.clienteA}&responsable=sin`);
    assert.ok(![...sin.cuerpo.nosToca, ...sin.cuerpo.porEntregar].some((i: { id: string }) => i.id === servicioA));
  });

  test("el tablero manda a «Nuevo» lo por confirmar y lo sin responsable, con el motivo a la vista", async () => {
    const tablero = async () =>
      (await e.pedir("equipo", "GET", `/v1/servicios?vista=tablero&cliente=${e.ids.clienteA}`)).cuerpo;
    const ids = (lista: { id: string }[]) => lista.map((i) => i.id);
    const base = { organizationId: e.ids.clienteA, propertyId: propiedadA, servicioId: catalogoId, tipo: "EVALUACION" as const };
    const porConfirmar = await db.servicioEnCurso.create({ data: { ...base, responsableId: e.ids.equipo, porConfirmar: true } });
    const sinResponsable = await db.servicioEnCurso.create({ data: base });

    const t = await tablero();
    for (const id of [porConfirmar.id, sinResponsable.id]) assert.ok(ids(t.nuevo).includes(id), id);
    assert.ok(!ids(t.nosToca).includes(sinResponsable.id));
    const a = t.nuevo.find((i: { id: string }) => i.id === porConfirmar.id);
    assert.deepEqual([a.porConfirmar, a.porRevisar, a.responsable.id], [true, false, e.ids.equipo]);
    const b = t.nuevo.find((i: { id: string }) => i.id === sinResponsable.id);
    assert.deepEqual([b.responsable, b.proximaTarea], [null, null]);
    // El servicio de siempre (con responsable y confirmado) sigue fuera de «Nuevo».
    assert.ok(!ids(t.nuevo).includes(servicioA));

    // El Inicio cuenta lo mismo que la columna, y los nuevos también están «en curso».
    const inicio = (await e.pedir("equipo", "GET", `/v1/inicio?cliente=${e.ids.clienteA}`)).cuerpo;
    assert.equal(inicio.cifras.nuevosSinRepartir, t.nuevo.length);
    assert.ok(inicio.cifras.serviciosEnCurso >= t.nuevo.length - t.nuevo.filter((i: { porRevisar: boolean }) => i.porRevisar).length);
    // Confirmarlo o repartirlo lo saca de «Nuevo».
    await e.pedir("equipo", "POST", `/v1/servicios/${porConfirmar.id}/confirmar`);
    assert.ok(!ids((await tablero()).nuevo).includes(porConfirmar.id));
  });

  test("el tablero trae la próxima tarea de cada servicio, y si está atrasada", async () => {
    const buscar = async () => {
      const t = (await e.pedir("equipo", "GET", `/v1/servicios?vista=tablero&cliente=${e.ids.clienteA}`)).cuerpo;
      return [...t.nuevo, ...t.nosToca, ...t.esperando, ...t.porEntregar].find((i: { id: string }) => i.id === servicioA);
    };
    const nueva = async (que: string, vence: string | null) => {
      const r = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/tareas`, vence ? { que, vence } : { que });
      assert.equal(r.estado, 201, JSON.stringify(r.cuerpo));
      return r.cuerpo.id as string;
    };
    const idsCreadas = [await nueva("Sin fecha", null), await nueva("Más adelante", dia(9)), await nueva("Visitar y fotografiar", dia(2))];
    let item = await buscar();
    assert.deepEqual(item.proximaTarea, { que: "Visitar y fotografiar", vence: dia(2), atrasada: false });
    assert.equal(item.tareasPendientes, 3);

    idsCreadas.push(await nueva("Se pasó", dia(-1)));
    item = await buscar();
    assert.deepEqual(item.proximaTarea, { que: "Se pasó", vence: dia(-1), atrasada: true });
    assert.equal(item.tareasPendientes, 4);

    for (const id of idsCreadas) await e.pedir("equipo", "DELETE", `/v1/tareas/${id}`);
    assert.equal((await buscar()).proximaTarea, null);
  });

  test("cerrar: terminado con motivo; una obra no se cierra aquí (409)", async () => {
    const catalogoRR = await db.servicio.create({
      data: { organizationId: ORG_PROGES, codigo: `RR-T${e.ids.clienteA.slice(-14)}`, familia: "RR", nombre: "Obra de prueba" },
    });
    try {
      const obra = await db.servicioEnCurso.create({
        data: { organizationId: e.ids.clienteA, propertyId: propiedadA, servicioId: catalogoRR.id, tipo: "OBRA" },
      });
      const r = await e.pedir("equipo", "POST", `/v1/servicios/${obra.id}/cerrar`, { resultado: "TERMINADO", motivo: "Listo" });
      assert.equal(r.estado, 409);
      assert.match(r.cuerpo.error.mensaje, /obra/i);

      const aparte = await e.pedir("equipo", "POST", "/v1/servicios", { propiedadId: propiedadA, servicioId: catalogoId });
      const sinMotivo = await e.pedir("equipo", "POST", `/v1/servicios/${aparte.cuerpo.id}/cerrar`, { resultado: "TERMINADO", motivo: "" });
      assert.equal(sinMotivo.estado, 400);
      const ok = await e.pedir("equipo", "POST", `/v1/servicios/${aparte.cuerpo.id}/cerrar`, { resultado: "TERMINADO", motivo: "Entregado" });
      assert.equal(ok.estado, 200);
      assert.equal(ok.cuerpo.estado, "TERMINADO");
      assert.equal(ok.cuerpo.motivoCierre, "Entregado");
      // Ya cerrado: no se cierra de nuevo, no recibe tareas ni cambios.
      assert.equal((await e.pedir("equipo", "POST", `/v1/servicios/${aparte.cuerpo.id}/cerrar`, { resultado: "CANCELADO", motivo: "x" })).estado, 409);
      assert.equal((await e.pedir("equipo", "POST", `/v1/servicios/${aparte.cuerpo.id}/tareas`, { que: "algo" })).estado, 409);
      assert.equal((await e.pedir("equipo", "PATCH", `/v1/servicios/${aparte.cuerpo.id}`, { esperandoA: "BANCO" })).estado, 409);
    } finally {
      await db.servicioEnCurso.deleteMany({ where: { servicioId: catalogoRR.id } });
      await db.servicio.delete({ where: { id: catalogoRR.id } });
    }
  });
});

describe("tareas", () => {
  test("vista=hoy separa atrasadas, hoy y mañana; las de más adelante solo se cuentan", async () => {
    const crear = (que: string, vence: string | null) =>
      e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/tareas`, { que, responsableId: e.ids.equipo, vence });
    const hechas = await Promise.all([
      crear("atrasada", dia(-2)),
      crear("de hoy", dia(0)),
      crear("de mañana", dia(1)),
      crear("de la semana", dia(4)),
      crear("sin fecha", null),
    ]);
    for (const r of hechas) assert.equal(r.estado, 201, JSON.stringify(r.cuerpo));

    const r = await e.pedir("equipo", "GET", "/v1/tareas?vista=hoy");
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.fecha, dia(0));
    assert.deepEqual(r.cuerpo.atrasadas.map((t: { que: string }) => t.que), ["atrasada"]);
    assert.deepEqual(r.cuerpo.hoy.map((t: { que: string }) => t.que), ["de hoy"]);
    assert.deepEqual(r.cuerpo.manana.map((t: { que: string }) => t.que), ["de mañana"]);
    assert.equal(r.cuerpo.masAdelante, 2);
    assert.equal(r.cuerpo.hoy[0].servicio.id, servicioA);
    assert.equal(r.cuerpo.hoy[0].propiedad.id, propiedadA);

    // «Anotar» propone este servicio: tiene tareas de hoy o atrasadas.
    const sug = await e.pedir("equipo", "GET", "/v1/servicios/sugeridos");
    assert.equal(sug.estado, 200);
    const el = sug.cuerpo.items.find((s: { id: string }) => s.id === servicioA);
    assert.equal(el.tareasHoy, 2);

    // La carga y Repartir ven lo mismo desde el lado del equipo.
    const eq = await e.pedir("equipo", "GET", `/v1/tareas?vista=equipo&cliente=${e.ids.clienteA}`);
    const mia = eq.cuerpo.personas.find((p: { persona: { id: string } }) => p.persona.id === e.ids.equipo);
    assert.deepEqual([mia.abiertas, mia.atrasadas, mia.estaSemana], [5, 1, 3]);
    const sem = await e.pedir("equipo", "GET", `/v1/tareas?vista=semana&cliente=${e.ids.clienteA}`);
    assert.equal(sem.estado, 200);
    const suya = sem.cuerpo.personas.find((p: { persona: { id: string } }) => p.persona.id === e.ids.equipo);
    assert.equal(suya.atrasadas.length, 1);
    assert.equal(suya.estaSemana.length, 3);
  });

  test("editar, marcar hecha, deshacer y borrar", async () => {
    const t = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/tareas`, { que: "Probar" });
    const id = t.cuerpo.id;
    assert.equal(t.cuerpo.responsable, null);

    const editada = await e.pedir("equipo", "PATCH", `/v1/tareas/${id}`, { que: "Probar mejor", vence: dia(3), responsableId: e.ids.jefatura });
    assert.equal(editada.estado, 200);
    assert.equal(editada.cuerpo.que, "Probar mejor");
    assert.equal(editada.cuerpo.vence, dia(3));
    assert.equal(editada.cuerpo.responsable.id, e.ids.jefatura);

    const hecha = await e.pedir("equipo", "PATCH", `/v1/tareas/${id}`, { hecha: true });
    assert.equal(hecha.cuerpo.hecha, true);
    assert.equal(hecha.cuerpo.hechaPor.id, e.ids.equipo);
    // Marcarla dos veces, editarla hecha o borrarla hecha: 409.
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/tareas/${id}`, { hecha: true })).estado, 409);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/tareas/${id}`, { que: "otra" })).estado, 409);
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/tareas/${id}`)).estado, 409);

    const deshecha = await e.pedir("equipo", "PATCH", `/v1/tareas/${id}`, { hecha: false });
    assert.equal(deshecha.cuerpo.hecha, false);
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/tareas/${id}`)).estado, 204);
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/tareas/${id}`)).estado, 404);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/tareas/${id}`, {})).estado, 400);
  });

  test("un dueño y una llave no ven tareas", async () => {
    for (const quien of ["clienteA", "llaveA"] as const) {
      for (const vista of ["hoy", "equipo", "semana"]) {
        assert.equal((await e.pedir(quien, "GET", `/v1/tareas?vista=${vista}`)).estado, 403);
      }
      assert.equal((await e.pedir(quien, "GET", "/v1/servicios/sugeridos")).estado, 403);
      assert.equal((await e.pedir(quien, "GET", "/v1/inicio")).estado, 403);
      assert.equal((await e.pedir(quien, "GET", "/v1/servicios?vista=tablero")).estado, 403);
    }
  });
});

describe("bitácora y fotos", () => {
  let notaInterna: string;
  let notaDueno: string;
  let fotoDueno: string;
  let fotoInterna: string;

  const formulario = (campos: Record<string, string>, fotos = 0) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.append(k, v);
    for (let i = 0; i < fotos; i++) fd.append("fotos", new File([`bytes${i}`], `f${i}.jpg`, { type: "image/jpeg" }));
    return fd;
  };

  before(async () => {
    const interna = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/notas`, formulario({ texto: "SECRETO interno de Proges" }, 1));
    assert.equal(interna.estado, 201, JSON.stringify(interna.cuerpo));
    assert.equal(interna.cuerpo.aviso, null);
    notaInterna = interna.cuerpo.nota.id;
    fotoInterna = interna.cuerpo.nota.fotos[0].id;
    assert.equal(interna.cuerpo.nota.paraDueno, false);
    assert.equal(interna.cuerpo.nota.autor.id, e.ids.equipo);

    const dueno = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/notas`, formulario({ texto: "Ya pintamos el living", paraDueno: "true" }, 2));
    assert.equal(dueno.estado, 201, JSON.stringify(dueno.cuerpo));
    notaDueno = dueno.cuerpo.nota.id;
    fotoDueno = dueno.cuerpo.nota.fotos[0].id;
    assert.equal(dueno.cuerpo.nota.fotos.length, 2);
    assert.equal(dueno.cuerpo.nota.paraDueno, true);
  });

  test("las fotos solo se aceptan JPG, PNG o WebP, hasta 6, y la nota no puede ir vacía", async () => {
    const vacia = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/notas`, formulario({ texto: "  " }));
    assert.equal(vacia.estado, 400);
    const pdf = new FormData();
    pdf.append("texto", "x");
    pdf.append("fotos", new File(["%PDF"], "a.pdf", { type: "application/pdf" }));
    assert.equal((await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/notas`, pdf)).estado, 400);
    assert.equal((await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/notas`, formulario({ texto: "x" }, 7))).estado, 400);
    const sinTarea = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/notas`, formulario({ texto: "x", tareaId: "no_existe" }));
    assert.equal(sinTarea.estado, 400);
  });

  test("un dueño no ve tareas ni notas internas, ni en la ficha ni en la bitácora ni en las novedades", async () => {
    // Una tarea abierta para que haya algo que filtrar.
    await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/tareas`, { que: "TAREA_INTERNA_SECRETA" });
    const rutas = [`/v1/servicios/${servicioA}`, `/v1/servicios/${servicioA}/notas`, "/v1/novedades", "/v1/servicios?vista=lista"];
    for (const quien of ["clienteA", "llaveA"] as const) {
      for (const ruta of rutas) {
        const r = await e.pedir(quien, "GET", ruta);
        assert.equal(r.estado, 200, `${quien} ${ruta}`);
        const texto = JSON.stringify(r.cuerpo);
        assert.ok(!texto.includes("SECRETO"), `${quien} ${ruta} mostró una nota interna`);
        assert.ok(!texto.includes("TAREA_INTERNA_SECRETA"), `${quien} ${ruta} mostró una tarea`);
        assert.ok(!texto.includes(notaInterna));
        assert.deepEqual(clavesInternas(r.cuerpo), [], `${quien} ${ruta}`);
        assert.ok(!/"responsable"|"tareas"|"autor"|"tareaId"|"paraDueno"/.test(texto), `${quien} ${ruta} trae campos del equipo`);
      }
      const ficha = await e.pedir(quien, "GET", `/v1/servicios/${servicioA}`);
      assert.deepEqual(ficha.cuerpo.notas.map((n: { id: string }) => n.id), [notaDueno]);
      assert.equal(ficha.cuerpo.tareas, undefined);
      const nov = await e.pedir(quien, "GET", "/v1/novedades");
      assert.ok(nov.cuerpo.items.some((i: { tipo: string; nota?: { id: string } }) => i.tipo === "NOTA" && i.nota?.id === notaDueno));
    }
    // El equipo sí ve las dos notas y la tarea.
    const equipo = await e.pedir("equipo", "GET", `/v1/servicios/${servicioA}`);
    assert.equal(equipo.cuerpo.notas.length >= 2, true);
    assert.ok(equipo.cuerpo.tareas.some((t: { que: string }) => t.que === "TAREA_INTERNA_SECRETA"));
  });

  test("las novedades traen los cambios de «esperando a», de lo más nuevo a lo más antiguo", async () => {
    await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioA}`, { esperandoA: "NOTARIA" });
    const nov = await e.pedir("clienteA", "GET", "/v1/novedades");
    assert.equal(nov.estado, 200);
    assert.equal(nov.cuerpo.items[0].tipo, "ESPERA");
    assert.equal(nov.cuerpo.items[0].a, "NOTARIA");
    const fechas = nov.cuerpo.items.map((i: { fecha: string }) => i.fecha);
    assert.deepEqual([...fechas].sort().reverse(), fechas);
    // El cliente B no ve nada de A.
    const deB = await e.pedir("clienteB", "GET", "/v1/novedades");
    assert.deepEqual(deB.cuerpo.items, []);
    await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioA}`, { esperandoA: null });
  });

  test("cambiar paraDueno muestra u oculta la nota (y sus fotos) para el dueño", async () => {
    assert.equal((await e.pedir("clienteA", "GET", `/v1/fotos/${fotoInterna}`)).estado, 404);
    const r = await e.pedir("equipo", "PATCH", `/v1/notas/${notaInterna}`, { paraDueno: true });
    assert.equal(r.cuerpo.paraDueno, true);
    assert.equal((await e.pedir("clienteA", "GET", `/v1/fotos/${fotoInterna}`)).estado, 200);
    await e.pedir("equipo", "PATCH", `/v1/notas/${notaInterna}`, { paraDueno: false });
    assert.equal((await e.pedir("clienteA", "GET", `/v1/fotos/${fotoInterna}`)).estado, 404);
    assert.equal((await e.pedir("clienteA", "PATCH", `/v1/notas/${notaInterna}`, { paraDueno: true })).estado, 403);
  });

  test("la foto se entrega revisando el permiso", async () => {
    for (const quien of ["equipo", "clienteA", "llaveA"] as const) {
      const r = await e.pedir(quien, "GET", `/v1/fotos/${fotoDueno}`);
      assert.equal(r.estado, 200, quien);
      assert.equal(r.cuerpo, "JPEGFALSO");
    }
    assert.equal((await e.pedir("clienteA", "GET", `/v1/fotos/${fotoDueno}?miniatura=1`)).cuerpo, "MINI");
    assert.equal((await e.pedir("clienteB", "GET", `/v1/fotos/${fotoDueno}`)).estado, 404);
    assert.equal((await e.pedir("anonimo", "GET", `/v1/fotos/${fotoDueno}`)).estado, 401);
    assert.equal((await e.pedir("equipo", "GET", "/v1/fotos/no_existe")).estado, 404);
  });

  test("si Drive falla, la nota con texto queda guardada y el aviso lo dice", async () => {
    const roto = await crearEscenario({
      drive: {
        subirArchivo: async () => {
          throw new Error("Drive negó el permiso");
        },
      },
    });
    try {
      const p = await db.property.create({
        data: { organizationId: roto.ids.clienteA, tipo: "CASA", direccion: "Calle rota", comuna: "X", region: "RM", driveCarpetaId: "carpeta_rota_zzzzzz" },
      });
      const cat = await db.servicio.create({
        data: { organizationId: ORG_PROGES, codigo: `ET-R${roto.ids.clienteA.slice(-14)}`, familia: "ET", nombre: "Rota" },
      });
      const s = await db.servicioEnCurso.create({
        data: { organizationId: roto.ids.clienteA, propertyId: p.id, servicioId: cat.id, tipo: "EVALUACION" },
      });
      try {
        const r = await roto.pedir("equipo", "POST", `/v1/servicios/${s.id}/notas`, formulario({ texto: "Con foto" }, 1));
        assert.equal(r.estado, 201);
        assert.match(r.cuerpo.aviso, /Drive negó el permiso/);
        assert.equal(r.cuerpo.nota.fotos.length, 0);
        // Sin texto y sin ninguna foto subida, la nota no queda: 502.
        const sola = await roto.pedir("equipo", "POST", `/v1/servicios/${s.id}/notas`, formulario({}, 1));
        assert.equal(sola.estado, 502);
        assert.equal(await db.nota.count({ where: { servicioEnCursoId: s.id } }), 1);
      } finally {
        await roto.limpiar();
        await db.servicio.delete({ where: { id: cat.id } });
      }
    } catch (error) {
      await roto.limpiar().catch(() => undefined);
      throw error;
    }
  });
});

describe("pedidos", () => {
  test("un pedido del cliente A abre el servicio en A con la tarea para la jefatura; dos veces seguidas no crea dos", async () => {
    const cuerpo = { tipo: "EVALUACION", descripcion: "Necesito que evalúen mi casa de Ñuñoa", propiedadId: propiedadA };
    const antes = await db.servicioEnCurso.count({ where: { organizationId: e.ids.clienteA } });

    const r = await e.pedir("clienteA", "POST", "/v1/pedidos", cuerpo);
    assert.equal(r.estado, 201, JSON.stringify(r.cuerpo));
    assert.equal(r.cuerpo.propiedad.id, propiedadA);
    assert.equal(r.cuerpo.propiedadCreada, false);

    const servicio = await db.servicioEnCurso.findUniqueOrThrow({ where: { id: r.cuerpo.servicioId }, include: { tareas: true, solicitud: true } });
    assert.equal(servicio.organizationId, e.ids.clienteA);
    assert.equal(servicio.porRevisar, true);
    assert.equal(servicio.responsableId, null);
    assert.equal(servicio.tareas.length, 1);
    assert.equal(servicio.tareas[0].esRevision, true);
    assert.equal(servicio.tareas[0].responsableId, null);
    assert.ok(servicio.tareas[0].que.startsWith("Revisar y repartir: Necesito"));
    assert.equal(servicio.solicitud?.pedidaPorId, e.ids.usuarioA);
    assert.equal(servicio.solicitud?.estado, "NUEVA");

    // El segundo envío seguido no abre otro.
    const otra = await e.pedir("clienteA", "POST", "/v1/pedidos", cuerpo);
    assert.equal(otra.estado, 409);
    assert.equal(await db.servicioEnCurso.count({ where: { organizationId: e.ids.clienteA } }), antes + 1);

    // Mientras está «por revisar», el dueño lo ve como pedido y no como servicio.
    assert.equal((await e.pedir("clienteA", "GET", `/v1/servicios/${r.cuerpo.servicioId}`)).estado, 404);
    const mios = await e.pedir("clienteA", "GET", "/v1/pedidos");
    const miPedido = mios.cuerpo.items.find((p: { id: string }) => p.id === r.cuerpo.pedidoId);
    assert.equal(miPedido.estado, "NUEVA");
    assert.equal(miPedido.servicioId, null);
    assert.equal((await e.pedir("clienteB", "GET", "/v1/pedidos")).cuerpo.items.length, 0);

    // El equipo lo ve en «Nuevo» del tablero, en la bandeja y en el Inicio.
    const tablero = await e.pedir("equipo", "GET", `/v1/servicios?vista=tablero&cliente=${e.ids.clienteA}`);
    assert.ok(tablero.cuerpo.nuevo.some((i: { id: string }) => i.id === r.cuerpo.servicioId));
    const bandeja = await e.pedir("equipo", "GET", `/v1/pedidos?cliente=${e.ids.clienteA}`);
    const enBandeja = bandeja.cuerpo.items.find((p: { id: string }) => p.id === r.cuerpo.pedidoId);
    assert.equal(enBandeja.pedidoPor.id, e.ids.usuarioA);
    assert.equal(enBandeja.cliente.id, e.ids.clienteA);
    const inicio = await e.pedir("equipo", "GET", `/v1/inicio?cliente=${e.ids.clienteA}`);
    assert.equal(inicio.estado, 200, JSON.stringify(inicio.cuerpo));
    assert.ok(inicio.cuerpo.nuevo.some((i: { id: string }) => i.id === r.cuerpo.servicioId));
    assert.ok(inicio.cuerpo.cifras.nuevosSinRepartir >= 1);

    // Un servicio «por revisar» no se cambia ni se cierra por la ruta de servicios.
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/servicios/${r.cuerpo.servicioId}`, { esperandoA: "BANCO" })).estado, 409);
    assert.equal((await e.pedir("equipo", "POST", `/v1/servicios/${r.cuerpo.servicioId}/cerrar`, { resultado: "CANCELADO", motivo: "x" })).estado, 409);
    // La tarea que abrió el pedido no se borra a mano.
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/tareas/${r.cuerpo.tareaId}`)).estado, 409);

    // Aceptarlo: queda repartido, el pedido ACEPTADA, la tarea hecha y el dueño ya lo ve.
    const aceptado = await e.pedir("equipo", "POST", `/v1/pedidos/${r.cuerpo.pedidoId}/aceptar`, { servicioId: catalogoId, responsableId: e.ids.equipo });
    assert.equal(aceptado.estado, 200, JSON.stringify(aceptado.cuerpo));
    assert.equal(aceptado.cuerpo.estado, "ACEPTADA");
    const despues = await db.servicioEnCurso.findUniqueOrThrow({ where: { id: r.cuerpo.servicioId }, include: { tareas: true } });
    assert.equal(despues.porRevisar, false);
    assert.equal(despues.responsableId, e.ids.equipo);
    assert.ok(despues.tareas.every((t) => t.hechaEl !== null));
    assert.equal((await e.pedir("clienteA", "GET", `/v1/servicios/${r.cuerpo.servicioId}`)).estado, 200);
    // Otra persona que lo intente después recibe 409.
    assert.equal((await e.pedir("jefatura", "POST", `/v1/pedidos/${r.cuerpo.pedidoId}/aceptar`, { servicioId: catalogoId })).estado, 409);
  });

  test("dos envíos a la vez tampoco abren dos servicios", async () => {
    const cuerpo = { tipo: "EVALUACION", descripcion: "Pedido enviado dos veces a la vez", propiedadId: propiedadA };
    const [uno, dos] = await Promise.all([
      e.pedir("clienteA", "POST", "/v1/pedidos", cuerpo),
      e.pedir("clienteA", "POST", "/v1/pedidos", cuerpo),
    ]);
    assert.deepEqual([uno.estado, dos.estado].sort(), [201, 409]);
    assert.equal(await db.solicitud.count({ where: { organizationId: e.ids.clienteA, descripcion: cuerpo.descripcion } }), 1);
  });

  test("pedir para una propiedad nueva la crea en la cartera del cliente; repetirla pide elegirla", async () => {
    const cuerpo = {
      tipo: "EVALUACION",
      descripcion: "Quiero evaluar un departamento nuevo",
      propiedadNueva: { direccion: "Los Leones 123", comuna: "Providencia", tipo: "DEPARTAMENTO" },
    };
    const r = await e.pedir("clienteB", "POST", "/v1/pedidos", cuerpo);
    assert.equal(r.estado, 201, JSON.stringify(r.cuerpo));
    assert.equal(r.cuerpo.propiedadCreada, true);
    const propiedad = await db.property.findUniqueOrThrow({ where: { id: r.cuerpo.propiedad.id } });
    assert.equal(propiedad.organizationId, e.ids.clienteB);
    assert.equal(propiedad.region, "Por confirmar");
    // Con otro texto no es un reenvío, pero la propiedad ya existe: hay que elegirla.
    const otra = await e.pedir("clienteB", "POST", "/v1/pedidos", { ...cuerpo, descripcion: "Otro pedido para la misma dirección" });
    assert.equal(otra.estado, 409);
    assert.ok(otra.cuerpo.error.campos.direccion);
  });

  test("un pedido sobre la propiedad de otro cliente no existe; y hay que elegir una sola forma de propiedad", async () => {
    const base = { tipo: "EVALUACION", descripcion: "Pedido sobre propiedad ajena" };
    assert.equal((await e.pedir("clienteA", "POST", "/v1/pedidos", { ...base, propiedadId: propiedadB })).estado, 404);
    assert.equal((await e.pedir("clienteA", "POST", "/v1/pedidos", base)).estado, 400);
    assert.equal((await e.pedir("clienteA", "POST", "/v1/pedidos", { ...base, propiedadId: propiedadA, descripcion: "corta" })).estado, 400);
    // El equipo no pide: abre el servicio a mano.
    assert.equal((await e.pedir("equipo", "POST", "/v1/pedidos", { ...base, propiedadId: propiedadA })).estado, 403);
  });

  test("rechazar: el motivo es obligatorio y el dueño lo ve en su pedido", async () => {
    const r = await e.pedir("clienteA", "POST", "/v1/pedidos", { tipo: "EVALUACION", descripcion: "Pedido que se va a rechazar", propiedadId: propiedadA });
    assert.equal(r.estado, 201);
    assert.equal((await e.pedir("equipo", "POST", `/v1/pedidos/${r.cuerpo.pedidoId}/rechazar`, { motivo: "" })).estado, 400);
    assert.equal((await e.pedir("clienteA", "POST", `/v1/pedidos/${r.cuerpo.pedidoId}/rechazar`, { motivo: "no" })).estado, 403);
    assert.equal((await e.pedir("clienteB", "POST", `/v1/pedidos/${r.cuerpo.pedidoId}/rechazar`, { motivo: "no" })).estado, 403);
    const ok = await e.pedir("equipo", "POST", `/v1/pedidos/${r.cuerpo.pedidoId}/rechazar`, { motivo: "Fuera de zona" });
    assert.equal(ok.estado, 200);
    assert.equal(ok.cuerpo.estado, "RECHAZADA");
    const mios = await e.pedir("clienteA", "GET", "/v1/pedidos?estado=RECHAZADA");
    const el = mios.cuerpo.items.find((p: { id: string }) => p.id === r.cuerpo.pedidoId);
    assert.equal(el.motivoRechazo, "Fuera de zona");
    assert.equal(el.servicioId, null);
    assert.equal((await e.pedir("equipo", "POST", `/v1/pedidos/${r.cuerpo.pedidoId}/rechazar`, { motivo: "otra vez" })).estado, 409);
  });
});

describe("clientes y llaves", () => {
  test("el cliente B no ve nada de A: 404 en la ficha, la bitácora y los cambios", async () => {
    const lista = await e.pedir("clienteB", "GET", "/v1/servicios?vista=lista");
    assert.equal(lista.estado, 200);
    assert.ok(!JSON.stringify(lista.cuerpo).includes(servicioA));
    for (const ruta of [`/v1/servicios/${servicioA}`, `/v1/servicios/${servicioA}/notas`]) {
      assert.equal((await e.pedir("clienteB", "GET", ruta)).estado, 404, ruta);
    }
    assert.equal((await e.pedir("clienteB", "PATCH", `/v1/servicios/${servicioA}`, { esperandoA: "BANCO" })).estado, 403);
    assert.equal((await e.pedir("clienteB", "POST", `/v1/servicios/${servicioA}/tareas`, { que: "x" })).estado, 403);
    assert.equal((await e.pedir("clienteB", "POST", `/v1/servicios/${servicioA}/cerrar`, { resultado: "TERMINADO", motivo: "x" })).estado, 403);
  });

  test("una llave no escribe: cada POST, PATCH y DELETE responde 403", async () => {
    const tarea = await db.tarea.create({
      data: { organizationId: e.ids.clienteA, servicioEnCursoId: servicioA, que: "Para la llave", creadaPorId: e.ids.equipo },
    });
    const nota = await db.nota.create({
      data: { organizationId: e.ids.clienteA, servicioEnCursoId: servicioA, autorId: e.ids.equipo, texto: "Para la llave" },
    });
    const pedido = await db.solicitud.create({
      data: { organizationId: e.ids.clienteA, propertyId: propiedadA, tipo: "EVALUACION", descripcion: "Para la llave", pedidaPorId: e.ids.usuarioA },
    });
    const fd = new FormData();
    fd.append("texto", "de la llave");
    const intentos: [string, string, unknown?][] = [
      ["POST", "/v1/servicios", { propiedadId: propiedadA, servicioId: catalogoId }],
      ["PATCH", `/v1/servicios/${servicioA}`, { esperandoA: "BANCO" }],
      ["POST", `/v1/servicios/${servicioA}/cerrar`, { resultado: "TERMINADO", motivo: "x" }],
      ["POST", `/v1/servicios/${servicioA}/tareas`, { que: "x" }],
      ["PATCH", `/v1/tareas/${tarea.id}`, { hecha: true }],
      ["DELETE", `/v1/tareas/${tarea.id}`],
      ["POST", `/v1/servicios/${servicioA}/notas`, fd],
      ["PATCH", `/v1/notas/${nota.id}`, { paraDueno: true }],
      ["POST", "/v1/pedidos", { tipo: "EVALUACION", descripcion: "Pedido de la llave", propiedadId: propiedadA }],
      ["POST", `/v1/pedidos/${pedido.id}/aceptar`, { servicioId: catalogoId }],
      ["POST", `/v1/pedidos/${pedido.id}/rechazar`, { motivo: "no" }],
    ];
    for (const [metodo, ruta, cuerpo] of intentos) {
      const r = await e.pedir("llaveA", metodo as "POST", ruta, cuerpo);
      assert.equal(r.estado, 403, `${metodo} ${ruta}: ${JSON.stringify(r.cuerpo)}`);
    }
    // Y nada cambió.
    assert.equal((await db.tarea.findUniqueOrThrow({ where: { id: tarea.id } })).hechaEl, null);
    assert.equal((await db.solicitud.findUniqueOrThrow({ where: { id: pedido.id } })).estado, "NUEVA");
  });

  test("la llave de A ve lo de A, recortado: la lista, la ficha y los pedidos", async () => {
    const lista = await e.pedir("llaveA", "GET", "/v1/servicios?vista=lista");
    assert.equal(lista.estado, 200);
    assert.ok(lista.cuerpo.items.some((s: { id: string }) => s.id === servicioA));
    assert.deepEqual(clavesInternas(lista.cuerpo), []);
    assert.ok(!/"responsable"|"cliente"|"porRevisar"/.test(JSON.stringify(lista.cuerpo)));
    assert.equal((await e.pedir("llaveA", "GET", "/v1/pedidos")).estado, 200);
  });

  test("el inicio del equipo trae cifras, carga y últimas notas con foto, y no filtra el costo", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/inicio?cliente=${e.ids.clienteA}`);
    assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
    assert.equal(r.cuerpo.fecha, dia(0));
    for (const k of ["serviciosEnCurso", "nuevosSinRepartir", "esperando", "esperandoMasDe10Dias", "tareasAtrasadas"]) {
      assert.equal(typeof r.cuerpo.cifras[k], "number", k);
    }
    assert.equal(typeof r.cuerpo.trabado.presupuestosPorAprobar, "number");
    assert.ok(r.cuerpo.ultimasNotasConFoto.length >= 1 && r.cuerpo.ultimasNotasConFoto.length <= 5);
    assert.ok(r.cuerpo.ultimasNotasConFoto.every((n: { fotos: unknown[] }) => n.fotos.length > 0));
    assert.ok(r.cuerpo.carga.some((p: { persona: { id: string } }) => p.persona.id === e.ids.equipo));
    // Hay tareas atrasadas de la prueba de «hoy»: aparecen en lo trabado.
    assert.ok(r.cuerpo.trabado.tareasAtrasadas.some((t: { que: string }) => t.que === "atrasada"));
  });
});

describe("documentación", () => {
  test("todas las rutas de esta área aparecen en /openapi.json con su descripción", async () => {
    const r = await e.app.request("/openapi.json");
    assert.equal(r.status, 200, await r.clone().text());
    const doc = (await r.json()) as { paths: Record<string, Record<string, { description?: string }>> };
    const esperadas: [string, string][] = [
      ["/v1/catalogo", "get"],
      ["/v1/servicios", "get"],
      ["/v1/servicios", "post"],
      ["/v1/servicios/sugeridos", "get"],
      ["/v1/servicios/{id}", "get"],
      ["/v1/servicios/{id}", "patch"],
      ["/v1/servicios/{id}/cerrar", "post"],
      ["/v1/servicios/{id}/tareas", "post"],
      ["/v1/servicios/{id}/notas", "get"],
      ["/v1/servicios/{id}/notas", "post"],
      ["/v1/tareas", "get"],
      ["/v1/tareas/{id}", "patch"],
      ["/v1/tareas/{id}", "delete"],
      ["/v1/notas/{id}", "patch"],
      ["/v1/fotos/{id}", "get"],
      ["/v1/pedidos", "get"],
      ["/v1/pedidos", "post"],
      ["/v1/pedidos/{id}/aceptar", "post"],
      ["/v1/pedidos/{id}/rechazar", "post"],
      ["/v1/inicio", "get"],
      ["/v1/novedades", "get"],
    ];
    for (const [ruta, metodo] of esperadas) {
      const op = doc.paths[ruta]?.[metodo];
      assert.ok(op, `falta ${metodo.toUpperCase()} ${ruta} en /openapi.json`);
      assert.ok(op.description && op.description.length > 20, `${metodo.toUpperCase()} ${ruta} no tiene descripción`);
    }
  });
});
