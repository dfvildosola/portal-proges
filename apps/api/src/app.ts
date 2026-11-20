// La API de Proges, armada. `crearApp` recibe los sistemas de afuera (Dependencias) y devuelve
// la app lista para atender. servidor.ts la levanta de verdad; las pruebas la llaman directo,
// sin red, con versiones falsas de Clerk, Odoo y Drive.
//
// El orden importa, como en una fila de ventanillas:
// 1. Se dejan las dependencias en el contexto (c.get("dep")).
// 2. El portero (acceso/middleware.ts) averigua quién pregunta. Sin eso, nada pasa (salvo
//    /v1/salud, /openapi.json y /docs).
// 3. Las rutas de /v1 (rutas/index.ts).
// 4. La documentación: /openapi.json (la lista de endpoints en formato estándar, que se arma
//    sola desde las rutas y el contrato) y /docs (la misma lista, para leerla y probarla).
// 5. Los errores: todo error lanzado en el camino termina en errores.ts.
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { acceso } from "./acceso/middleware";
import type { Dependencias, Entorno } from "./entorno";
import { ganchoValidacion, manejarError, noEncontrado } from "./errores";
import { rutasV1 } from "./rutas";

export type { Dependencias } from "./entorno";

export function crearApp(dep: Dependencias) {
  const app = new OpenAPIHono<Entorno>({ defaultHook: ganchoValidacion });

  app.use("*", async (c, next) => {
    c.set("dep", dep);
    await next();
  });
  app.use("*", acceso());

  app.route("/v1", rutasV1);

  app.openAPIRegistry.registerComponent("securitySchemes", "bearer", {
    type: "http",
    scheme: "bearer",
    description:
      "«Authorization: Bearer <x>». La web manda el token de sesión de Clerk. Un sistema externo manda su llave de la API (empieza con prg_): es de un cliente y solo lee.",
  });
  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "API de Proges",
      version: "v1",
      description: [
        "Toda lectura y escritura de datos de Proges pasa por aquí.",
        "**Para el sistema de un cliente:** el administrador de Proges crea una llave (empieza con `prg_`) en Configuración → Llaves de la API. Se manda en cada consulta, en el encabezado `Authorization: Bearer prg_…`.",
        "Una llave **solo lee**, y solo lo de su cliente: sus propiedades y servicios, recortados igual que los ve el dueño en el portal (sin costos de maestros, sin notas internas, sin datos de otros clientes). Escribir responde 403; una llave revocada o mal escrita, 401; algo de otro cliente, 404.",
        "Los errores siempre tienen la forma `{ \"error\": { \"mensaje\", \"campos\"? } }`. Para empezar, prueba `GET /v1/yo`.",
        "Guía completa, con ejemplos en curl: `docs/api.md` del repositorio de Proges.",
      ].join("\n\n"),
    },
    security: [{ bearer: [] }],
  });
  app.get("/docs", Scalar({ url: "/openapi.json", pageTitle: "API de Proges" }));

  app.notFound(noEncontrado);
  app.onError(manejarError);
  return app;
}

export type App = ReturnType<typeof crearApp>;
