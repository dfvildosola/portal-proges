// Configuración, llaves y resultados: quién puede qué, que la llave creada sirva (y deje de
// servir al revocarla), que la llave completa no quede en la base y que las cuentas de
// Resultados den bien.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { crearEscenario, type Escenario } from "./ayuda";
import { huellaDeLlave } from "../src/acceso/llaves";
import { aplicarCambios, camposFaltantes, problemaDeAutoEdicion } from "../src/dominio/config/usuarios";
import { cifrasDeServicios, diasPorTipo, msEsperando, serviciosPorSemana, tiempoDeServicio } from "../src/dominio/resultados/servicios";
import { margenDeObras, resultadoDeObra } from "../src/dominio/resultados/obras";
import { tareasATiempoPorPersona } from "../src/dominio/resultados/tareas";

let e: Escenario;
// Lo que crea la prueba por la API, para borrarlo al final (limpiar() solo borra lo de A y B).
const clientesCreados: string[] = [];
const correosCreados: string[] = [];
const idsDeCatalogo: string[] = [];

const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);
const momento = (iso: string) => new Date(iso);

before(async () => {
  e = await crearEscenario();
});

after(async () => {
  await db.llaveApi.deleteMany({ where: { organizationId: { in: clientesCreados } } });
  await db.usuario.deleteMany({ where: { OR: [{ organizationId: { in: clientesCreados } }, { email: { in: correosCreados } }] } });
  await db.organizacion.deleteMany({ where: { id: { in: clientesCreados } } });
  // Primero se borran los servicios en curso de A y B (limpiar), y recién después el catálogo
  // de org_proges que ellos usaban.
  await e.limpiar();
  await db.servicio.deleteMany({ where: { id: { in: idsDeCatalogo } } });
});

describe("clientes y usuarios: solo el administrador", () => {
  test("equipo, jefatura, dueño y llave no crean clientes ni usuarios (403)", async () => {
    for (const quien of ["equipo", "jefatura", "clienteA", "llaveA"] as const) {
      assert.equal((await e.pedir(quien, "POST", "/v1/clientes", { nombre: `X ${quien}` })).estado, 403, `cliente: ${quien}`);
      assert.equal(
        (await e.pedir(quien, "POST", "/v1/usuarios", { nombre: "N", correo: `n.${quien}@prueba.proges.cl`, rol: "EQUIPO" })).estado,
        403,
        `usuario: ${quien}`,
      );
      assert.equal((await e.pedir(quien, "GET", "/v1/clientes")).estado, 403, `lista de clientes: ${quien}`);
      assert.equal((await e.pedir(quien, "GET", "/v1/usuarios")).estado, 403, `lista de usuarios: ${quien}`);
    }
    assert.equal((await e.pedir("anonimo", "GET", "/v1/clientes")).estado, 401);
  });

  test("el admin crea un cliente, lo renombra y lo desactiva; el nombre no se repite", async () => {
    const nombre = `Cliente nuevo ${e.ids.clienteA}`;
    const creado = await e.pedir("admin", "POST", "/v1/clientes", { nombre, modo: "AUTONOMO" });
    assert.equal(creado.estado, 201);
    clientesCreados.push(creado.cuerpo.id);
    assert.equal(creado.cuerpo.modo, "AUTONOMO");
    assert.equal(creado.cuerpo.activa, true);

    const repetido = await e.pedir("admin", "POST", "/v1/clientes", { nombre: nombre.toUpperCase() });
    assert.equal(repetido.estado, 409);

    const cambiado = await e.pedir("admin", "PATCH", `/v1/clientes/${creado.cuerpo.id}`, { activa: false, modo: "ATENDIDO" });
    assert.equal(cambiado.estado, 200);
    assert.equal(cambiado.cuerpo.activa, false);
    assert.equal(cambiado.cuerpo.modo, "ATENDIDO");

    const lista = await e.pedir("admin", "GET", "/v1/clientes");
    assert.ok(lista.cuerpo.items.some((c: { id: string }) => c.id === creado.cuerpo.id), "un cliente desactivado sigue en la lista");

    assert.equal((await e.pedir("admin", "PATCH", `/v1/clientes/${ORG_PROGES}`, { nombre: "Otro" })).estado, 404, "org_proges no se toca");
    assert.equal((await e.pedir("admin", "PATCH", `/v1/clientes/${creado.cuerpo.id}`, {})).estado, 400, "sin campos no hay cambio");
  });

  test("el admin invita a una persona del equipo y a una de un cliente", async () => {
    const correoEquipo = `Nueva.${e.ids.clienteA}@prueba.proges.cl`;
    correosCreados.push(correoEquipo.toLowerCase());
    const equipo = await e.pedir("admin", "POST", "/v1/usuarios", { nombre: "Nueva", correo: correoEquipo, rol: "EQUIPO", jefatura: true });
    assert.equal(equipo.estado, 201);
    assert.equal(equipo.cuerpo.correo, correoEquipo.toLowerCase());
    assert.equal(equipo.cuerpo.jefatura, true);
    assert.equal(equipo.cuerpo.haEntrado, false);
    assert.equal(equipo.cuerpo.clienteId, null);
    assert.equal(JSON.stringify(equipo.cuerpo).includes("clerk"), false, "no sale el enlace con Clerk");

    const sinCliente = await e.pedir("admin", "POST", "/v1/usuarios", { nombre: "Dueña", correo: `d1.${e.ids.clienteA}@prueba.proges.cl`, rol: "CLIENTE" });
    assert.equal(sinCliente.estado, 400);
    assert.ok(sinCliente.cuerpo.error.campos.clienteId);

    // Una persona de un cliente nunca es admin ni jefatura, aunque lo pidan.
    const correoDueno = `dueno.${e.ids.clienteA}@prueba.proges.cl`;
    const dueno = await e.pedir("admin", "POST", "/v1/usuarios", {
      nombre: "Dueño",
      correo: correoDueno,
      rol: "CLIENTE",
      clienteId: e.ids.clienteA,
      admin: true,
      jefatura: true,
    });
    assert.equal(dueno.estado, 201);
    assert.equal(dueno.cuerpo.admin, false);
    assert.equal(dueno.cuerpo.jefatura, false);
    assert.equal(dueno.cuerpo.clienteId, e.ids.clienteA);

    const repetido = await e.pedir("admin", "POST", "/v1/usuarios", { nombre: "Otra", correo: correoDueno.toUpperCase(), rol: "EQUIPO" });
    assert.equal(repetido.estado, 409);

    const filtrado = await e.pedir("admin", "GET", `/v1/usuarios?cliente=${e.ids.clienteA}`);
    assert.equal(filtrado.estado, 200);
    assert.ok(filtrado.cuerpo.items.every((u: { clienteId: string }) => u.clienteId === e.ids.clienteA));

    const desactivado = await e.pedir("admin", "PATCH", `/v1/usuarios/${dueno.cuerpo.id}`, { activo: false });
    assert.equal(desactivado.cuerpo.activo, false);
  });

  test("el admin no puede quitarse el admin ni desactivarse", async () => {
    assert.equal((await e.pedir("admin", "PATCH", `/v1/usuarios/${e.ids.admin}`, { admin: false })).estado, 400);
    assert.equal((await e.pedir("admin", "PATCH", `/v1/usuarios/${e.ids.admin}`, { activo: false })).estado, 400);
  });
});

describe("llaves de la API", () => {
  test("nadie sin admin crea, lista ni revoca llaves (403)", async () => {
    for (const quien of ["equipo", "jefatura", "clienteA", "llaveA"] as const) {
      assert.equal((await e.pedir(quien, "POST", "/v1/llaves", { clienteId: e.ids.clienteA, nombre: "X" })).estado, 403, `crear: ${quien}`);
      assert.equal((await e.pedir(quien, "GET", "/v1/llaves")).estado, 403, `listar: ${quien}`);
      assert.equal((await e.pedir(quien, "DELETE", `/v1/llaves/${e.ids.llaveA}`)).estado, 403, `revocar: ${quien}`);
    }
  });

  test("la llave creada sirve para leer /v1/yo, no queda completa en la base y revocada da 401", async () => {
    const creada = await e.pedir("admin", "POST", "/v1/llaves", { clienteId: e.ids.clienteA, nombre: "Sistema de prueba" });
    assert.equal(creada.estado, 201);
    const llave: string = creada.cuerpo.llave;
    assert.match(llave, /^prg_/);
    assert.ok(llave.startsWith(creada.cuerpo.prefijo));
    assert.equal(creada.cuerpo.clienteId, e.ids.clienteA);

    // En la base: solo el prefijo y la huella; la llave completa no está en ninguna columna.
    const fila = await db.llaveApi.findUniqueOrThrow({ where: { id: creada.cuerpo.id } });
    assert.equal(fila.huella, huellaDeLlave(llave));
    assert.equal(fila.prefijo, creada.cuerpo.prefijo);
    assert.ok(!JSON.stringify(fila).includes(llave), "la llave completa no se guarda");

    // La lista nunca la devuelve completa.
    const lista = await e.pedir("admin", "GET", `/v1/llaves?cliente=${e.ids.clienteA}`);
    assert.equal(lista.estado, 200);
    const enLista = lista.cuerpo.items.find((l: { id: string }) => l.id === creada.cuerpo.id);
    assert.ok(enLista);
    assert.ok(!JSON.stringify(lista.cuerpo).includes(llave));
    assert.equal(enLista.revocadaEl, null);

    const conLlave = await e.pedir({ token: llave }, "GET", "/v1/yo");
    assert.equal(conLlave.estado, 200);
    assert.equal(conLlave.cuerpo.tipo, "llave");
    assert.equal(conLlave.cuerpo.cliente.id, e.ids.clienteA);

    const revocada = await e.pedir("admin", "DELETE", `/v1/llaves/${creada.cuerpo.id}`);
    assert.equal(revocada.estado, 200);
    assert.ok(revocada.cuerpo.revocadaEl);
    assert.equal((await e.pedir({ token: llave }, "GET", "/v1/yo")).estado, 401);
    assert.equal((await e.pedir("admin", "DELETE", `/v1/llaves/${creada.cuerpo.id}`)).estado, 409, "revocar dos veces");
    // La fila queda de registro.
    assert.ok(await db.llaveApi.findUnique({ where: { id: creada.cuerpo.id } }));
  });

  test("no se crea una llave en el espacio de Proges ni para un cliente que no existe", async () => {
    assert.equal((await e.pedir("admin", "POST", "/v1/llaves", { clienteId: ORG_PROGES, nombre: "X" })).estado, 400);
    assert.equal((await e.pedir("admin", "POST", "/v1/llaves", { clienteId: "no_existe", nombre: "X" })).estado, 400);
  });
});

describe("resultados: permisos", () => {
  test("equipo sin jefatura, dueño y llave: 403; jefatura y admin: 200", async () => {
    for (const quien of ["equipo", "clienteA", "llaveA"] as const) {
      assert.equal((await e.pedir(quien, "GET", "/v1/resultados")).estado, 403, quien);
    }
    assert.equal((await e.pedir("anonimo", "GET", "/v1/resultados")).estado, 401);
    assert.equal((await e.pedir("jefatura", "GET", "/v1/resultados")).estado, 200);
    assert.equal((await e.pedir("admin", "GET", "/v1/resultados")).estado, 200);
  });

  test("un período al revés o un cliente que no existe: 400", async () => {
    assert.equal((await e.pedir("jefatura", "GET", "/v1/resultados?desde=2026-11-10&hasta=2026-11-01")).estado, 400);
    assert.equal((await e.pedir("jefatura", "GET", "/v1/resultados?cliente=no_existe")).estado, 400);
  });
});

describe("resultados: las cuentas, con un caso armado a mano", () => {
  // Un servicio de venta abierto el lunes 2 de noviembre a las 12:00 y cerrado el lunes 16 a las
  // 12:00 (14 días). Esperó al conservador del 4 al 9 (5 días) y al dueño del 10 al 12 (2 días);
  // el resto del tiempo estuvo en manos de Proges.
  const abierto = momento("2026-11-02T12:00:00Z");
  const cerrado = momento("2026-11-16T12:00:00Z");
  const eventos = [
    { fecha: momento("2026-11-04T12:00:00Z"), nuevo: "CONSERVADOR" },
    { fecha: momento("2026-11-09T12:00:00Z"), nuevo: "" },
    { fecha: momento("2026-11-10T12:00:00Z"), nuevo: "DUENO" },
    { fecha: momento("2026-11-12T12:00:00Z"), nuevo: "" },
  ];

  test("días esperando y trabajando de un servicio", () => {
    const t = tiempoDeServicio({ tipo: "VENTA", abiertoEl: abierto, cerradoEl: cerrado, eventos });
    assert.equal(t.dias, 14);
    assert.equal(t.esperando, 7); // 5 días al conservador + 2 al dueño
    assert.equal(t.trabajando, 7);
  });

  test("cambiar de a quién se espera es un solo tramo; una espera sin quitar cuenta hasta el cierre", () => {
    const seguidos = [
      { fecha: momento("2026-11-04T12:00:00Z"), nuevo: "CONSERVADOR" },
      { fecha: momento("2026-11-06T12:00:00Z"), nuevo: "NOTARIA" },
    ];
    // Del 4 al 16: 12 días seguidos esperando.
    assert.equal(msEsperando(seguidos, abierto, cerrado) / 86_400_000, 12);
    // Una espera puesta antes de abrir no cuenta lo anterior; una posterior al cierre no cuenta nada.
    assert.equal(msEsperando([{ fecha: momento("2026-11-20T12:00:00Z"), nuevo: "BANCO" }], abierto, cerrado), 0);
    assert.equal(msEsperando([{ fecha: momento("2026-10-30T12:00:00Z"), nuevo: "BANCO" }], abierto, cerrado) / 86_400_000, 14);
  });

  test("por tipo y las cifras de arriba", () => {
    const sinEspera = { tipo: "VENTA" as const, abiertoEl: abierto, cerradoEl: momento("2026-11-04T12:00:00Z"), eventos: [] };
    const conEspera = { tipo: "VENTA" as const, abiertoEl: abierto, cerradoEl: cerrado, eventos };
    const obra = { tipo: "OBRA" as const, abiertoEl: abierto, cerradoEl: momento("2026-11-12T12:00:00Z"), eventos: [] };

    const porTipo = diasPorTipo([sinEspera, conEspera, obra]);
    assert.deepEqual(porTipo, [
      { tipo: "VENTA", servicios: 2, diasTrabajando: 4.5, diasEsperando: 3.5 }, // (2+7)/2 y (0+7)/2
      { tipo: "OBRA", servicios: 1, diasTrabajando: 10, diasEsperando: 0 },
    ]);

    const cifras = cifrasDeServicios([sinEspera, conEspera, obra]);
    assert.equal(cifras.serviciosCerrados, 3);
    assert.equal(cifras.duracionPromedioDias, 8.7); // (2+14+10)/3
    assert.equal(cifras.porcentajeEsperando, 26.9); // 7 de 26 días
    assert.deepEqual(cifrasDeServicios([]), { serviciosCerrados: 0, duracionPromedioDias: null, porcentajeEsperando: null });
  });

  test("servicios por semana: lunes a domingo, semanas vacías en cero", () => {
    const semanas = serviciosPorSemana(
      [momento("2026-11-02T12:00:00Z"), momento("2026-11-08T12:00:00Z"), momento("2026-11-17T12:00:00Z")],
      [momento("2026-11-16T12:00:00Z"), momento("2026-12-30T12:00:00Z")], // el segundo cae fuera del período
      dia("2026-11-02"),
      dia("2026-11-22"),
    );
    assert.deepEqual(
      semanas.map((s) => [s.semana.toISOString().slice(0, 10), s.entran, s.cierran]),
      [
        ["2026-11-02", 2, 0],
        ["2026-11-09", 0, 0],
        ["2026-11-16", 1, 1],
      ],
    );
  });

  test("tareas a tiempo por persona; las que aún tienen plazo no cuentan", () => {
    const hoy = dia("2026-11-19");
    const lista = tareasATiempoPorPersona(
      [
        { responsableId: "u1", responsableNombre: "Ana", vence: dia("2026-11-10"), hechaEl: momento("2026-11-10T15:00:00Z") }, // a tiempo (el mismo día)
        { responsableId: "u1", responsableNombre: "Ana", vence: dia("2026-11-10"), hechaEl: momento("2026-11-12T15:00:00Z") }, // tarde
        { responsableId: "u1", responsableNombre: "Ana", vence: dia("2026-11-12"), hechaEl: null }, // venció sin hacer
        { responsableId: "u1", responsableNombre: "Ana", vence: dia("2026-11-25"), hechaEl: null }, // aún a tiempo: no cuenta
        { responsableId: "u2", responsableNombre: "Beto", vence: dia("2026-11-05"), hechaEl: momento("2026-11-03T15:00:00Z") },
        { responsableId: "u2", responsableNombre: "Beto", vence: dia("2026-10-01"), hechaEl: null }, // fuera del período
      ],
      dia("2026-11-01"),
      dia("2026-11-30"),
      hoy,
    );
    assert.deepEqual(lista, [
      { usuarioId: "u1", nombre: "Ana", hechasATiempo: 1, hechasTarde: 1, vencidasSinHacer: 1, porcentajeATiempo: 33.3 },
      { usuarioId: "u2", nombre: "Beto", hechasATiempo: 1, hechasTarde: 0, vencidasSinHacer: 0, porcentajeATiempo: 100 },
    ]);
  });

  test("obras: aprobado contra facturado y margen", () => {
    const base = {
      clienteId: "c",
      clienteNombre: "Cliente C",
      propiedad: "Agustinas 715",
      estado: "TERMINADO" as const,
      presupuestos: [
        { tipo: "ORIGINAL" as const, estado: "APROBADO" as const, total: 1_000_000 },
        { tipo: "ADICIONAL" as const, estado: "APROBADO" as const, total: 200_000 },
        { tipo: "ORIGINAL" as const, estado: "RECHAZADO" as const, total: 5_000_000 },
      ],
      facturas: [
        { origen: "manual" as const, montoAsignado: 700_000, pagada: true },
        { origen: "odoo" as const, montoAsignado: 600_000, total: 600_000, pendiente: 0, estado: "publicada" as const },
      ],
    };
    const conOrden = resultadoDeObra({ ...base, servicioId: "a", orden: { total: 2_000_000, moneda: "CLP" } });
    assert.equal(conOrden.costoAprobado, 1_200_000);
    assert.equal(conOrden.facturado, 1_300_000);
    assert.equal(conOrden.diferencia, 100_000);
    assert.equal(conOrden.margen, 700_000);
    const enUf = resultadoDeObra({ ...base, servicioId: "b", orden: { total: 100, moneda: "UF" } });
    assert.equal(enUf.margen, null);
    const sinOrden = resultadoDeObra({ ...base, servicioId: "c", orden: null });
    assert.equal(sinOrden.precioDueno, null);

    assert.deepEqual(margenDeObras([conOrden, enUf, sinOrden]), { margen: 700_000, porcentaje: 35 });
    assert.deepEqual(margenDeObras([enUf]), { margen: null, porcentaje: null });
  });
});

describe("resultados: de punta a punta con datos en la base", () => {
  test("la jefatura ve los servicios cerrados, las esperas y las tareas del cliente A", async () => {
    const catalogo = await db.servicio.create({
      data: { organizationId: ORG_PROGES, codigo: "NV-900", familia: "NV", nombre: `Venta de prueba ${e.ids.clienteA}` },
    });
    idsDeCatalogo.push(catalogo.id);
    const propiedad = await db.property.create({
      data: { organizationId: e.ids.clienteA, tipo: "CASA", direccion: "Calle de prueba 1", comuna: "Santiago", region: "RM" },
    });
    const servicio = await db.servicioEnCurso.create({
      data: {
        organizationId: e.ids.clienteA,
        propertyId: propiedad.id,
        servicioId: catalogo.id,
        tipo: "VENTA",
        estado: "TERMINADO",
        abiertoEl: momento("2026-11-02T12:00:00Z"),
        cerradoEl: momento("2026-11-16T12:00:00Z"),
      },
    });
    await db.evento.createMany({
      data: [
        { organizationId: e.ids.clienteA, servicioEnCursoId: servicio.id, tipo: "ESPERA", nuevo: "NOTARIA", fecha: momento("2026-11-04T12:00:00Z") },
        { organizationId: e.ids.clienteA, servicioEnCursoId: servicio.id, tipo: "ESPERA", anterior: "NOTARIA", nuevo: "", fecha: momento("2026-11-09T12:00:00Z") },
      ],
    });
    await db.tarea.create({
      data: {
        organizationId: e.ids.clienteA,
        servicioEnCursoId: servicio.id,
        que: "Llamar a la notaría",
        responsableId: e.ids.equipo,
        creadaPorId: e.ids.jefatura,
        vence: dia("2026-11-10"),
        hechaEl: momento("2026-11-09T15:00:00Z"),
        hechaPorId: e.ids.equipo,
      },
    });

    const r = await e.pedir("jefatura", "GET", `/v1/resultados?desde=2026-11-02&hasta=2026-11-22&cliente=${e.ids.clienteA}`);
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.cliente, e.ids.clienteA);
    assert.equal(r.cuerpo.cifras.serviciosCerrados, 1);
    assert.equal(r.cuerpo.cifras.duracionPromedioDias, 14);
    assert.equal(r.cuerpo.cifras.porcentajeEsperando, 35.7); // 5 de 14 días
    assert.deepEqual(r.cuerpo.diasPorTipo, [{ tipo: "VENTA", servicios: 1, diasTrabajando: 9, diasEsperando: 5 }]);
    assert.deepEqual(
      r.cuerpo.serviciosPorSemana.map((s: { semana: string; entran: number; cierran: number }) => [s.semana, s.entran, s.cierran]),
      [
        ["2026-11-02", 1, 0],
        ["2026-11-09", 0, 0],
        ["2026-11-16", 0, 1],
      ],
    );
    assert.equal(r.cuerpo.tareas.length, 1);
    assert.equal(r.cuerpo.tareas[0].porcentajeATiempo, 100);
    assert.deepEqual(r.cuerpo.obras, []);
    assert.equal(r.cuerpo.cifras.margenObras, null);

    // Otro cliente no ve nada de esto.
    const deB = await e.pedir("jefatura", "GET", `/v1/resultados?desde=2026-11-02&hasta=2026-11-22&cliente=${e.ids.clienteB}`);
    assert.equal(deB.cuerpo.cifras.serviciosCerrados, 0);
  });
});

test("las reglas de usuario: un cliente nunca es admin y el admin no se quita el admin", () => {
  const base = { nombre: "N", correo: "n@x.cl", rol: "EQUIPO" as const, clienteId: null, admin: true, jefatura: true, activo: true };
  const aCliente = aplicarCambios(base, { rol: "CLIENTE", clienteId: "cli_1" });
  assert.equal(aCliente.admin, false);
  assert.equal(aCliente.jefatura, false);
  assert.equal(camposFaltantes({ ...aCliente, clienteId: null })?.clienteId, "Elige el cliente.");
  assert.equal(aplicarCambios(aCliente, { rol: "EQUIPO" }).clienteId, null);
  assert.ok(problemaDeAutoEdicion(true, { ...base, admin: false }));
  assert.equal(problemaDeAutoEdicion(false, { ...base, admin: false }), null);
});
