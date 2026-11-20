// miniatura() de Drive, con el fetch de mentira: la miniatura se pide con el token de la cuenta de
// servicio y solo se entrega si es una imagen; si no, null (y GET /v1/fotos/{id} cae al archivo
// completo).
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { afterEach, before, describe, test } from "node:test";
import { miniatura } from "../src/integraciones/drive";

const ID = "archivo_prueba_abcdef";
const realFetch = globalThis.fetch;
let pedidas: { url: string; autorizacion: string | null }[] = [];
let respuestaMiniatura: () => Response;
let enlace = "https://lh3.googleusercontent.com/abc=s220";

before(() => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "cuenta@prueba.iam.gserviceaccount.com";
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
});

function falsoFetch() {
  pedidas = [];
  globalThis.fetch = (async (entrada: string | URL, init?: RequestInit) => {
    const url = String(entrada);
    const autorizacion = new Headers(init?.headers).get("Authorization");
    pedidas.push({ url, autorizacion });
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return Response.json({ access_token: "token-de-prueba", expires_in: 3600 });
    }
    if (url.includes("/drive/v3/files/")) return Response.json({ thumbnailLink: enlace });
    return respuestaMiniatura();
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  enlace = "https://lh3.googleusercontent.com/abc=s220";
});

describe("miniatura de Drive", () => {
  test("la pide con el token y entrega la imagen", async () => {
    falsoFetch();
    respuestaMiniatura = () => new Response("PNG", { headers: { "content-type": "image/png" } });
    const m = await miniatura(ID, 300);
    assert.equal(m?.mime, "image/png");
    assert.equal(m?.datos.toString(), "PNG");
    const pedida = pedidas.find((p) => p.url.includes("googleusercontent"));
    assert.equal(pedida?.url, "https://lh3.googleusercontent.com/abc=s300");
    assert.equal(pedida?.autorizacion, "Bearer token-de-prueba");
  });

  test("una página HTML (la de inicio de sesión) no se entrega como foto: null", async () => {
    falsoFetch();
    respuestaMiniatura = () => new Response("<html>entra</html>", { headers: { "content-type": "text/html; charset=utf-8" } });
    assert.equal(await miniatura(ID), null);
  });

  test("un 403 o 404 de la miniatura: null", async () => {
    falsoFetch();
    respuestaMiniatura = () => new Response("no", { status: 403, headers: { "content-type": "image/png" } });
    assert.equal(await miniatura(ID), null);
  });

  test("un enlace que no es de Google no recibe el token: null", async () => {
    falsoFetch();
    enlace = "https://malo.example.com/abc=s220";
    respuestaMiniatura = () => new Response("PNG", { headers: { "content-type": "image/png" } });
    assert.equal(await miniatura(ID), null);
    assert.ok(!pedidas.some((p) => p.url.includes("malo.example.com")));
  });
});
