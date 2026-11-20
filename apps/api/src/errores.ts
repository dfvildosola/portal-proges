// Cómo responde la API cuando algo no se puede hacer.
//
// Toda respuesta con error tiene la misma forma: { error: { mensaje, campos? } } (el esquema
// `ErrorRespuesta` del contrato). Así la web muestra el mensaje tal cual, sin adivinar.
//
// - Lo previsto (falta la sesión, no tiene permiso, no existe, un dato mal escrito) se lanza con
//   `throw new ErrorApi(estado, "mensaje para la persona")`, desde cualquier parte: una ruta, el
//   portero o una función de permisos. El manejador de abajo lo convierte en la respuesta.
// - Lo imprevisto (la base no responde, un error de programación) se anota completo en el
//   registro del servidor y a la persona solo se le dice que algo falló: el detalle interno
//   (consultas, rutas de archivos) nunca sale de la API.
import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";
import type { ErrorRespuesta } from "@proges/contrato";

// Los estados que usa la API. Qué significa cada uno, en corto:
// 400 el dato que mandaste está mal · 401 no sé quién eres · 403 sé quién eres y no puedes ·
// 404 no existe (o no es tuyo, que para ti es lo mismo) · 409 choca con algo que ya existe ·
// 502 un sistema de afuera (Odoo, Drive) falló · 503 algo todavía no está conectado.
export type EstadoError = 400 | 401 | 403 | 404 | 409 | 502 | 503;

export class ErrorApi extends Error {
  constructor(
    readonly estado: EstadoError,
    mensaje: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

export function cuerpoDeError(mensaje: string, campos?: Record<string, string>): ErrorRespuesta {
  return campos ? { error: { mensaje, campos } } : { error: { mensaje } };
}

// De los problemas que encontró zod a { campo: "qué le falta" }. Si un campo tiene varios
// problemas queda el primero, que es el que la persona tiene que arreglar antes.
export function camposDeZod(error: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path.map(String).join(".") || "_";
    if (!(campo in campos)) campos[campo] = problema.message;
  }
  return campos;
}

// El «gancho» que corre cuando zod rechaza lo que llegó (el cuerpo, la dirección o los
// parámetros de una ruta): responde 400 con los campos que hay que arreglar. Se le pasa a
// cada router al crearlo (ver nuevoRouter en entorno.ts).
export function ganchoValidacion(
  resultado: { success: true } | { success: false; error: z.ZodError },
  c: Context,
): Response | undefined {
  if (resultado.success) return undefined;
  const campos = camposDeZod(resultado.error);
  // Un problema sin campo (por ejemplo, el cuerpo entero no es un objeto) va como mensaje.
  const mensaje = campos._ ?? "Revisa los datos enviados.";
  delete campos._;
  return c.json(cuerpoDeError(mensaje, Object.keys(campos).length > 0 ? campos : undefined), 400);
}

export const manejarError: ErrorHandler = (err, c) => {
  if (err instanceof ErrorApi) {
    return c.json(cuerpoDeError(err.message, err.campos), err.estado);
  }
  // Hono lanza estas por su cuenta; la más común es un cuerpo que dice ser JSON y no lo es.
  if (err instanceof HTTPException) {
    const mensaje =
      err.status === 400 && /json/i.test(err.message)
        ? "El cuerpo de la petición no es un JSON válido."
        : err.message || "No se pudo atender la petición.";
    return c.json(cuerpoDeError(mensaje), err.status as ContentfulStatusCode);
  }
  console.error(`[api] Error inesperado en ${c.req.method} ${c.req.path}:`, err);
  return c.json(
    cuerpoDeError("Algo falló en el servidor de Proges. Quedó registrado; si se repite, avísanos."),
    500,
  );
};

export const noEncontrado: NotFoundHandler = (c) =>
  c.json(cuerpoDeError(`No existe ${c.req.method} ${c.req.path} en la API. La lista está en /docs.`), 404);
