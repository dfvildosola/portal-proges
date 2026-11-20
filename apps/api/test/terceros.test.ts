// Pruebas de la API para sistemas de terceros: lo que le pasa al área de sistemas de un cliente
// (por ejemplo NPL) que recibe una llave y consulta desde su propia plataforma.
//
// Se prueban cuatro promesas, de punta a punta y con la llave de verdad (no con una sesión):
// 1. La llave del cliente A lee sus propiedades y servicios, recortados igual que lo que ve el
//    dueño en el portal: sin costos, sin presupuestos de maestros, sin notas internas.
// 2. No ve nada del cliente B (404 en lo suelto, y B no aparece en las listas).
// 3. No escribe: crear, cambiar o borrar responde 403 y no deja huella.
// 4. Una llave revocada (o inventada) responde 401 al instante.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { generarLlave } from "../src/acceso/llaves";
import { hoyChile, sumarDias } from "../src/util/fechas";
import { clavesInternas, crearEscenario, type Escenario } from "./ayuda";

// Textos que solo existen en datos internos: si aparecen en lo que recibe la llave, hubo fuga.
const SECRETOS = ["NOTA_INTERNA_XYZ", "OBSERVACION_INTERNA", "TAREA_INTERNA_XYZ", "INTERESADO_XYZ", "OFERENTE_OCULTO"];

let e: Escenario;
let sufijo: string;
let propA: string;
let propB: string;
let obraA: string;
let ventaA: string;
let servicioB: string;
let catalogoId: string;
let maestroId: string;
const hoy = hoyChile();

// Lo que recibe la llave, como texto, para buscar fugas en cualquier parte de la respuesta.
function sinSecretos(cuerpo: unknown): void {
  const texto = JSON.stringify(cuerpo);
  for (const secreto of SECRETOS) assert.ok(!texto.includes(secreto), `La llave recibió «${secreto}», que es interno.`);
  assert.deepEqual(clavesInternas(cuerpo), []);
}

before(async () => {
  e = await crearEscenario();
  sufijo = e.ids.clienteA.replace("prueba_a_", "");
  const casa = (cliente: string, direccion: string) =>
    db.property.create({ data: { organizationId: cliente, tipo: "CASA", direccion, comuna: "Ñuñoa", region: "RM" } });
  propA = (await casa(e.ids.clienteA, `Calle Terceros ${sufijo} 100`)).id;
  propB = (await casa(e.ids.clienteB, `Calle Ajena ${sufijo} 200`)).id;

  catalogoId = (
    await db.servicio.create({ data: { organizationId: ORG_PROGES, codigo: `TERC-${sufijo}`, familia: "RR", nombre: `Servicio de terceros ${sufijo}` } })
  ).id;
  maestroId = (
    await db.maestro.create({
      data: { organizationId: ORG_PROGES, odooPartnerId: Math.floor(Math.random() * 1_000_000_000) + 1_000_000, nombre: `Maestro terceros ${sufijo}` },
    })
  ).id;

  // Una obra de A con todo lo que el dueño no debe ver: costo del maestro, nota interna, tarea y
  // la observación interna de una recepción.
  const obra = await db.servicioEnCurso.create({
    data: {
      organizationId: e.ids.clienteA,
      propertyId: propA,
      servicioId: catalogoId,
      tipo: "OBRA",
      responsableId: e.ids.equipo,
      esperandoA: "CONSERVADOR",
      esperandoDesde: sumarDias(hoy, -5),
      inicioObra: sumarDias(hoy, -10),
    },
  });
  obraA = obra.id;
  const orden = await db.ordenDueno.create({
    data: { organizationId: e.ids.clienteA, servicioEnCursoId: obra.id, numero: "S99998", odooOrderId: 99998, total: "1000000", moneda: "CLP" },
  });
  await db.presupuestoMaestro.create({
    data: {
      organizationId: e.ids.clienteA,
      servicioEnCursoId: obra.id,
      maestroId,
      total: "600000",
      plazoDias: 15,
      estado: "APROBADO",
      cargadoPorId: e.ids.equipo,
      resueltoEl: new Date(),
    },
  });
  await db.partida.create({
    data: {
      organizationId: e.ids.clienteA,
      servicioEnCursoId: obra.id,
      ordenId: orden.id,
      recinto: "Baño",
      descripcion: "Cambiar tina",
      precioDueno: "400000",
      avance: 100,
      recepcion: "CONFORME",
      recibidaEl: new Date(),
      observacion: "OBSERVACION_INTERNA",
      posicion: 1,
    },
  });
  await db.nota.createMany({
    data: [
      { organizationId: e.ids.clienteA, servicioEnCursoId: obra.id, autorId: e.ids.equipo, texto: "NOTA_PUBLICA_XYZ", paraDueno: true },
      { organizationId: e.ids.clienteA, servicioEnCursoId: obra.id, autorId: e.ids.equipo, texto: "NOTA_INTERNA_XYZ", paraDueno: false },
    ],
  });
  await db.tarea.create({
    data: { organizationId: e.ids.clienteA, servicioEnCursoId: obra.id, que: "TAREA_INTERNA_XYZ", creadaPorId: e.ids.equipo, responsableId: e.ids.equipo },
  });

  // Una venta de A con una oferta ya mostrada al dueño y otra que no.
  const venta = await db.servicioEnCurso.create({
    data: { organizationId: e.ids.clienteA, propertyId: propA, servicioId: catalogoId, tipo: "VENTA" },
  });
  ventaA = venta.id;
  await db.visita.create({
    data: { organizationId: e.ids.clienteA, servicioEnCursoId: venta.id, fecha: sumarDias(hoy, -2), interesadoNombre: "INTERESADO_XYZ", evaluacion: 4, comentario: "Le gustó el patio" },
  });
  await db.oferta.createMany({
    data: [
      { organizationId: e.ids.clienteA, servicioEnCursoId: venta.id, fecha: sumarDias(hoy, -1), monto: "90000000", moneda: "CLP", oferente: "OFERENTE_VISTO", mostradaAlDuenoEl: new Date() },
      { organizationId: e.ids.clienteA, servicioEnCursoId: venta.id, fecha: sumarDias(hoy, -1), monto: "80000000", moneda: "CLP", oferente: "OFERENTE_OCULTO" },
    ],
  });

  // Un servicio del cliente B: la llave de A no puede ni saber que existe.
  servicioB = (
    await db.servicioEnCurso.create({ data: { organizationId: e.ids.clienteB, propertyId: propB, servicioId: catalogoId, tipo: "INSPECCION" } })
  ).id;
});

after(async () => {
  await e.limpiar();
  await db.maestro.deleteMany({ where: { id: maestroId } });
  await db.servicio.deleteMany({ where: { id: catalogoId } });
});

describe("la llave del cliente A lee lo suyo, recortado", () => {
  test("/v1/yo dice de qué cliente es la llave", async () => {
    const r = await e.pedir("llaveA", "GET", "/v1/yo");
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.tipo, "llave");
    assert.equal(r.cuerpo.cliente.id, e.ids.clienteA);
  });

  test("lista sus propiedades y ninguna de B", async () => {
    const r = await e.pedir("llaveA", "GET", "/v1/propiedades?porPagina=100");
    assert.equal(r.estado, 200);
    const ids = r.cuerpo.items.map((p: { id: string }) => p.id);
    assert.ok(ids.includes(propA));
    assert.ok(!ids.includes(propB));
    assert.ok(r.cuerpo.items.every((p: { clienteId: string }) => p.clienteId === e.ids.clienteA));
    sinSecretos(r.cuerpo);
  });

  test("pedir el cliente de B no lo cambia: sigue viendo solo lo suyo", async () => {
    const r = await e.pedir("llaveA", "GET", `/v1/propiedades?cliente=${e.ids.clienteB}&porPagina=100`);
    assert.equal(r.estado, 200);
    assert.ok(r.cuerpo.items.every((p: { clienteId: string }) => p.clienteId === e.ids.clienteA));
  });

  test("la ficha de una propiedad no trae costos, márgenes ni notas internas", async () => {
    const r = await e.pedir("llaveA", "GET", `/v1/propiedades/${propA}`);
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.propiedad.id, propA);
    sinSecretos(r.cuerpo);
    // Lo que el dueño sí ve de una reparación es lo que se le cobró, nunca lo que costó.
    assert.ok(!JSON.stringify(r.cuerpo).includes("600000"));
  });

  test("el historial, las reparaciones y los documentos también van recortados", async () => {
    for (const ruta of ["/historial", "/reparaciones", "/documentos"]) {
      const r = await e.pedir("llaveA", "GET", `/v1/propiedades/${propA}${ruta}`);
      assert.equal(r.estado, 200, ruta);
      sinSecretos(r.cuerpo);
    }
  });

  test("lista sus servicios y ninguno de B", async () => {
    const r = await e.pedir("llaveA", "GET", "/v1/servicios?vista=lista&porPagina=100");
    assert.equal(r.estado, 200);
    const ids = r.cuerpo.items.map((s: { id: string }) => s.id);
    assert.ok(ids.includes(obraA));
    assert.ok(ids.includes(ventaA));
    assert.ok(!ids.includes(servicioB));
    sinSecretos(r.cuerpo);
  });

  test("el tablero de trabajo es solo del equipo", async () => {
    const r = await e.pedir("llaveA", "GET", "/v1/servicios?vista=tablero");
    assert.equal(r.estado, 403);
  });

  test("la ficha de un servicio trae solo las notas marcadas para el dueño y nunca tareas", async () => {
    const r = await e.pedir("llaveA", "GET", `/v1/servicios/${obraA}`);
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.id, obraA);
    assert.equal(r.cuerpo.tareas, undefined);
    const texto = JSON.stringify(r.cuerpo);
    assert.ok(texto.includes("NOTA_PUBLICA_XYZ"));
    sinSecretos(r.cuerpo);
  });

  test("el reporte de venta va sin nombres de interesados y solo con las ofertas ya mostradas", async () => {
    const r = await e.pedir("llaveA", "GET", `/v1/servicios/${ventaA}/venta`);
    assert.equal(r.estado, 200);
    const texto = JSON.stringify(r.cuerpo);
    assert.ok(texto.includes("90000000"), "la oferta mostrada al dueño tiene que verse");
    assert.ok(!texto.includes("80000000"), "la oferta que Proges no mostró no tiene que verse");
    sinSecretos(r.cuerpo);
  });

  test("novedades y vencimientos salen solo con lo suyo", async () => {
    for (const ruta of ["/v1/novedades", "/v1/vencimientos"]) {
      const r = await e.pedir("llaveA", "GET", ruta);
      assert.equal(r.estado, 200, ruta);
      sinSecretos(r.cuerpo);
      assert.ok(!JSON.stringify(r.cuerpo).includes(propB), `${ruta} nombra una propiedad de B`);
    }
  });

  test("novedades con servicioId trae solo ese servicio, y el de otro cliente sale vacío", async () => {
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/servicios/${obraA}`, { esperandoA: "NOTARIA" })).estado, 200);
    const suyo = await e.pedir("llaveA", "GET", `/v1/novedades?servicioId=${obraA}`);
    assert.equal(suyo.estado, 200);
    assert.ok(suyo.cuerpo.items.length > 0);
    assert.ok(suyo.cuerpo.items.every((i: { servicio: { id: string } }) => i.servicio.id === obraA));
    const ajeno = await e.pedir("llaveA", "GET", `/v1/novedades?servicioId=${servicioB}`);
    assert.equal(ajeno.estado, 200);
    assert.deepEqual(ajeno.cuerpo.items, []);
    await e.pedir("equipo", "PATCH", `/v1/servicios/${obraA}`, { esperandoA: null });
  });

  test("lo interno de Proges (equipo, maestros, llaves, resultados) responde 403", async () => {
    for (const ruta of ["/v1/equipo", "/v1/maestros", "/v1/llaves", "/v1/resultados", "/v1/clientes", "/v1/usuarios", "/v1/tareas"]) {
      const r = await e.pedir("llaveA", "GET", ruta);
      assert.equal(r.estado, 403, ruta);
    }
  });
});

describe("la llave del cliente A no ve nada del cliente B", () => {
  test("lo suelto de B responde 404, igual que algo que no existe", async () => {
    const rutas = [
      `/v1/propiedades/${propB}`,
      `/v1/propiedades/${propB}/historial`,
      `/v1/propiedades/${propB}/reparaciones`,
      `/v1/propiedades/${propB}/documentos`,
      `/v1/servicios/${servicioB}`,
      `/v1/servicios/${servicioB}/venta`,
      `/v1/servicios/${servicioB}/notas`,
    ];
    for (const ruta of rutas) {
      const r = await e.pedir("llaveA", "GET", ruta);
      assert.equal(r.estado, 404, ruta);
      assert.ok(!JSON.stringify(r.cuerpo).includes(`Calle Ajena ${sufijo}`));
    }
  });

  test("la regla es la misma para una persona del cliente B: tampoco ve lo de A", async () => {
    const r = await e.pedir("clienteB", "GET", `/v1/propiedades/${propA}`);
    assert.equal(r.estado, 404);
  });
});

describe("la llave no escribe", () => {
  test("crear, cambiar y borrar responden 403 y no dejan huella", async () => {
    const intentos: Array<[string, "POST" | "PATCH" | "DELETE", string, unknown?]> = [
      ["pedir un servicio", "POST", "/v1/pedidos", { tipo: "INSPECCION", descripcion: "Quiero una inspección de la propiedad", propiedadId: propA }],
      ["crear una propiedad", "POST", "/v1/propiedades", { clienteId: e.ids.clienteA, tipo: "CASA", direccion: "Calle Nueva 1", comuna: "Ñuñoa", region: "RM" }],
      ["cambiar una propiedad", "PATCH", `/v1/propiedades/${propA}`, { direccion: "Otra dirección 999" }],
      ["borrar una propiedad", "DELETE", `/v1/propiedades/${propA}`],
      ["cerrar un servicio", "POST", `/v1/servicios/${obraA}/cerrar`, { resultado: "TERMINADO", motivo: "Cerrado por la llave" }],
      ["responder una oferta", "POST", "/v1/ofertas/inexistente/responder", { respuesta: "ACEPTA" }],
    ];
    for (const [que, metodo, ruta, cuerpo] of intentos) {
      const r = await e.pedir("llaveA", metodo, ruta, cuerpo);
      assert.equal(r.estado, 403, `${que}: ${JSON.stringify(r.cuerpo)}`);
      assert.equal(typeof r.cuerpo.error.mensaje, "string");
    }
    const intacta = await db.property.findUniqueOrThrow({ where: { id: propA } });
    assert.equal(intacta.direccion, `Calle Terceros ${sufijo} 100`);
    assert.equal(await db.property.count({ where: { organizationId: e.ids.clienteA, direccion: "Calle Nueva 1" } }), 0);
    assert.equal(await db.solicitud.count({ where: { organizationId: e.ids.clienteA } }), 0);
    const servicio = await db.servicioEnCurso.findUniqueOrThrow({ where: { id: obraA } });
    assert.equal(servicio.estado, "ABIERTO");
  });
});

describe("una llave revocada o inventada deja de servir", () => {
  test("revocada responde 401 al instante, y las demás llaves siguen sirviendo", async () => {
    const nueva = generarLlave();
    const registro = await db.llaveApi.create({
      data: { organizationId: e.ids.clienteA, nombre: "Llave por revocar", prefijo: nueva.prefijo, huella: nueva.huella, creadaPorId: e.ids.admin },
    });
    const conLaNueva = { token: nueva.llave };
    assert.equal((await e.pedir(conLaNueva, "GET", "/v1/yo")).estado, 200);
    assert.equal((await e.pedir(conLaNueva, "GET", "/v1/propiedades")).estado, 200);

    await db.llaveApi.update({ where: { id: registro.id }, data: { revocadaEl: new Date() } });

    for (const ruta of ["/v1/yo", "/v1/propiedades", `/v1/propiedades/${propA}`, "/v1/servicios?vista=lista"]) {
      const r = await e.pedir(conLaNueva, "GET", ruta);
      assert.equal(r.estado, 401, ruta);
      assert.match(r.cuerpo.error.mensaje, /llave/);
    }
    assert.equal((await e.pedir("llaveA", "GET", "/v1/yo")).estado, 200);
  });

  test("una llave con la forma correcta pero que no existe responde 401", async () => {
    const r = await e.pedir({ token: generarLlave().llave }, "GET", "/v1/yo");
    assert.equal(r.estado, 401);
  });

  test("sin llave responde 401", async () => {
    assert.equal((await e.pedir("anonimo", "GET", "/v1/propiedades")).estado, 401);
  });
});
