// Pruebas del corretaje: el reporte (que el dueño no reciba nombres ni contacto), la respuesta
// del dueño a una oferta, las cifras semanales y el precio. Las funciones puras (cálculos) se
// prueban primero, sin base; después las rutas con el escenario de dos clientes y una llave.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { deFechaISO, esLunes, lunesDe } from "../src/dominio/venta/fechas";
import {
  diasPublicada,
  esperaRespuestaDueno,
  mejorOferta,
  seriePorSemana,
  sumarCifras,
} from "../src/dominio/venta/indicadores";
import { estadoTrasRespuesta, textoTareaRespuesta } from "../src/dominio/venta/reglas";
import { aFechaISO } from "../src/util/al-contrato";
import { hoyChile, sumarDias } from "../src/util/fechas";
import { clavesInternas, crearEscenario, type Escenario } from "./ayuda";

const d = deFechaISO;

describe("cálculos del corretaje (puros)", () => {
  test("lunes: reconoce el lunes y encuentra el de la semana", () => {
    assert.equal(esLunes(d("2026-11-02")), true);
    assert.equal(esLunes(d("2026-11-03")), false);
    assert.equal(aFechaISO(lunesDe(d("2026-11-08"))), "2026-11-02"); // domingo
    assert.equal(aFechaISO(lunesDe(d("2026-11-02"))), "2026-11-02"); // ya es lunes
    assert.equal(aFechaISO(lunesDe(d("2026-11-05"))), "2026-11-02"); // jueves
  });

  test("días publicada: desde el primer anuncio hasta hoy, o hasta que se cerró", () => {
    assert.equal(diasPublicada([], d("2026-11-19")), null);
    assert.equal(diasPublicada([d("2026-11-10"), d("2026-11-01")], d("2026-11-19")), 18);
    assert.equal(diasPublicada([d("2026-11-01")], d("2026-11-19"), new Date("2026-11-11T15:00:00Z")), 10);
    assert.equal(diasPublicada([d("2026-11-25")], d("2026-11-19")), 0);
  });

  test("las consultas se suman, y una semana sin anotar no cuenta", () => {
    const cifras = [
      { semana: d("2026-11-02"), vistas: 100, consultas: 5 },
      { semana: d("2026-11-09"), vistas: 80, consultas: 7 },
      { semana: d("2026-11-16"), vistas: null, consultas: null },
    ];
    assert.deepEqual(sumarCifras(cifras), { vistas: 180, consultas: 12 });
  });

  test("por semana: junta cifras de varios anuncios y las visitas, ordenado", () => {
    const serie = seriePorSemana(
      [
        { semana: d("2026-11-09"), vistas: 10, consultas: 1 },
        { semana: d("2026-11-09"), vistas: 5, consultas: 2 },
        { semana: d("2026-11-02"), vistas: 7, consultas: null },
      ],
      [d("2026-11-04"), d("2026-11-10"), d("2026-11-11")],
    );
    assert.deepEqual(
      serie.map((s) => [aFechaISO(s.semana), s.vistas, s.consultas, s.visitas]),
      [
        ["2026-11-02", 7, 0, 1],
        ["2026-11-09", 15, 3, 2],
      ],
    );
  });

  test("la mejor oferta: vigente, mayor monto, en la moneda del precio", () => {
    const o = (id: string, monto: string, moneda: "CLP" | "UF", estado: "RECIBIDA" | "RECHAZADA" | "CAIDA") => ({
      id,
      monto,
      moneda,
      estado,
    });
    const ofertas = [
      o("a", "3000", "UF", "RECIBIDA"),
      o("b", "120000000", "CLP", "RECIBIDA"),
      o("c", "3500", "UF", "RECHAZADA"),
      o("d", "3100", "UF", "RECIBIDA"),
    ];
    assert.equal(mejorOferta(ofertas, "UF")?.id, "d");
    assert.equal(mejorOferta(ofertas, "CLP")?.id, "b");
    assert.equal(mejorOferta(ofertas, null)?.id, "d"); // sin precio: la moneda de la primera vigente (UF)
    assert.equal(mejorOferta([o("x", "1", "UF", "CAIDA")], "UF"), null);
  });

  test("se espera al dueño si hay una oferta mostrada sin respuesta, o si Proges lo marcó", () => {
    const sinResponder = { estado: "RECIBIDA", mostradaAlDuenoEl: new Date(), respuestaDueno: null };
    assert.equal(esperaRespuestaDueno([sinResponder], null), true);
    assert.equal(esperaRespuestaDueno([{ ...sinResponder, mostradaAlDuenoEl: null }], null), false);
    assert.equal(esperaRespuestaDueno([{ ...sinResponder, respuestaDueno: "ACEPTA" }], null), false);
    assert.equal(esperaRespuestaDueno([], "DUENO"), true);
    assert.equal(esperaRespuestaDueno([], "NOTARIA"), false);
  });

  test("cada respuesta deja un estado, y el texto de la tarea dice qué hacer", () => {
    assert.equal(estadoTrasRespuesta("ACEPTA"), "ACEPTADA");
    assert.equal(estadoTrasRespuesta("CONTRAOFERTA"), "CONTRAOFERTADA");
    assert.equal(estadoTrasRespuesta("RECHAZA"), "RECHAZADA");
    const texto = textoTareaRespuesta({
      respuesta: "CONTRAOFERTA",
      oferente: "Ana",
      monto: { valor: "3000", moneda: "UF" },
      contraoferta: { valor: "3300", moneda: "UF" },
    });
    assert.match(texto, /^Comunicar la respuesta del dueño al oferente/);
    assert.match(texto, /3300 UF/);
  });
});

describe("rutas del corretaje", () => {
  let e: Escenario;
  let servicioA: string;
  let servicioB: string;
  let codigoCatalogo: string;
  const hoy = hoyChile();
  const fechaVisita = aFechaISO(sumarDias(hoy, -3));
  const lunesAntepasado = aFechaISO(lunesDe(sumarDias(hoy, -14)));
  const lunesPasado = aFechaISO(lunesDe(sumarDias(hoy, -7)));

  before(async () => {
    e = await crearEscenario();
    codigoCatalogo = `PRUEBA-VENTA-${e.ids.clienteA}`;
    const catalogo = await db.servicio.create({
      data: { organizationId: ORG_PROGES, codigo: codigoCatalogo, familia: "NV", nombre: "Venta de prueba" },
    });
    const servicioDe = async (orgId: string, responsableId: string | null) => {
      const propiedad = await db.property.create({
        data: { organizationId: orgId, tipo: "CASA", direccion: "Agustinas 715", comuna: "Santiago", region: "RM" },
      });
      const s = await db.servicioEnCurso.create({
        data: {
          organizationId: orgId,
          propertyId: propiedad.id,
          servicioId: catalogo.id,
          tipo: "VENTA",
          responsableId,
        },
      });
      return s.id;
    };
    servicioA = await servicioDe(e.ids.clienteA, e.ids.equipo);
    servicioB = await servicioDe(e.ids.clienteB, null);
  });

  after(async () => {
    await e.limpiar();
    await db.servicio.deleteMany({ where: { organizationId: ORG_PROGES, codigo: codigoCatalogo } });
  });

  let ofertaMostrada: string;
  let ofertaOculta: string;
  let anuncioId: string;

  test("el equipo anota visita, anuncio, cifras y ofertas; la llave no puede escribir", async () => {
    const visita = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/visitas`, {
      fecha: fechaVisita,
      interesadoNombre: "Valentina Rojas",
      interesadoContacto: "+56 9 5555 1234",
      evaluacion: 4,
      comentario: "Le gustó el patio",
    });
    assert.equal(visita.estado, 201);
    assert.equal(visita.cuerpo.interesadoNombre, "Valentina Rojas");

    const anuncio = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/anuncios`, {
      portal: "Nexxos",
      url: "https://nexxos.example/aviso/1",
      desde: aFechaISO(sumarDias(hoy, -20)),
    });
    assert.equal(anuncio.estado, 201);
    anuncioId = anuncio.cuerpo.id;

    assert.equal((await e.pedir("equipo", "PUT", `/v1/anuncios/${anuncioId}/cifras/${lunesAntepasado}`, { vistas: 100, consultas: 5 })).estado, 200);
    assert.equal((await e.pedir("equipo", "PUT", `/v1/anuncios/${anuncioId}/cifras/${lunesPasado}`, { vistas: 80, consultas: 7 })).estado, 200);

    const mostrada = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/ofertas`, {
      monto: { valor: "3000", moneda: "UF" },
      oferente: "Carlos Pérez Oferente",
      nota: "Quiere financiar con hipotecario",
    });
    assert.equal(mostrada.estado, 201);
    ofertaMostrada = mostrada.cuerpo.id;
    const oculta = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/ofertas`, {
      monto: { valor: "2800", moneda: "UF" },
      oferente: "Marta Oculta",
    });
    ofertaOculta = oculta.cuerpo.id;
    const mostrar = await e.pedir("equipo", "POST", `/v1/ofertas/${ofertaMostrada}/mostrar`, {
      recomendacion: "Recomendamos contraofertar por 3.300 UF.",
    });
    assert.equal(mostrar.estado, 200);
    assert.ok(mostrar.cuerpo.mostradaAlDuenoEl);
    assert.equal(mostrar.cuerpo.mostradaPor.id, e.ids.equipo);

    // La llave de A solo lee.
    for (const [metodo, ruta, cuerpo] of [
      ["POST", `/v1/servicios/${servicioA}/visitas`, { fecha: fechaVisita }],
      ["POST", `/v1/servicios/${servicioA}/ofertas`, { monto: { valor: "1", moneda: "UF" }, oferente: "X" }],
      ["POST", `/v1/servicios/${servicioA}/anuncios`, { portal: "X", desde: fechaVisita }],
      ["PUT", `/v1/anuncios/${anuncioId}/cifras/${lunesPasado}`, { vistas: 1 }],
      ["POST", `/v1/ofertas/${ofertaOculta}/mostrar`, {}],
    ] as const) {
      assert.equal((await e.pedir("llaveA", metodo, ruta, cuerpo)).estado, 403, `${metodo} ${ruta}`);
    }
  });

  test("un dueño no recibe nombres ni contacto de interesados, ni oferentes ni notas, ni ofertas sin mostrar", async () => {
    const r = await e.pedir("clienteA", "GET", `/v1/servicios/${servicioA}/venta`);
    assert.equal(r.estado, 200);
    const texto = JSON.stringify(r.cuerpo);
    for (const secreto of ["Valentina", "5555 1234", "Carlos", "Marta", "financiar", "Oculta", e.ids.equipo]) {
      assert.ok(!texto.includes(secreto), `el reporte del dueño no debe contener «${secreto}»`);
    }
    assert.deepEqual(clavesInternas(r.cuerpo), []);
    assert.equal(r.cuerpo.visitas.length, 1);
    assert.equal(r.cuerpo.visitas[0].comentario, "Le gustó el patio");
    assert.equal(r.cuerpo.ofertas.length, 1);
    assert.equal(r.cuerpo.ofertas[0].recomendacion, "Recomendamos contraofertar por 3.300 UF.");
    assert.equal(r.cuerpo.totales.ofertas, 1);
    assert.equal(r.cuerpo.esperaRespuestaDueno, true);
  });

  test("el reporte suma bien las consultas, las vistas y los días publicada", async () => {
    const r = await e.pedir("clienteA", "GET", `/v1/servicios/${servicioA}/venta`);
    assert.equal(r.cuerpo.totales.consultas, 12);
    assert.equal(r.cuerpo.totales.vistas, 180);
    assert.equal(r.cuerpo.totales.visitas, 1);
    assert.equal(r.cuerpo.diasPublicada, 20);
    assert.equal(r.cuerpo.anuncios.length, 1);
    assert.equal(r.cuerpo.anuncios[0].consultas, 12);
    assert.deepEqual(
      r.cuerpo.anuncios[0].semanas.map((s: { semana: string }) => s.semana),
      [lunesAntepasado, lunesPasado],
    );
    assert.equal(r.cuerpo.mejorOferta.monto.valor, "3000");
  });

  test("el equipo ve todo: interesados, oferentes, notas y ofertas sin mostrar", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/servicios/${servicioA}/venta`);
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.visitas[0].interesadoNombre, "Valentina Rojas");
    assert.equal(r.cuerpo.ofertas.length, 2);
    assert.equal(r.cuerpo.totales.ofertas, 2);
    assert.ok(r.cuerpo.ofertas.some((o: { nota: string | null }) => o.nota === "Quiere financiar con hipotecario"));
  });

  test("la llave de A lee el reporte recortado; el cliente B no ve el servicio de A", async () => {
    const llave = await e.pedir("llaveA", "GET", `/v1/servicios/${servicioA}/venta`);
    assert.equal(llave.estado, 200);
    assert.ok(!JSON.stringify(llave.cuerpo).includes("Valentina"));
    assert.equal((await e.pedir("clienteB", "GET", `/v1/servicios/${servicioA}/venta`)).estado, 404);
    assert.equal((await e.pedir("clienteA", "GET", `/v1/servicios/${servicioB}/venta`)).estado, 404);
    assert.equal((await e.pedir("anonimo", "GET", `/v1/servicios/${servicioA}/venta`)).estado, 401);
  });

  test("las cifras rechazan una semana que no es lunes y corrigen la misma semana sin duplicar", async () => {
    const martes = aFechaISO(sumarDias(d(lunesPasado), 1));
    const mala = await e.pedir("equipo", "PUT", `/v1/anuncios/${anuncioId}/cifras/${martes}`, { vistas: 1 });
    assert.equal(mala.estado, 400);
    assert.ok(mala.cuerpo.error.campos.semana);

    const corregida = await e.pedir("equipo", "PUT", `/v1/anuncios/${anuncioId}/cifras/${lunesPasado}`, { consultas: 9 });
    assert.equal(corregida.estado, 200);
    assert.deepEqual(corregida.cuerpo, { semana: lunesPasado, vistas: 80, consultas: 9 });
    assert.equal(await db.anuncioCifra.count({ where: { anuncioId } }), 2);
    assert.equal((await e.pedir("equipo", "PUT", `/v1/anuncios/${anuncioId}/cifras/${lunesPasado}`, {})).estado, 400);
    // Se deja como estaba para las otras pruebas.
    await e.pedir("equipo", "PUT", `/v1/anuncios/${anuncioId}/cifras/${lunesPasado}`, { consultas: 7 });
  });

  test("responder: la llave 403, el equipo 403, el cliente B 404, y sin mostrar 409", async () => {
    assert.equal((await e.pedir("llaveA", "POST", `/v1/ofertas/${ofertaMostrada}/responder`, { respuesta: "ACEPTA" })).estado, 403);
    assert.equal((await e.pedir("equipo", "POST", `/v1/ofertas/${ofertaMostrada}/responder`, { respuesta: "ACEPTA" })).estado, 403);
    assert.equal((await e.pedir("clienteB", "POST", `/v1/ofertas/${ofertaMostrada}/responder`, { respuesta: "ACEPTA" })).estado, 404);
    const sinMostrar = await e.pedir("clienteA", "POST", `/v1/ofertas/${ofertaOculta}/responder`, { respuesta: "RECHAZA" });
    assert.equal(sinMostrar.estado, 409);
    assert.equal((await db.oferta.findUniqueOrThrow({ where: { id: ofertaOculta } })).estado, "RECIBIDA");
  });

  test("el dueño contraoferta: cambia el estado, queda quién y cuándo, y llega una tarea al responsable", async () => {
    const sinMonto = await e.pedir("clienteA", "POST", `/v1/ofertas/${ofertaMostrada}/responder`, { respuesta: "CONTRAOFERTA" });
    assert.equal(sinMonto.estado, 400);
    const otraMoneda = await e.pedir("clienteA", "POST", `/v1/ofertas/${ofertaMostrada}/responder`, {
      respuesta: "CONTRAOFERTA",
      monto: { valor: "100", moneda: "CLP" },
    });
    assert.equal(otraMoneda.estado, 400);

    const r = await e.pedir("clienteA", "POST", `/v1/ofertas/${ofertaMostrada}/responder`, {
      respuesta: "CONTRAOFERTA",
      monto: { valor: "3300", moneda: "UF" },
    });
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.estado, "CONTRAOFERTADA");
    assert.deepEqual(r.cuerpo.respuestaDelDueno.contraoferta, { valor: "3300", moneda: "UF" });
    assert.ok(!JSON.stringify(r.cuerpo).includes("Carlos"));

    const guardada = await db.oferta.findUniqueOrThrow({ where: { id: ofertaMostrada } });
    assert.equal(guardada.respondidaPorId, e.ids.usuarioA);
    assert.ok(guardada.respondidaEl);

    const tareas = await db.tarea.findMany({ where: { servicioEnCursoId: servicioA } });
    assert.equal(tareas.length, 1);
    assert.equal(tareas[0].responsableId, e.ids.equipo);
    assert.match(tareas[0].que, /Comunicar la respuesta del dueño al oferente/);
    assert.equal(tareas[0].hechaEl, null);

    // Segunda respuesta: 409 y no se crea otra tarea.
    const otra = await e.pedir("clienteA", "POST", `/v1/ofertas/${ofertaMostrada}/responder`, { respuesta: "ACEPTA" });
    assert.equal(otra.estado, 409);
    assert.equal(await db.tarea.count({ where: { servicioEnCursoId: servicioA } }), 1);

    // Ya no esperamos a nadie: la otra oferta sigue sin mostrarse.
    const reporte = await e.pedir("clienteA", "GET", `/v1/servicios/${servicioA}/venta`);
    assert.equal(reporte.cuerpo.esperaRespuestaDueno, false);
    assert.equal(reporte.cuerpo.ofertas[0].respuestaDelDueno.respuesta, "CONTRAOFERTA");
  });

  test("el precio: el primero sin motivo, el segundo exige motivo, la historia queda anotada", async () => {
    const ruta = `/v1/servicios/${servicioA}/precio`;
    const primero = await e.pedir("equipo", "POST", ruta, { monto: { valor: "3500", moneda: "UF" }, origen: "PROPIETARIO" });
    assert.equal(primero.estado, 201);
    assert.equal(primero.cuerpo.cambio.anterior, null);

    const sinMotivo = await e.pedir("equipo", "POST", ruta, { monto: { valor: "3300", moneda: "UF" }, origen: "SUGERIDO_PROGES" });
    assert.equal(sinMotivo.estado, 400);
    const igual = await e.pedir("equipo", "POST", ruta, { monto: { valor: "3500", moneda: "UF" }, origen: "PROPIETARIO", motivo: "x" });
    assert.equal(igual.estado, 409);
    const cero = await e.pedir("equipo", "POST", ruta, { monto: { valor: "0", moneda: "UF" }, origen: "PROPIETARIO", motivo: "x" });
    assert.equal(cero.estado, 400);

    const segundo = await e.pedir("equipo", "POST", ruta, {
      monto: { valor: "3300", moneda: "UF" },
      origen: "SUGERIDO_PROGES",
      motivo: "Sin visitas en dos semanas",
    });
    assert.equal(segundo.estado, 201);
    assert.deepEqual(segundo.cuerpo.cambio.anterior, { valor: "3500", moneda: "UF" });

    const dueno = await e.pedir("clienteA", "GET", `/v1/servicios/${servicioA}/venta`);
    assert.deepEqual(dueno.cuerpo.precio, { valor: "3300", moneda: "UF" });
    assert.equal(dueno.cuerpo.historiaPrecio.length, 2);
    assert.ok(!JSON.stringify(dueno.cuerpo.historiaPrecio).includes("Sin visitas"), "el motivo es solo del equipo");
    assert.equal((await e.pedir("llaveA", "POST", ruta, { monto: { valor: "1", moneda: "UF" }, origen: "PROPIETARIO" })).estado, 403);
    assert.equal((await e.pedir("clienteA", "POST", ruta, { monto: { valor: "1", moneda: "UF" }, origen: "PROPIETARIO" })).estado, 403);
  });

  test("una visita se corrige y se borra; un servicio cerrado ya no admite cambios", async () => {
    const lista = await e.pedir("equipo", "GET", `/v1/servicios/${servicioA}/venta`);
    const visitaId = lista.cuerpo.visitas[0].id;
    const cambio = await e.pedir("equipo", "PATCH", `/v1/visitas/${visitaId}`, { evaluacion: 2, interesadoContacto: null });
    assert.equal(cambio.estado, 200);
    assert.equal(cambio.cuerpo.evaluacion, 2);
    assert.equal(cambio.cuerpo.interesadoContacto, null);
    assert.equal((await e.pedir("clienteB", "PATCH", `/v1/visitas/${visitaId}`, { evaluacion: 1 })).estado, 403);

    const futura = await e.pedir("equipo", "POST", `/v1/servicios/${servicioA}/visitas`, { fecha: aFechaISO(sumarDias(hoy, 5)) });
    assert.equal(futura.estado, 400);

    await db.servicioEnCurso.update({ where: { id: servicioA }, data: { estado: "TERMINADO", cerradoEl: new Date() } });
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/visitas/${visitaId}`)).estado, 409);
    await db.servicioEnCurso.update({ where: { id: servicioA }, data: { estado: "ABIERTO", cerradoEl: null } });
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/visitas/${visitaId}`)).estado, 204);
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/anuncios/${anuncioId}`)).estado, 204);
    assert.equal(await db.anuncioCifra.count({ where: { anuncioId } }), 0);
  });
});
