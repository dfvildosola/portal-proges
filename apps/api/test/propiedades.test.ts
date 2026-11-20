// Pruebas de la pieza C: propiedades, ficha clínica, historial, reparaciones, documentos, dueños
// y vencimientos. Lo más importante que se prueba: el cliente A nunca ve lo del cliente B, la
// llave solo lee, y lo que sale hacia un dueño o una llave no trae costo del maestro, margen,
// notas internas ni nombres de interesados.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { hoyChile, sumarDias } from "../src/util/fechas";
import { nuevoRouter } from "../src/entorno";
import { documentos } from "../src/rutas/documentos";
import { propiedades } from "../src/rutas/propiedades";
import { vencimientos } from "../src/rutas/vencimientos";
import { clavesInternas, crearEscenario, type Escenario } from "./ayuda";

// ---------------------------------------------------------------------------
// El Drive de mentira: un mapa en memoria con los PDF que se «suben» a la carpeta de la propiedad
// ---------------------------------------------------------------------------

const guardados = new Map<string, Uint8Array>();
const borrados: string[] = [];
let subidas = 0;
const driveFalso = {
  subirArchivo: async ({ datos }: { datos: Uint8Array }) => {
    subidas += 1;
    const driveFileId = `doc_prueba_${process.pid}_${subidas}_abcdef`;
    guardados.set(driveFileId, datos);
    return { driveFileId };
  },
  leerArchivo: async (driveFileId: string) => {
    const datos = guardados.get(driveFileId);
    if (!datos) throw new Error(`No hay archivo ${driveFileId}`);
    return { datos: Buffer.from(datos), mime: "application/pdf", nombre: "papel.pdf" };
  },
  borrarArchivo: async (driveFileId: string) => {
    borrados.push(driveFileId);
    guardados.delete(driveFileId);
  },
};

const CONTENIDO_PDF = "%PDF-1.4 prueba de la ficha";
function formularioPdf(campos: Record<string, string>, tipo = "application/pdf"): FormData {
  const f = new FormData();
  f.append("file", new File([CONTENIDO_PDF], "papel.pdf", { type: tipo }));
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

// ---------------------------------------------------------------------------
// El escenario: dos clientes, cada uno con una propiedad; la de A tiene de todo
// ---------------------------------------------------------------------------

let e: Escenario;
let sufijo: string;
let propA: string;
let propB: string;
let servicioObra: string;
let catalogoId: string;
let maestroId: string;
let nombreEquipo: string;
const hoy = hoyChile();

before(async () => {
  e = await crearEscenario({ drive: driveFalso });
  sufijo = e.ids.clienteA.replace("prueba_a_", "");
  const equipo = await db.usuario.findUniqueOrThrow({ where: { id: e.ids.equipo } });
  nombreEquipo = equipo.nombre;

  const a = await db.property.create({
    data: {
      organizationId: e.ids.clienteA,
      tipo: "CASA",
      direccion: `Calle Prueba ${sufijo} 100`,
      comuna: "Ñuñoa",
      region: "RM",
      estado: "ARRENDADA",
      driveCarpetaId: `carpeta_prueba_${sufijo}_abcdef`,
    },
  });
  propA = a.id;
  const b = await db.property.create({
    data: { organizationId: e.ids.clienteB, tipo: "DEPARTAMENTO", direccion: `Calle Otra ${sufijo} 200`, comuna: "Providencia", region: "RM" },
  });
  propB = b.id;

  const catalogo = await db.servicio.create({
    data: { organizationId: ORG_PROGES, codigo: `PRUEBA-${sufijo}`, familia: "RR", nombre: `Servicio de prueba ${sufijo}` },
  });
  catalogoId = catalogo.id;
  const maestro = await db.maestro.create({
    data: { organizationId: ORG_PROGES, odooPartnerId: Math.floor(Math.random() * 1_000_000_000) + 1_000_000, nombre: `Maestro prueba ${sufijo}` },
  });
  maestroId = maestro.id;

  // Una obra abierta: espera al conservador, orden de Odoo por $1.000.000, maestro aprobado por $600.000.
  const obra = await db.servicioEnCurso.create({
    data: {
      organizationId: e.ids.clienteA,
      propertyId: propA,
      servicioId: catalogoId,
      tipo: "OBRA",
      responsableId: e.ids.equipo,
      esperandoA: "CONSERVADOR",
      esperandoDetalle: "DETALLE_INTERNO_DE_ESPERA",
      esperandoDesde: sumarDias(hoy, -5),
      inicioObra: sumarDias(hoy, -10),
    },
  });
  servicioObra = obra.id;
  const orden = await db.ordenDueno.create({
    data: { organizationId: e.ids.clienteA, servicioEnCursoId: obra.id, numero: "S99999", odooOrderId: 99999, total: "1000000", moneda: "CLP" },
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
  await db.partida.createMany({
    data: [
      {
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
      {
        organizationId: e.ids.clienteA,
        servicioEnCursoId: obra.id,
        ordenId: orden.id,
        recinto: "Cocina",
        descripcion: "Pintar muros",
        precioDueno: "600000",
        avance: 40,
        posicion: 2,
      },
    ],
  });
  await db.nota.createMany({
    data: [
      { organizationId: e.ids.clienteA, servicioEnCursoId: obra.id, autorId: e.ids.equipo, texto: "NOTA_PUBLICA_XYZ", paraDueno: true },
      { organizationId: e.ids.clienteA, servicioEnCursoId: obra.id, autorId: e.ids.equipo, texto: "NOTA_INTERNA_XYZ", paraDueno: false },
    ],
  });
  await db.evento.create({
    data: { organizationId: e.ids.clienteA, servicioEnCursoId: obra.id, tipo: "ESPERA", nuevo: "CONSERVADOR", motivo: "MOTIVO_INTERNO", autorId: e.ids.equipo },
  });

  // Una venta con una visita y dos ofertas: una ya mostrada al dueño y otra no.
  const venta = await db.servicioEnCurso.create({
    data: { organizationId: e.ids.clienteA, propertyId: propA, servicioId: catalogoId, tipo: "VENTA" },
  });
  await db.visita.create({
    data: { organizationId: e.ids.clienteA, servicioEnCursoId: venta.id, fecha: sumarDias(hoy, -2), interesadoNombre: "INTERESADO_XYZ", evaluacion: 4, comentario: "Le gustó el patio" },
  });
  await db.oferta.createMany({
    data: [
      { organizationId: e.ids.clienteA, servicioEnCursoId: venta.id, fecha: sumarDias(hoy, -1), monto: "90000000", moneda: "CLP", oferente: "OFERENTE_VISTO", mostradaAlDuenoEl: new Date() },
      { organizationId: e.ids.clienteA, servicioEnCursoId: venta.id, fecha: sumarDias(hoy, -1), monto: "80000000", moneda: "CLP", oferente: "OFERENTE_OCULTO" },
    ],
  });
  // Un servicio por revisar: el dueño no lo ve.
  await db.servicioEnCurso.create({
    data: { organizationId: e.ids.clienteA, propertyId: propA, servicioId: catalogoId, tipo: "INSPECCION", porRevisar: true },
  });

  // Un contrato que no se renueva solo y termina en 30 días, y una contribución por vencer.
  const arrendatario = await db.tenant.create({ data: { organizationId: e.ids.clienteA, nombre: "Arrendatario Prueba", rut: "1-9" } });
  await db.leaseContract.create({
    data: {
      organizationId: e.ids.clienteA,
      propertyId: propA,
      tenantId: arrendatario.id,
      monto: "500000",
      fechaInicio: sumarDias(hoy, -335),
      fechaTermino: sumarDias(hoy, 30),
      diaPago: 5,
      plazoMeses: 12,
      renovacionAutomatica: false,
    },
  });
  await db.propertyTax.create({
    data: { organizationId: e.ids.clienteA, propertyId: propA, anio: hoy.getUTCFullYear(), cuota: 1, fechaVencimiento: sumarDias(hoy, 10) },
  });
});

after(async () => {
  await e.limpiar();
  await db.maestro.deleteMany({ where: { id: maestroId } });
  await db.servicio.deleteMany({ where: { id: catalogoId } });
});

// ---------------------------------------------------------------------------
// La lista
// ---------------------------------------------------------------------------

describe("lista de propiedades", () => {
  test("filtra por cliente y el equipo ve a todos", async () => {
    const todas = await e.pedir("equipo", "GET", `/v1/propiedades?q=${sufijo}&porPagina=100`);
    assert.equal(todas.estado, 200);
    assert.deepEqual(todas.cuerpo.items.map((p: { id: string }) => p.id).sort(), [propA, propB].sort());

    const deA = await e.pedir("equipo", "GET", `/v1/propiedades?q=${sufijo}&cliente=${e.ids.clienteA}`);
    assert.deepEqual(deA.cuerpo.items.map((p: { id: string }) => p.id), [propA]);
    assert.equal(deA.cuerpo.paginacion.total, 1);
  });

  test("un cliente ve solo lo suyo, aunque pida el cliente de otro", async () => {
    const r = await e.pedir("clienteA", "GET", `/v1/propiedades?cliente=${e.ids.clienteB}`);
    assert.equal(r.estado, 200);
    assert.ok(r.cuerpo.items.length >= 1);
    assert.ok(r.cuerpo.items.every((p: { clienteId: string }) => p.clienteId === e.ids.clienteA));
  });

  test("trae servicios en curso, el «esperando a» más antiguo y lo último que pasó", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/propiedades?q=${sufijo}&cliente=${e.ids.clienteA}`);
    const p = r.cuerpo.items[0];
    assert.equal(p.serviciosEnCurso, 3);
    assert.equal(p.esperandoMasAntiguo.a, "CONSERVADOR");
    assert.equal(p.esperandoMasAntiguo.dias, 5);
    assert.equal(p.esperandoMasAntiguo.servicioId, servicioObra);
    // La venta no tiene responsable y la inspección es un pedido por revisar: esas dos son «nuevas»,
    // con la misma regla de la columna «Nuevo» del tablero. La obra ya tiene quién la lleve.
    assert.equal(p.serviciosNuevos, 2);
    assert.ok(p.ultimoHecho.texto.length > 0);
  });

  test("enCurso filtra por tener o no servicios abiertos", async () => {
    const con = await e.pedir("equipo", "GET", `/v1/propiedades?q=${sufijo}&enCurso=true`);
    assert.deepEqual(con.cuerpo.items.map((p: { id: string }) => p.id), [propA]);
    const sin = await e.pedir("equipo", "GET", `/v1/propiedades?q=${sufijo}&enCurso=false`);
    assert.deepEqual(sin.cuerpo.items.map((p: { id: string }) => p.id), [propB]);
    const comuna = await e.pedir("equipo", "GET", `/v1/propiedades?q=${sufijo}&comuna=providencia`);
    assert.deepEqual(comuna.cuerpo.items.map((p: { id: string }) => p.id), [propB]);
  });

  test("para un dueño no cuenta el servicio por revisar ni sale el detalle libre de la espera", async () => {
    const r = await e.pedir("clienteA", "GET", "/v1/propiedades");
    const p = r.cuerpo.items.find((x: { id: string }) => x.id === propA);
    assert.equal(p.serviciosEnCurso, 2);
    assert.equal(p.serviciosNuevos, 0, "quién lleva cada servicio es interno del equipo");
    assert.ok(!JSON.stringify(r.cuerpo).includes("DETALLE_INTERNO_DE_ESPERA"));
  });
});

// ---------------------------------------------------------------------------
// Permisos
// ---------------------------------------------------------------------------

describe("permisos", () => {
  test("el cliente A no ve una propiedad de B (404) y B no ve la de A", async () => {
    for (const ruta of ["", "/historial", "/reparaciones", "/documentos", "/unidades", "/avaluos", "/duenos"]) {
      assert.equal((await e.pedir("clienteA", "GET", `/v1/propiedades/${propB}${ruta}`)).estado, 404, `A → B${ruta}`);
      assert.equal((await e.pedir("clienteB", "GET", `/v1/propiedades/${propA}${ruta}`)).estado, 404, `B → A${ruta}`);
    }
    assert.equal((await e.pedir("clienteB", "PATCH", `/v1/propiedades/${propA}`, { direccion: "x" })).estado, 404);
    assert.equal((await e.pedir("clienteB", "DELETE", `/v1/propiedades/${propA}`)).estado, 404);
  });

  test("la llave de A lee sus propiedades y no puede crear ni cambiar nada", async () => {
    assert.equal((await e.pedir("llaveA", "GET", "/v1/propiedades")).estado, 200);
    assert.equal((await e.pedir("llaveA", "GET", `/v1/propiedades/${propA}`)).estado, 200);
    assert.equal((await e.pedir("llaveA", "GET", `/v1/propiedades/${propB}`)).estado, 404);
    const nueva = { tipo: "CASA", direccion: "x", comuna: "x", region: "x" };
    assert.equal((await e.pedir("llaveA", "POST", "/v1/propiedades", nueva)).estado, 403);
    assert.equal((await e.pedir("llaveA", "PATCH", `/v1/propiedades/${propA}`, { direccion: "otra" })).estado, 403);
    assert.equal((await e.pedir("llaveA", "DELETE", `/v1/propiedades/${propA}`)).estado, 403);
    assert.equal((await e.pedir("llaveA", "POST", `/v1/propiedades/${propA}/unidades`, { tipo: "BODEGA", numero: "1" })).estado, 403);
    assert.equal((await e.pedir("llaveA", "POST", `/v1/propiedades/${propA}/avaluos`, { anio: 2020, valor: "1" })).estado, 403);
    assert.equal((await e.pedir("llaveA", "POST", `/v1/propiedades/${propA}/duenos`, { duenoId: "x", porcentaje: "50" })).estado, 403);
    assert.equal((await e.pedir("llaveA", "POST", `/v1/propiedades/${propA}/documentos`, formularioPdf({ papel: "PLANO" }))).estado, 403);
    assert.equal((await e.pedir("llaveA", "POST", "/v1/duenos", { nombre: "x", rut: "1", tipo: "PERSONA" })).estado, 403);
    assert.equal((await e.pedir("llaveA", "POST", "/v1/grupos", { nombre: "x" })).estado, 403);
  });

  test("sin sesión no se entra", async () => {
    assert.equal((await e.pedir("anonimo", "GET", "/v1/propiedades")).estado, 401);
  });
});

// ---------------------------------------------------------------------------
// Crear y cambiar
// ---------------------------------------------------------------------------

describe("crear y cambiar una propiedad", () => {
  test("un cliente crea en lo suyo; el equipo tiene que elegir el cliente", async () => {
    const datos = { tipo: "OFICINA", direccion: `Nueva ${sufijo}`, comuna: "Las Condes", region: "RM" };
    const deCliente = await e.pedir("clienteA", "POST", "/v1/propiedades", { ...datos, clienteId: e.ids.clienteB });
    assert.equal(deCliente.estado, 201);
    assert.equal(deCliente.cuerpo.clienteId, e.ids.clienteA, "lo que manda el cliente en clienteId se ignora");

    const sinCliente = await e.pedir("equipo", "POST", "/v1/propiedades", datos);
    assert.equal(sinCliente.estado, 400);
    assert.ok(sinCliente.cuerpo.error.campos.clienteId);

    const conCliente = await e.pedir("equipo", "POST", "/v1/propiedades", { ...datos, clienteId: e.ids.clienteB });
    assert.equal(conCliente.estado, 201);
    assert.equal(conCliente.cuerpo.clienteId, e.ids.clienteB);
  });

  test("faltan campos obligatorios → 400 con los campos", async () => {
    const r = await e.pedir("clienteA", "POST", "/v1/propiedades", { tipo: "CASA", direccion: "", comuna: "x", region: "x" });
    assert.equal(r.estado, 400);
    assert.ok(r.cuerpo.error.campos.direccion);
  });

  test("PATCH guarda valor comercial, compra y deuda, y los puede borrar", async () => {
    const ok = await e.pedir("clienteA", "PATCH", `/v1/propiedades/${propA}`, {
      estado: "EN_VENTA",
      valorComercial: { monto: { valor: "120000000", moneda: "CLP" }, fecha: "2026-01-15", fuente: "TASACION" },
      compra: { fecha: "2020-03-01", precio: { valor: "3000", moneda: "UF" } },
      deuda: { saldo: { valor: "1500.5", moneda: "UF" }, fecha: null, banco: "Banco Prueba", dividendo: "12.35", termino: "2040-01-01" },
    });
    assert.equal(ok.estado, 200);
    assert.equal(ok.cuerpo.estado, "EN_VENTA");
    assert.deepEqual(ok.cuerpo.valorComercial.monto, { valor: "120000000", moneda: "CLP" });
    assert.deepEqual(ok.cuerpo.compra.precio, { valor: "3000", moneda: "UF" });
    assert.equal(ok.cuerpo.deuda.saldo.valor, "1500.5");
    assert.equal(ok.cuerpo.deuda.dividendo, "12.35");

    const sinDeuda = await e.pedir("equipo", "PATCH", `/v1/propiedades/${propA}`, { deuda: null, estado: "ARRENDADA" });
    assert.equal(sinDeuda.estado, 200);
    assert.equal(sinDeuda.cuerpo.deuda, null);
    assert.ok(sinDeuda.cuerpo.valorComercial, "lo que no se manda queda como estaba");
    const guardado = await db.property.findUniqueOrThrow({ where: { id: propA } });
    assert.equal(guardado.deudaBanco, null);
    assert.ok(guardado.modificadoPorId, "queda anotado quién guardó");
  });

  test("las reglas de negocio rechazan fechas futuras, montos negativos y deuda sin saldo", async () => {
    const futura = await e.pedir("clienteA", "PATCH", `/v1/propiedades/${propA}`, {
      compra: { fecha: "2999-01-01", precio: { valor: "-5", moneda: "CLP" } },
      deuda: { saldo: { valor: "0", moneda: "UF" }, fecha: null, banco: null, dividendo: null, termino: null },
    });
    assert.equal(futura.estado, 400);
    assert.ok(futura.cuerpo.error.campos["compra.fecha"]);
    assert.ok(futura.cuerpo.error.campos["compra.precio"]);
    assert.ok(futura.cuerpo.error.campos["deuda.saldo"]);
  });

  test("no se borra una propiedad con servicios; una sin servicios sí", async () => {
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/propiedades/${propA}`)).estado, 409);
    const nueva = await e.pedir("clienteB", "POST", "/v1/propiedades", { tipo: "BODEGA", direccion: `Borrar ${sufijo}`, comuna: "x", region: "x" });
    assert.equal((await e.pedir("clienteB", "DELETE", `/v1/propiedades/${nueva.cuerpo.id}`)).estado, 204);
    assert.equal((await e.pedir("clienteB", "GET", `/v1/propiedades/${nueva.cuerpo.id}`)).estado, 404);
  });
});

// ---------------------------------------------------------------------------
// La ficha, el historial y las reparaciones
// ---------------------------------------------------------------------------

const PROHIBIDOS_PARA_DUENO = [
  "NOTA_INTERNA_XYZ",
  "INTERESADO_XYZ",
  "OFERENTE_VISTO",
  "OFERENTE_OCULTO",
  "DETALLE_INTERNO_DE_ESPERA",
  "MOTIVO_INTERNO",
  "OBSERVACION_INTERNA",
  "Maestro prueba",
];

function sinSecretos(cuerpo: unknown) {
  const texto = JSON.stringify(cuerpo);
  for (const prohibido of PROHIBIDOS_PARA_DUENO) assert.ok(!texto.includes(prohibido), `no debe salir «${prohibido}»`);
  assert.ok(!texto.includes(nombreEquipo), "no debe salir el nombre de la gente del equipo");
  assert.deepEqual(clavesInternas(cuerpo), []);
}

describe("la ficha", () => {
  test("el equipo ve cifras, costo de maestros y margen", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/propiedades/${propA}`);
    assert.equal(r.estado, 200);
    const { cifras } = r.cuerpo;
    assert.equal(cifras.servicios, 3);
    assert.deepEqual(cifras.cobradoReparaciones, [{ valor: "1000000", moneda: "CLP" }]);
    assert.deepEqual(cifras.costoMaestros, { valor: "600000", moneda: "CLP" });
    assert.deepEqual(cifras.margen, { valor: "400000", moneda: "CLP" });
    assert.equal(r.cuerpo.serviciosEnCurso.length, 3);
    // La obra tiene responsable; la venta (sin responsable) y el pedido por revisar son «nuevos».
    const nuevo = (id: string) => r.cuerpo.serviciosEnCurso.find((s: { id: string }) => s.id === id)?.nuevo;
    assert.equal(nuevo(servicioObra), false);
    assert.equal(r.cuerpo.serviciosEnCurso.filter((s: { nuevo?: boolean }) => s.nuevo === true).length, 2);
    assert.equal(r.cuerpo.ultimosHechos.length, 4);
  });

  test("el dueño y la llave no reciben costo del maestro ni margen ni nada interno", async () => {
    for (const quien of ["clienteA", "llaveA"] as const) {
      const r = await e.pedir(quien, "GET", `/v1/propiedades/${propA}`);
      assert.equal(r.estado, 200, quien);
      assert.deepEqual(r.cuerpo.cifras.cobradoReparaciones, [{ valor: "1000000", moneda: "CLP" }]);
      assert.equal("costoMaestros" in r.cuerpo.cifras, false);
      assert.equal("margen" in r.cuerpo.cifras, false);
      assert.equal(r.cuerpo.serviciosEnCurso.length, 2, "sin el servicio por revisar");
      assert.ok(r.cuerpo.serviciosEnCurso.every((s: { responsable?: unknown }) => !("responsable" in s)));
      sinSecretos(r.cuerpo);
    }
  });

  test("las alertas avisan de documentos que faltan y de la contribución por vencer", async () => {
    const r = await e.pedir("clienteA", "GET", `/v1/propiedades/${propA}`);
    const tipos = r.cuerpo.alertas.map((a: { tipo: string }) => a.tipo);
    assert.ok(tipos.includes("DOCUMENTO_FALTA"));
    assert.ok(tipos.includes("CONTRIBUCION_VENCE"));
  });
});

describe("el historial", () => {
  test("el equipo ve todo, de lo más nuevo a lo más antiguo", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/propiedades/${propA}/historial?porPagina=100`);
    assert.equal(r.estado, 200);
    const texto = JSON.stringify(r.cuerpo);
    for (const visible of ["NOTA_INTERNA_XYZ", "NOTA_PUBLICA_XYZ", "INTERESADO_XYZ", "OFERENTE_OCULTO", "Presupuesto aprobado"]) {
      assert.ok(texto.includes(visible), `el equipo debe ver «${visible}»`);
    }
    const fechas: string[] = r.cuerpo.items.map((i: { fecha: string }) => i.fecha);
    assert.deepEqual([...fechas].sort().reverse(), fechas);
  });

  test("el dueño y la llave: solo notas para el dueño, sin interesados ni plata del maestro", async () => {
    for (const quien of ["clienteA", "llaveA"] as const) {
      const r = await e.pedir(quien, "GET", `/v1/propiedades/${propA}/historial?porPagina=100`);
      assert.equal(r.estado, 200, quien);
      assert.ok(JSON.stringify(r.cuerpo).includes("NOTA_PUBLICA_XYZ"));
      sinSecretos(r.cuerpo);
      const tipos = new Set(r.cuerpo.items.map((i: { tipo: string }) => i.tipo));
      assert.ok(!tipos.has("presupuesto"));
    }
  });

  test("el filtro por tipo deja solo ese tipo", async () => {
    const visitas = await e.pedir("equipo", "GET", `/v1/propiedades/${propA}/historial?tipo=visitas`);
    assert.ok(visitas.cuerpo.items.length === 1);
    assert.ok(visitas.cuerpo.items.every((i: { tipo: string }) => i.tipo === "visita"));
    const ventas = await e.pedir("equipo", "GET", `/v1/propiedades/${propA}/historial?tipo=venta-arriendo`);
    assert.ok(ventas.cuerpo.items.every((i: { categoria: string }) => i.categoria === "venta-arriendo"));
    assert.ok(ventas.cuerpo.items.some((i: { tipo: string }) => i.tipo === "oferta"));
    const reparaciones = await e.pedir("equipo", "GET", `/v1/propiedades/${propA}/historial?tipo=reparaciones`);
    assert.ok(reparaciones.cuerpo.items.some((i: { tipo: string }) => i.tipo === "presupuesto"));
    assert.equal((await e.pedir("equipo", "GET", `/v1/propiedades/${propA}/historial?tipo=cualquiera`)).estado, 400);
  });
});

describe("las reparaciones", () => {
  test("el equipo ve cobrado, costo del maestro, margen y días", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/propiedades/${propA}/reparaciones`);
    assert.equal(r.estado, 200);
    const [obra] = r.cuerpo.obras;
    assert.equal(obra.servicioId, servicioObra);
    assert.deepEqual(obra.orden.cobrado, { valor: "1000000", moneda: "CLP" });
    assert.deepEqual(obra.costoMaestro, { valor: "600000", moneda: "CLP" });
    assert.deepEqual(obra.margen, { valor: "400000", moneda: "CLP" });
    assert.deepEqual(obra.dias, { planificado: 15, real: 10, diferencia: -5 });
    assert.equal(obra.partidas.length, 2);
    assert.equal(obra.partidas[0].observacion, "OBSERVACION_INTERNA");
    assert.deepEqual(
      r.cuerpo.totalPorRecinto.map((t: { recinto: string; total: unknown[] }) => [t.recinto, t.total]),
      [
        ["Baño", [{ valor: "400000", moneda: "CLP" }]],
        ["Cocina", [{ valor: "600000", moneda: "CLP" }]],
      ],
    );
  });

  test("el dueño y la llave ven lo cobrado y las partidas, sin costo ni margen", async () => {
    for (const quien of ["clienteA", "llaveA"] as const) {
      const r = await e.pedir(quien, "GET", `/v1/propiedades/${propA}/reparaciones`);
      assert.equal(r.estado, 200, quien);
      const [obra] = r.cuerpo.obras;
      assert.deepEqual(obra.orden.cobrado, { valor: "1000000", moneda: "CLP" });
      assert.equal(obra.partidas.length, 2);
      assert.equal(obra.partidas[0].recinto, "Baño");
      assert.equal(obra.partidas[0].recepcion, "CONFORME");
      for (const clave of ["costoMaestro", "margen", "dias"]) assert.equal(clave in obra, false, clave);
      assert.equal("observacion" in obra.partidas[0], false);
      sinSecretos(r.cuerpo);
    }
  });
});

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

describe("documentos", () => {
  let docId: string;

  test("se sube un PDF, queda anotado quién lo subió y aparece agrupado con su estado", async () => {
    const vence = new Date(sumarDias(hoy, 20)).toISOString().slice(0, 10);
    const r = await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/documentos`, formularioPdf({ papel: "POLIZA_SEGURO", nombre: "Póliza 2026", fechaVencimiento: vence }));
    assert.equal(r.estado, 201);
    docId = r.cuerpo.id;
    assert.equal(r.cuerpo.tipo, "SEGURO", "el cajón sale del papel");
    assert.equal(r.cuerpo.papel, "POLIZA_SEGURO");
    const guardado = await db.document.findUniqueOrThrow({ where: { id: docId } });
    assert.equal(guardado.subidoPorId, e.ids.equipo);
    assert.ok(guardados.has(guardado.blobKey));

    const lista = await e.pedir("clienteA", "GET", `/v1/propiedades/${propA}/documentos`);
    assert.equal(lista.estado, 200);
    assert.deepEqual(lista.cuerpo.grupos.map((g: { grupo: string }) => g.grupo), ["dominio", "municipales", "planos", "informes", "otros"]);
    const otros = lista.cuerpo.grupos.find((g: { grupo: string }) => g.grupo === "otros");
    const poliza = otros.items.find((i: { papel: string }) => i.papel === "POLIZA_SEGURO");
    assert.equal(poliza.estado, "vence");
    assert.equal(poliza.documento.nombre, "Póliza 2026");
    assert.equal("subidoPor" in poliza.documento, false, "quién lo subió es solo del equipo");
    assert.ok(lista.cuerpo.faltan > 0);
    const dominio = lista.cuerpo.grupos.find((g: { grupo: string }) => g.grupo === "dominio");
    assert.ok(dominio.items.some((i: { estado: string; documento: unknown }) => i.estado === "falta" && i.documento === null));
    assert.ok(!JSON.stringify(lista.cuerpo).includes("blobKey"));
    assert.ok(!JSON.stringify(lista.cuerpo).includes(guardado.blobKey), "la dirección del archivo nunca sale");
  });

  test("el archivo se entrega revisando el permiso", async () => {
    const mio = await e.pedir("clienteA", "GET", `/v1/documentos/${docId}/archivo`);
    assert.equal(mio.estado, 200);
    assert.equal(mio.cuerpo, CONTENIDO_PDF);
    assert.equal((await e.pedir("llaveA", "GET", `/v1/documentos/${docId}/archivo`)).estado, 200);
    assert.equal((await e.pedir("clienteB", "GET", `/v1/documentos/${docId}/archivo`)).estado, 404);
    assert.equal((await e.pedir("anonimo", "GET", `/v1/documentos/${docId}/archivo`)).estado, 401);
  });

  test("solo se aceptan PDF, con papel y con las fechas en regla", async () => {
    const noPdf = await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/documentos`, formularioPdf({ papel: "PLANO" }, "image/png"));
    assert.equal(noPdf.estado, 400);
    assert.ok(noPdf.cuerpo.error.campos.file);
    const otroSinTipo = await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/documentos`, formularioPdf({ papel: "OTRO" }));
    assert.equal(otroSinTipo.estado, 400);
    assert.ok(otroSinTipo.cuerpo.error.campos.tipo);
    const futura = await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/documentos`, formularioPdf({ papel: "PLANO", fechaEmision: "2999-01-01" }));
    assert.equal(futura.estado, 400);
    const suelto = await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/documentos`, formularioPdf({ papel: "OTRO", tipo: "MANTENCION" }));
    assert.equal(suelto.estado, 201);
    assert.equal(suelto.cuerpo.papel, null);
    assert.equal(suelto.cuerpo.nombre, "papel.pdf", "sin nombre, el del archivo");
  });

  test("el cliente B no puede subir ni borrar en la propiedad de A", async () => {
    assert.equal((await e.pedir("clienteB", "POST", `/v1/propiedades/${propA}/documentos`, formularioPdf({ papel: "PLANO" }))).estado, 404);
    assert.equal((await e.pedir("clienteB", "DELETE", `/v1/documentos/${docId}`)).estado, 404);
    assert.equal((await e.pedir("llaveA", "DELETE", `/v1/documentos/${docId}`)).estado, 403);
  });

  test("al borrar se va la fila y el archivo va a la papelera de Drive", async () => {
    const clave = (await db.document.findUniqueOrThrow({ where: { id: docId } })).blobKey;
    assert.equal((await e.pedir("clienteA", "DELETE", `/v1/documentos/${docId}`)).estado, 204);
    assert.equal(await db.document.count({ where: { id: docId } }), 0);
    assert.ok(borrados.includes(clave), "el archivo se manda a la papelera de Drive");
    assert.equal((await e.pedir("clienteA", "GET", `/v1/documentos/${docId}/archivo`)).estado, 404);
  });
});

// ---------------------------------------------------------------------------
// Unidades, avalúos y dueños
// ---------------------------------------------------------------------------

describe("unidades, avalúos y dueños", () => {
  test("unidades anexas", async () => {
    const nueva = await e.pedir("clienteA", "POST", `/v1/propiedades/${propA}/unidades`, { tipo: "ESTACIONAMIENTO", numero: "E-12", avaluoFiscal: "2500000" });
    assert.equal(nueva.estado, 201);
    assert.deepEqual(nueva.cuerpo.avaluoFiscal, { valor: "2500000", moneda: "CLP" });
    const lista = await e.pedir("llaveA", "GET", `/v1/propiedades/${propA}/unidades`);
    assert.equal(lista.cuerpo.length, 1);
    assert.equal((await e.pedir("clienteB", "DELETE", `/v1/propiedades/${propA}/unidades/${nueva.cuerpo.id}`)).estado, 404);
    assert.equal((await e.pedir("clienteA", "DELETE", `/v1/propiedades/${propA}/unidades/${nueva.cuerpo.id}`)).estado, 204);
    assert.equal((await e.pedir("clienteA", "DELETE", `/v1/propiedades/${propA}/unidades/${nueva.cuerpo.id}`)).estado, 404);
  });

  test("avalúos: uno por año", async () => {
    const primero = await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/avaluos`, { anio: 2025, valor: "50000000" });
    assert.equal(primero.estado, 201);
    assert.equal((await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/avaluos`, { anio: 2025, valor: "1" })).estado, 409);
    await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/avaluos`, { anio: 2026, valor: "52000000" });
    const lista = await e.pedir("clienteA", "GET", `/v1/propiedades/${propA}/avaluos`);
    assert.deepEqual(lista.cuerpo.map((a: { anio: number }) => a.anio), [2026, 2025]);
  });

  test("dueños, copropiedad y grupos", async () => {
    const grupo = await e.pedir("clienteA", "POST", "/v1/grupos", { nombre: "Familia Prueba" });
    assert.equal(grupo.estado, 201);
    const entidad = await e.pedir("clienteA", "POST", "/v1/duenos", { nombre: "Sociedad Prueba", rut: "76.000.000-1", tipo: "SOCIEDAD" });
    assert.equal(entidad.estado, 201);

    const enGrupo = await e.pedir("clienteA", "PATCH", `/v1/duenos/${entidad.cuerpo.id}`, { grupoId: grupo.cuerpo.id });
    assert.equal(enGrupo.cuerpo.grupoNombre, "Familia Prueba");

    // Un grupo de otro cliente no sirve.
    const deB = await e.pedir("clienteB", "POST", "/v1/grupos", { nombre: "Grupo de B" });
    const ajeno = await e.pedir("clienteA", "PATCH", `/v1/duenos/${entidad.cuerpo.id}`, { grupoId: deB.cuerpo.id });
    assert.equal(ajeno.estado, 400);
    assert.ok(ajeno.cuerpo.error.campos.grupoId);
    assert.equal((await e.pedir("clienteB", "PATCH", `/v1/duenos/${entidad.cuerpo.id}`, { nombre: "x" })).estado, 404);

    // La copropiedad: una entidad que existe y una nueva.
    const uno = await e.pedir("clienteA", "POST", `/v1/propiedades/${propA}/duenos`, { duenoId: entidad.cuerpo.id, porcentaje: "60" });
    assert.equal(uno.estado, 201);
    assert.equal(uno.cuerpo.dueno.grupoNombre, "Familia Prueba");
    assert.equal((await e.pedir("clienteA", "POST", `/v1/propiedades/${propA}/duenos`, { duenoId: entidad.cuerpo.id, porcentaje: "10" })).estado, 409);
    const dos = await e.pedir("equipo", "POST", `/v1/propiedades/${propA}/duenos`, { nombre: "Ana Prueba", rut: "1-9", tipo: "PERSONA", porcentaje: "40" });
    assert.equal(dos.estado, 201);
    assert.equal((await e.pedir("clienteA", "POST", `/v1/propiedades/${propA}/duenos`, { porcentaje: "0" })).estado, 400);
    assert.equal((await e.pedir("clienteA", "POST", `/v1/propiedades/${propA}/duenos`, { duenoId: "no-existe", porcentaje: "10" })).estado, 400);

    const lista = await e.pedir("llaveA", "GET", `/v1/propiedades/${propA}/duenos`);
    assert.deepEqual(lista.cuerpo.map((d: { porcentaje: string }) => d.porcentaje), ["60", "40"]);

    // Cada cliente ve solo sus dueños y grupos.
    const todos = await e.pedir("clienteA", "GET", "/v1/duenos");
    assert.deepEqual(todos.cuerpo.grupos.map((g: { nombre: string }) => g.nombre), ["Familia Prueba"]);
    assert.ok(todos.cuerpo.duenos.every((d: { clienteId: string }) => d.clienteId === e.ids.clienteA));
    assert.equal(todos.cuerpo.grupos[0].entidades, 1);
    const deElEquipo = await e.pedir("equipo", "GET", `/v1/duenos?cliente=${e.ids.clienteB}`);
    assert.deepEqual(deElEquipo.cuerpo.grupos.map((g: { nombre: string }) => g.nombre), ["Grupo de B"]);

    assert.equal((await e.pedir("clienteA", "DELETE", `/v1/propiedades/${propA}/duenos/${uno.cuerpo.id}`)).estado, 204);
    assert.equal((await e.pedir("clienteA", "DELETE", `/v1/grupos/${grupo.cuerpo.id}`)).estado, 204);
    const sinGrupo = await e.pedir("clienteA", "GET", "/v1/duenos");
    assert.equal(sinGrupo.cuerpo.duenos.find((d: { id: string }) => d.id === entidad.cuerpo.id).grupoId, null);
  });
});

// ---------------------------------------------------------------------------
// Vencimientos
// ---------------------------------------------------------------------------

describe("vencimientos", () => {
  test("encuentra un contrato que termina en 30 días, con su servicio sugerido", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/vencimientos?cliente=${e.ids.clienteA}`);
    assert.equal(r.estado, 200);
    const contrato = r.cuerpo.items.find((i: { tipo: string }) => i.tipo === "CONTRATO_POR_VENCER");
    assert.ok(contrato, "debe aparecer el contrato por vencer");
    assert.equal(contrato.propiedad.id, propA);
    assert.equal(contrato.fecha, sumarDias(hoy, 30).toISOString().slice(0, 10));
    assert.equal(contrato.contrato.arrendatario, "Arrendatario Prueba");
    assert.equal(contrato.gravedad, "baja");
    assert.deepEqual(contrato.servicioSugerido, { tipo: "ARRIENDO" });
    assert.ok(r.cuerpo.items.some((i: { tipo: string }) => i.tipo === "CONTRIBUCION"));
    assert.ok(r.cuerpo.items.some((i: { tipo: string }) => i.tipo === "PAPEL_FALTA"));
    assert.ok(r.cuerpo.items.every((i: { propiedad: { clienteId: string } | null }) => !i.propiedad || i.propiedad.clienteId === e.ids.clienteA));
  });

  test("cada cliente ve solo lo suyo y la llave también", async () => {
    const deB = await e.pedir("clienteB", "GET", `/v1/vencimientos?cliente=${e.ids.clienteA}`);
    assert.equal(deB.estado, 200);
    assert.ok(deB.cuerpo.items.every((i: { propiedad: { id: string } | null }) => i.propiedad?.id !== propA));
    assert.ok(!deB.cuerpo.items.some((i: { tipo: string }) => i.tipo === "CONTRATO_POR_VENCER"));

    const conLlave = await e.pedir("llaveA", "GET", "/v1/vencimientos");
    assert.equal(conLlave.estado, 200);
    assert.ok(conLlave.cuerpo.items.some((i: { tipo: string }) => i.tipo === "CONTRATO_POR_VENCER"));
    assert.ok(conLlave.cuerpo.resumen.esteMes >= 1);
  });
});

// ---------------------------------------------------------------------------
// /docs
// ---------------------------------------------------------------------------

test("las rutas de la pieza aparecen en la documentación con descripción", () => {
  // Se arma la documentación solo con los routers de esta pieza: así la prueba no depende de que
  // las demás áreas ya estén terminadas (/openapi.json junta todas).
  const mini = nuevoRouter();
  for (const router of [propiedades, documentos, vencimientos]) mini.route("/v1", router);
  const doc = mini.getOpenAPI31Document({ openapi: "3.1.0", info: { title: "prueba", version: "v1" } }) as unknown as {
    paths: Record<string, Record<string, { description?: string; summary?: string }>>;
  };
  const esperadas: [string, string][] = [
    ["/v1/propiedades", "get"],
    ["/v1/propiedades", "post"],
    ["/v1/propiedades/{id}", "get"],
    ["/v1/propiedades/{id}", "patch"],
    ["/v1/propiedades/{id}/historial", "get"],
    ["/v1/propiedades/{id}/reparaciones", "get"],
    ["/v1/propiedades/{id}/documentos", "get"],
    ["/v1/propiedades/{id}/documentos", "post"],
    ["/v1/documentos/{id}/archivo", "get"],
    ["/v1/documentos/{id}", "delete"],
    ["/v1/vencimientos", "get"],
    ["/v1/duenos", "get"],
  ];
  for (const [ruta, metodo] of esperadas) {
    const op = doc.paths[ruta]?.[metodo];
    assert.ok(op, `falta ${metodo.toUpperCase()} ${ruta} en /openapi.json`);
    assert.ok(op.description || op.summary, `${metodo} ${ruta} no tiene descripción`);
  }
});
