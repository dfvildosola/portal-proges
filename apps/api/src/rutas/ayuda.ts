// Atajos para declarar las respuestas de una ruta en createRoute (lo que sale en /docs).
//
//   responses: {
//     200: json(Propiedad, "La ficha de la propiedad."),
//     ...errores(401, 404),
//   }
import { ErrorRespuesta } from "@proges/contrato";

// Una respuesta en JSON con su esquema del contrato y una frase que diga qué es.
export function json<T>(schema: T, description: string) {
  return { content: { "application/json": { schema } }, description };
}

const ERRORES = {
  400: json(ErrorRespuesta, "Los datos enviados no sirven: `campos` dice qué arreglar en cada uno."),
  401: json(ErrorRespuesta, "Falta identificarse, o la sesión o la llave no son válidas."),
  403: json(
    ErrorRespuesta,
    "Sabemos quién eres, pero esto no te corresponde (por ejemplo, una llave de la API intentando escribir).",
  ),
  404: json(ErrorRespuesta, "No existe, o es de otro cliente (para no revelar que existe, la respuesta es la misma)."),
  409: json(ErrorRespuesta, "Choca con algo que ya existe o con el estado actual del registro."),
  502: json(ErrorRespuesta, "Un sistema de afuera (Odoo, Drive) no respondió bien."),
  503: json(ErrorRespuesta, "Esto todavía no está conectado en la API."),
};

// Las respuestas de error que puede dar una ruta, para que aparezcan en /docs.
export function errores<K extends keyof typeof ERRORES>(...estados: K[]): Pick<typeof ERRORES, K> {
  const elegidas = {} as Pick<typeof ERRORES, K>;
  for (const estado of estados) elegidas[estado] = ERRORES[estado];
  return elegidas;
}
