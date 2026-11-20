// Dos reglas de Configuración que cuidan quién puede entrar:
// - Cambiar el correo de un usuario suelta su enlace con Clerk (la cuenta vieja no sigue entrando).
// - Las llaves de un cliente desactivado se pueden ver y revocar; revocada una, no sirve aunque el
//   cliente se reactive.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db } from "@proges/db";
import { crearEscenario, tokenDePrueba, type Escenario } from "./ayuda";

let e: Escenario;

before(async () => {
  e = await crearEscenario();
});
after(() => e.limpiar());

describe("cambiar el correo de un usuario", () => {
  test("suelta el clerkUserId; el correo nuevo entra con su cuenta y la vieja ya no", async () => {
    const viejo = `viejo.${e.ids.clienteA}@prueba.proges.cl`;
    const nuevo = `nuevo.${e.ids.clienteA}@prueba.proges.cl`;
    const usuario = await db.usuario.create({
      data: { organizationId: e.ids.clienteA, email: viejo, nombre: "Persona", rol: "CLIENTE", clerkUserId: `user_vieja_${e.ids.clienteA}` },
    });

    // Un cambio que no toca el correo no suelta el enlace.
    const nombre = await e.pedir("admin", "PATCH", `/v1/usuarios/${usuario.id}`, { nombre: "Persona 2" });
    assert.equal(nombre.estado, 200);
    assert.equal((await db.usuario.findUniqueOrThrow({ where: { id: usuario.id } })).clerkUserId, `user_vieja_${e.ids.clienteA}`);

    const cambio = await e.pedir("admin", "PATCH", `/v1/usuarios/${usuario.id}`, { correo: nuevo });
    assert.equal(cambio.estado, 200);
    assert.equal((await db.usuario.findUniqueOrThrow({ where: { id: usuario.id } })).clerkUserId, null);

    // La cuenta de Clerk vieja ya no entra (ni por correo: el viejo no existe más).
    const cuentaVieja = await e.pedir({ token: tokenDePrueba(`user_vieja_${e.ids.clienteA}`, viejo) }, "GET", "/v1/yo");
    assert.equal(cuentaVieja.estado, 403);
    // La persona del correo nuevo entra y queda enlazada.
    const cuentaNueva = await e.pedir({ token: tokenDePrueba(`user_nueva_${e.ids.clienteA}`, nuevo) }, "GET", "/v1/yo");
    assert.equal(cuentaNueva.estado, 200);
    assert.equal((await db.usuario.findUniqueOrThrow({ where: { id: usuario.id } })).clerkUserId, `user_nueva_${e.ids.clienteA}`);
  });
});

describe("llaves de un cliente desactivado", () => {
  test("el administrador las ve y las revoca; reactivado el cliente, no sirven", async () => {
    await db.organizacion.update({ where: { id: e.ids.clienteA }, data: { activa: false } });
    try {
      // El portero ya la rechaza mientras el cliente está desactivado.
      assert.equal((await e.pedir("llaveA", "GET", "/v1/yo")).estado, 403);

      const lista = await e.pedir("admin", "GET", "/v1/llaves");
      assert.ok(lista.cuerpo.items.some((l: { id: string }) => l.id === e.ids.llaveA), "aparece en la lista general");
      const filtrada = await e.pedir("admin", "GET", `/v1/llaves?cliente=${e.ids.clienteA}`);
      assert.ok(filtrada.cuerpo.items.some((l: { id: string }) => l.id === e.ids.llaveA), "aparece al filtrar por su cliente");

      const revocada = await e.pedir("admin", "DELETE", `/v1/llaves/${e.ids.llaveA}`);
      assert.equal(revocada.estado, 200);
      assert.ok(revocada.cuerpo.revocadaEl);
    } finally {
      await db.organizacion.update({ where: { id: e.ids.clienteA }, data: { activa: true } });
    }
    assert.equal((await e.pedir("llaveA", "GET", "/v1/yo")).estado, 401, "revocada, no vuelve a servir");
  });
});
