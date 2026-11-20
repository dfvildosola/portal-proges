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
      description:
        "Toda lectura y escritura de datos de Proges pasa por aquí. Con una llave de la API solo se lee, y solo lo del cliente de esa llave.",
    },
    security: [{ bearer: [] }],
  });
  app.get("/docs", Scalar({ url: "/openapi.json", pageTitle: "API de Proges" }));

  app.notFound(noEncontrado);
  app.onError(manejarError);
  return app;
}

export type App = ReturnType<typeof crearApp>;
