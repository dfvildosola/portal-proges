// El portero de la API, de punta a punta: quién entra, con qué, y qué pasa si no.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { crearEscenario, tokenDePrueba, type Escenario } from "./ayuda";
import { espacioParaEscribirEn, exigirEscritura, exigirLecturaEn } from "../src/permisos";
import { generarLlave, huellaDeLlave } from "../src/acceso/llaves";

let e: Escenario;

before(async () => {
  e = await crearEscenario();
  // Rutas de mentira, solo para estas pruebas.
  // Escribe si el permiso lo deja.
  e.app.post("/v1/prueba-escritura", (c) => {
    exigirEscritura(c.get("quien"));
    return c.json({ ok: true }, 200);
  });
  // Lee o escribe en el espacio que diga la dirección, con las funciones de permisos de verdad.
  e.app.get("/v1/prueba-lectura/:org", async (c) => {
    await exigirLecturaEn(c.get("quien"), c.req.param("org"));
    return c.json({ ok: true }, 200);
  });
  e.app.post("/v1/prueba-escritura/:org", async (c) => {
    await espacioParaEscribirEn(c.get("quien"), c.req.param("org"));
    return c.json({ ok: true }, 200);
  });
  // Valida el cuerpo con zod, como lo hará cada ruta de verdad.
  e.app.openapi(
    createRoute({
      method: "post",
      path: "/v1/prueba-validacion",
      request: {
        body: { content: { "application/json": { schema: z.object({ nombre: z.string().min(1), monto: z.number() }) } } },
      },
      responses: { 200: { description: "ok", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } } },
    }),
    (c) => c.json({ ok: true }, 200),
  );
  // Falla de una forma que nadie previó.
  e.app.get("/v1/prueba-falla", () => {
    throw new Error("detalle interno que no debe salir");
  });
});

after(() => e.limpiar());

describe("sin identificarse", () => {
  test("sin token: 401 con el mensaje en la forma del contrato", async () => {
    const r = await e.pedir("anonimo", "GET", "/v1/yo");
    assert.equal(r.estado, 401);
    assert.equal(typeof r.cuerpo.error.mensaje, "string");
  });

  test("un encabezado que no es «Bearer …»: 401", async () => {
    const res = await e.app.request("/v1/yo", { headers: { Authorization: "Basic abc" } });
    assert.equal(res.status, 401);
  });

  test("las rutas públicas responden sin token", async () => {
    assert.equal((await e.pedir("anonimo", "GET", "/v1/salud")).estado, 200);
    const doc = await e.pedir("anonimo", "GET", "/openapi.json");
    assert.equal(doc.estado, 200);
    assert.ok(doc.cuerpo.paths["/v1/yo"], "/openapi.json lista /v1/yo");
    assert.ok(doc.cuerpo.components.securitySchemes.bearer, "documenta el esquema bearer");
    assert.equal((await e.pedir("anonimo", "GET", "/docs")).estado, 200);
  });

  test("una ruta que no existe, con sesión: 404 en JSON", async () => {
    const r = await e.pedir("equipo", "GET", "/v1/no-existe");
    assert.equal(r.estado, 404);
    assert.equal(typeof r.cuerpo.error.mensaje, "string");
  });
});

describe("sesiones", () => {
  test("una sesión que Clerk no reconoce: 401", async () => {
    const r = await e.pedir({ token: "cualquier-cosa" }, "GET", "/v1/yo");
    assert.equal(r.estado, 401);
  });

  test("una cuenta de Clerk sin usuario en el portal: 403", async () => {
    const r = await e.pedir({ token: tokenDePrueba(`user_desconocido_${process.pid}`, "nadie@prueba.cl") }, "GET", "/v1/yo");
    assert.equal(r.estado, 403);
  });

  test("un usuario desactivado: 403", async () => {
    await db.usuario.update({ where: { id: e.ids.usuarioB }, data: { activo: false } });
    try {
      assert.equal((await e.pedir("clienteB", "GET", "/v1/yo")).estado, 403);
    } finally {
      await db.usuario.update({ where: { id: e.ids.usuarioB }, data: { activo: true } });
    }
  });

  test("un cliente desactivado deja fuera a sus usuarios y a su llave: 403", async () => {
    await db.organizacion.update({ where: { id: e.ids.clienteA }, data: { activa: false } });
    try {
      assert.equal((await e.pedir("clienteA", "GET", "/v1/yo")).estado, 403);
      assert.equal((await e.pedir("llaveA", "GET", "/v1/yo")).estado, 403);
    } finally {
      await db.organizacion.update({ where: { id: e.ids.clienteA }, data: { activa: true } });
    }
  });

  test("primer ingreso: se encuentra por correo (sin importar mayúsculas) y queda enlazado", async () => {
    const correo = `nuevo.${process.pid}.${Date.now()}@prueba.proges.cl`;
    const nuevo = await db.usuario.create({
      data: { organizationId: e.ids.clienteA, email: correo, nombre: "Nuevo", rol: "CLIENTE" },
    });
    const clerkUserId = `user_nuevo_${process.pid}_${Date.now()}`;
    const r = await e.pedir({ token: tokenDePrueba(clerkUserId, correo.toUpperCase()) }, "GET", "/v1/yo");
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.usuario.id, nuevo.id);
    const guardado = await db.usuario.findUniqueOrThrow({ where: { id: nuevo.id } });
    assert.equal(guardado.clerkUserId, clerkUserId);
    assert.ok(guardado.ultimoIngreso, "anota el último ingreso");
    // Otra cuenta de Clerk con el mismo correo no se enlaza sola.
    const otra = await e.pedir({ token: tokenDePrueba(`user_otra_${process.pid}`, correo) }, "GET", "/v1/yo");
    assert.equal(otra.estado, 403);
  });
});

describe("llaves", () => {
  test("una llave inventada con la forma correcta: 401", async () => {
    const r = await e.pedir({ token: generarLlave().llave }, "GET", "/v1/yo");
    assert.equal(r.estado, 401);
  });

  test("la llave guarda solo su huella, y anota el último uso", async () => {
    const llave = await db.llaveApi.findUniqueOrThrow({ where: { id: e.ids.llaveA } });
    assert.equal(llave.huella, huellaDeLlave(e.tokens.llaveA));
    assert.ok(!JSON.stringify(llave).includes(e.tokens.llaveA), "la llave completa no está en la base");
    assert.equal((await e.pedir("llaveA", "GET", "/v1/yo")).estado, 200);
    const usada = await db.llaveApi.findUniqueOrThrow({ where: { id: e.ids.llaveA } });
    assert.ok(usada.ultimoUso, "anota el último uso");
  });

  test("una llave revocada: 401", async () => {
    const nueva = generarLlave();
    await db.llaveApi.create({
      data: {
        organizationId: e.ids.clienteA,
        nombre: "Revocada",
        prefijo: nueva.prefijo,
        huella: nueva.huella,
        revocadaEl: new Date(),
      },
    });
    assert.equal((await e.pedir({ token: nueva.llave }, "GET", "/v1/yo")).estado, 401);
  });

  test("una llave no puede escribir: 403", async () => {
    const r = await e.pedir("llaveA", "POST", "/v1/prueba-escritura", {});
    assert.equal(r.estado, 403);
    assert.match(r.cuerpo.error.mensaje, /solo leen/);
    // La misma ruta, con una persona, sí escribe.
    assert.equal((await e.pedir("clienteA", "POST", "/v1/prueba-escritura", {})).estado, 200);
  });
});

describe("/v1/yo", () => {
  test("equipo: sin cliente, sin marcas", async () => {
    const r = await e.pedir("equipo", "GET", "/v1/yo");
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.tipo, "usuario");
    assert.equal(r.cuerpo.rol, "EQUIPO");
    assert.equal(r.cuerpo.cliente, null);
    assert.deepEqual(r.cuerpo.marcas, { jefatura: false, admin: false });
  });

  test("jefatura y admin traen su marca", async () => {
    assert.deepEqual((await e.pedir("jefatura", "GET", "/v1/yo")).cuerpo.marcas, { jefatura: true, admin: false });
    assert.deepEqual((await e.pedir("admin", "GET", "/v1/yo")).cuerpo.marcas, { jefatura: false, admin: true });
  });

  test("cliente A (atendido) y cliente B (autónomo) ven su cliente y su modo", async () => {
    const a = await e.pedir("clienteA", "GET", "/v1/yo");
    assert.equal(a.cuerpo.rol, "CLIENTE");
    assert.deepEqual([a.cuerpo.cliente.id, a.cuerpo.cliente.modo], [e.ids.clienteA, "ATENDIDO"]);
    const b = await e.pedir("clienteB", "GET", "/v1/yo");
    assert.deepEqual([b.cuerpo.cliente.id, b.cuerpo.cliente.modo], [e.ids.clienteB, "AUTONOMO"]);
  });

  test("con llave: la llave y su cliente", async () => {
    const r = await e.pedir("llaveA", "GET", "/v1/yo");
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.tipo, "llave");
    assert.equal(r.cuerpo.llave.id, e.ids.llaveA);
    assert.equal(r.cuerpo.cliente.id, e.ids.clienteA);
  });
});

describe("espacios de verdad (con la base)", () => {
  const lee = (quien: Parameters<Escenario["pedir"]>[0], org: string) =>
    e.pedir(quien, "GET", `/v1/prueba-lectura/${org}`).then((r) => r.estado);
  const escribe = (quien: Parameters<Escenario["pedir"]>[0], org: string) =>
    e.pedir(quien, "POST", `/v1/prueba-escritura/${org}`, {}).then((r) => r.estado);

  test("el cliente A y su llave no leen lo de B: 404, como si no existiera", async () => {
    assert.equal(await lee("clienteA", e.ids.clienteA), 200);
    assert.equal(await lee("clienteA", e.ids.clienteB), 404);
    assert.equal(await lee("llaveA", e.ids.clienteA), 200);
    assert.equal(await lee("llaveA", e.ids.clienteB), 404);
    assert.equal(await lee("clienteB", e.ids.clienteA), 404);
  });

  test("el equipo lee a los dos clientes", async () => {
    assert.equal(await lee("equipo", e.ids.clienteA), 200);
    assert.equal(await lee("equipo", e.ids.clienteB), 200);
  });

  test("escribir: la llave nunca (403), el cliente solo lo suyo (404 en lo ajeno), el equipo en ambos", async () => {
    assert.equal(await escribe("llaveA", e.ids.clienteA), 403);
    assert.equal(await escribe("clienteA", e.ids.clienteA), 200);
    assert.equal(await escribe("clienteA", e.ids.clienteB), 404);
    assert.equal(await escribe("equipo", e.ids.clienteB), 200);
  });
});

describe("errores", () => {
  test("un cuerpo que no cumple el contrato: 400 con los campos en español", async () => {
    const r = await e.pedir("equipo", "POST", "/v1/prueba-validacion", { nombre: "" });
    assert.equal(r.estado, 400);
    assert.equal(typeof r.cuerpo.error.campos.nombre, "string");
    assert.match(r.cuerpo.error.campos.monto, /se esperaba/i);
  });

  test("un cuerpo que no es JSON: 400", async () => {
    const res = await e.app.request("/v1/prueba-validacion", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.tokens.equipo}`, "Content-Type": "application/json" },
      body: "{no es json",
    });
    assert.equal(res.status, 400);
    const cuerpo = (await res.json()) as { error: { mensaje: string } };
    assert.match(cuerpo.error.mensaje, /JSON/);
  });

  test("un error imprevisto: 500 sin detalles internos", async (t) => {
    t.mock.method(console, "error", () => {}); // el registro del error es esperado: no ensucia la salida
    const r = await e.pedir("equipo", "GET", "/v1/prueba-falla");
    assert.equal(r.estado, 500);
    assert.ok(!JSON.stringify(r.cuerpo).includes("detalle interno"));
  });
});
