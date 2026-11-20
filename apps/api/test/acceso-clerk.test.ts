// El verificador real de Clerk, con el token y la cuenta de Clerk de mentira: el correo con que se
// enlaza un Usuario precreado solo sale de un correo principal VERIFICADO de la cuenta, nunca del
// reclamo «email» del token (que no dice si está verificado).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { verificadorDeClerk, type DepClerk } from "../src/acceso/clerk";

type Cuenta = Awaited<ReturnType<NonNullable<DepClerk["traerCuenta"]>>>;

function cuentaCon(correo: string, estado: "verified" | "unverified"): Cuenta {
  return {
    primaryEmailAddressId: "idn_1",
    emailAddresses: [{ id: "idn_1", emailAddress: correo, verification: { status: estado } }],
  } as unknown as Cuenta;
}

function verificador(claims: Record<string, unknown>, cuenta: Cuenta) {
  let consultas = 0;
  const v = verificadorDeClerk("sk_test_falsa", {
    verificar: async () => claims,
    traerCuenta: async () => {
      consultas += 1;
      return cuenta;
    },
  });
  return { v, consultas: () => consultas };
}

describe("verificadorDeClerk: el correo", () => {
  test("un correo sin verificar no se usa, aunque el token lo traiga en el reclamo email", async () => {
    const { v } = verificador({ sub: "user_a", email: "admin@proges.cl" }, cuentaCon("admin@proges.cl", "unverified"));
    assert.deepEqual(await v("t"), { clerkUserId: "user_a", correo: null });
  });

  test("con el correo verificado, sale el de la cuenta de Clerk y no el del reclamo del token", async () => {
    const { v } = verificador({ sub: "user_b", email: "otro@x.cl" }, cuentaCon("yo@proges.cl", "verified"));
    assert.deepEqual(await v("t"), { clerkUserId: "user_b", correo: "yo@proges.cl" });
  });

  test("sin reclamo email también se pregunta a Clerk, y la respuesta se recuerda", async () => {
    const { v, consultas } = verificador({ sub: "user_c" }, cuentaCon("c@proges.cl", "verified"));
    await v("t");
    assert.deepEqual(await v("t"), { clerkUserId: "user_c", correo: "c@proges.cl" });
    assert.equal(consultas(), 1);
  });

  test("un token sin sub no es una sesión", async () => {
    const { v } = verificador({}, cuentaCon("c@proges.cl", "verified"));
    assert.equal(await v("t"), null);
  });
});
