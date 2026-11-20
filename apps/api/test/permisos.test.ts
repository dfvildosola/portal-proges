// Las reglas de espacios, en sus versiones puras (sin base): quién lee y escribe en qué cliente.
// Traslada legado/scripts/probar-espacios.ts. No crea nada en la base.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  espacioParaCrearPuro,
  espaciosQueLeePuro,
  esDueno,
  exigirAdmin,
  exigirCliente,
  exigirEquipo,
  exigirEscritura,
  exigirJefatura,
  exigirJefaturaOAdmin,
  puedeEscribirEnPuro,
  puedeLeerPuro,
  type Portador,
} from "../src/permisos";
import { ErrorApi } from "../src/errores";
import { quienDeUsuario, type Quien } from "../src/acceso/quien";
import type { Usuario } from "@proges/db";

const A = "cliente_a";
const B = "cliente_b";
const INACTIVO = "cliente_inactivo"; // no está en la lista de activos
const ACTIVOS = [A, B];

const equipo: Portador = { tipo: "usuario", clienteId: null };
const clienteA: Portador = { tipo: "usuario", clienteId: A };
const llaveA: Portador = { tipo: "llave", clienteId: A };

// Lanza un ErrorApi con ese estado.
function lanza(estado: number, fn: () => unknown) {
  assert.throws(fn, (e: unknown) => e instanceof ErrorApi && e.estado === estado);
}

describe("lectura", () => {
  test("el cliente A lee solo lo suyo, aunque pida el filtro de B", () => {
    assert.deepEqual(espaciosQueLeePuro(clienteA, ACTIVOS), [A]);
    assert.deepEqual(espaciosQueLeePuro(clienteA, ACTIVOS, B), [A]);
    assert.equal(puedeLeerPuro(clienteA, A, ACTIVOS), true);
    assert.equal(puedeLeerPuro(clienteA, B, ACTIVOS), false);
  });

  test("la llave de A lee solo lo de A", () => {
    assert.deepEqual(espaciosQueLeePuro(llaveA, ACTIVOS, B), [A]);
    assert.equal(puedeLeerPuro(llaveA, B, ACTIVOS), false);
  });

  test("el equipo lee todos los clientes activos, o el del filtro", () => {
    assert.deepEqual(espaciosQueLeePuro(equipo, ACTIVOS), ACTIVOS);
    assert.deepEqual(espaciosQueLeePuro(equipo, ACTIVOS, B), [B]);
    assert.equal(puedeLeerPuro(equipo, B, ACTIVOS), true);
  });

  test("un filtro inventado o de un cliente inactivo no deja leer de más", () => {
    assert.deepEqual(espaciosQueLeePuro(equipo, ACTIVOS, "inventado"), ACTIVOS);
    assert.deepEqual(espaciosQueLeePuro(equipo, ACTIVOS, INACTIVO), ACTIVOS);
    assert.equal(puedeLeerPuro(equipo, INACTIVO, ACTIVOS), false);
    assert.equal(puedeLeerPuro(equipo, "org_proges", ACTIVOS), false);
  });
});

describe("escritura", () => {
  test("una llave nunca escribe, ni en su propio cliente", () => {
    assert.equal(puedeEscribirEnPuro(llaveA, A, ACTIVOS), false);
    lanza(403, () => espacioParaCrearPuro(llaveA, A, ACTIVOS));
  });

  test("el cliente A escribe solo en lo suyo", () => {
    assert.equal(puedeEscribirEnPuro(clienteA, A, ACTIVOS), true);
    assert.equal(puedeEscribirEnPuro(clienteA, B, ACTIVOS), false);
  });

  test("el equipo escribe en clientes activos, no en inactivos ni en org_proges", () => {
    assert.equal(puedeEscribirEnPuro(equipo, B, ACTIVOS), true);
    assert.equal(puedeEscribirEnPuro(equipo, INACTIVO, ACTIVOS), false);
    assert.equal(puedeEscribirEnPuro(equipo, "org_proges", ACTIVOS), false);
  });

  test("al crear, el cliente usa el suyo y se ignora lo que mande", () => {
    assert.equal(espacioParaCrearPuro(clienteA, B, ACTIVOS), A);
    assert.equal(espacioParaCrearPuro(clienteA, null, ACTIVOS), A);
  });

  test("al crear, el equipo tiene que elegir un cliente activo", () => {
    assert.equal(espacioParaCrearPuro(equipo, B, ACTIVOS), B);
    lanza(400, () => espacioParaCrearPuro(equipo, null, ACTIVOS));
    lanza(400, () => espacioParaCrearPuro(equipo, INACTIVO, ACTIVOS));
  });
});

describe("marcas", () => {
  const usuario = (datos: Partial<Usuario>): Usuario =>
    ({
      id: "u",
      organizationId: "org_proges",
      email: "x@prueba.cl",
      clerkUserId: null,
      nombre: "X",
      rol: "EQUIPO",
      admin: false,
      jefatura: false,
      activo: true,
      ultimoIngreso: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...datos,
    }) as Usuario;
  const llave: Quien = { tipo: "llave", clienteId: A, llaveId: "l", nombre: "Llave" };

  test("un usuario de cliente nunca es jefatura ni admin, aunque la base lo diga", () => {
    const q = quienDeUsuario(usuario({ rol: "CLIENTE", organizationId: A, jefatura: true, admin: true }), {
      modo: "AUTONOMO",
    });
    assert.equal(q.esJefatura, false);
    assert.equal(q.esAdmin, false);
    assert.equal(q.clienteId, A);
    assert.equal(q.modo, "AUTONOMO");
    lanza(403, () => exigirJefatura(q));
    lanza(403, () => exigirAdmin(q));
    lanza(403, () => exigirEquipo(q));
  });

  test("equipo, jefatura y admin", () => {
    const simple = quienDeUsuario(usuario({}), null);
    const jefa = quienDeUsuario(usuario({ jefatura: true }), null);
    const admin = quienDeUsuario(usuario({ admin: true }), null);
    assert.equal(simple.clienteId, null);
    assert.equal(exigirEquipo(simple), simple);
    lanza(403, () => exigirJefatura(simple));
    lanza(403, () => exigirJefaturaOAdmin(simple));
    assert.equal(exigirJefatura(jefa), jefa);
    lanza(403, () => exigirJefatura(admin)); // el admin no aprueba presupuestos (salvo que sea jefatura)
    assert.equal(exigirJefaturaOAdmin(admin), admin);
    assert.equal(exigirAdmin(admin), admin);
  });

  test("una llave: es dueño, no escribe, no es equipo ni cliente que responde ofertas", () => {
    assert.equal(esDueno(llave), true);
    lanza(403, () => exigirEscritura(llave));
    lanza(403, () => exigirEquipo(llave));
    lanza(403, () => exigirCliente(llave));
  });

  test("lo que sale hacia un cliente va recortado; hacia el equipo no", () => {
    assert.equal(esDueno(quienDeUsuario(usuario({ rol: "CLIENTE", organizationId: A }), { modo: "ATENDIDO" })), true);
    assert.equal(esDueno(quienDeUsuario(usuario({}), null)), false);
  });
});

describe("clavesInternas (la ayuda de las pruebas de recorte)", async () => {
  const { clavesInternas } = await import("./ayuda");
  test("encuentra costos y márgenes a cualquier profundidad", () => {
    assert.deepEqual(clavesInternas({ id: "1", obra: { partidas: [{ costoMaestro: 1, precio: 2 }] }, margen: 3 }), [
      ".obra.partidas[0].costoMaestro",
      ".margen",
    ]);
    assert.deepEqual(clavesInternas({ id: "1", precio: { valor: "1", moneda: "CLP" } }), []);
  });
});
