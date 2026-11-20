// GET /v1/salud: responde si la API está andando. No pide sesión: Railway la llama para saber si
// la nueva versión ya puede recibir consultas antes de soltar la anterior.
import { createRoute } from "@hono/zod-openapi";
import { Salud } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { json } from "./ayuda";

export const salud = nuevoRouter();

salud.openapi(
  createRoute({
    method: "get",
    path: "/salud",
    tags: ["Acceso"],
    summary: "¿La API está andando?",
    security: [], // pública: no pide sesión ni llave
    responses: { 200: json(Salud, "La API responde.") },
  }),
  (c) => c.json({ ok: true as const, version: "v1" as const }, 200),
);
