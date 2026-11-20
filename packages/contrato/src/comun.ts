// Las piezas que se repiten en todo el contrato: el error, los ids, la plata, las fechas y la
// paginación.
//
// El contrato es la lista de lo que la API recibe y entrega, escrita una sola vez. Es como el
// formulario oficial de una ventanilla: la API lo usa para revisar lo que le llega, la web para
// saber qué campos tiene cada respuesta, y /docs lo muestra tal cual.
//
// Cómo se comparte zod (decisión de la pieza B):
// - El contrato importa `z` del paquete `zod` a secas, nunca de `@hono/zod-openapi`. Así la web
//   puede importar el contrato sin arrastrar el servidor (Hono).
// - La descripción y los ejemplos que salen en /docs van con `.meta({ description, example })`,
//   que es de zod. `@hono/zod-openapi` los lee al armar /openapi.json. `.meta({ id: "Nombre" })`
//   además le da nombre al esquema en /docs (sale una sola vez y los demás lo citan). Cada `id`
//   tiene que ser único en todo el contrato: zod no avisa si se repite, y en /docs uno pisaría
//   al otro. Por eso cada área antepone su nombre cuando dude («VentaOferta», no «Oferta»).
// - zod es «peerDependency» de este paquete: lo pone quien lo usa (la API o la web). Así hay un
//   solo zod en memoria, y las descripciones guardadas con `.meta` las ve el mismo zod que arma
//   /docs. Con dos copias, /docs saldría sin descripciones.
// - No se usa `.openapi(...)` en el contrato: ese método solo existe cuando se cargó
//   `@hono/zod-openapi`, y en la web no está.
import { z } from "zod";

// Los mensajes de error de zod, en español («Se esperaba texto…» en vez de «Expected string…»).
// Vale para la API y para la web, porque las dos importan este archivo.
z.config(z.locales.es());

// ---------------------------------------------------------------------------
// Error: lo que responde la API cuando algo no se puede hacer
// ---------------------------------------------------------------------------

export const ErrorRespuesta = z
  .object({
    error: z.object({
      mensaje: z.string().meta({
        description: "Qué pasó, escrito para una persona. Se puede mostrar tal cual.",
        example: "Revisa los datos enviados.",
      }),
      campos: z
        .record(z.string(), z.string())
        .optional()
        .meta({
          description: "Si el problema está en campos puntuales: el nombre de cada campo y qué le falta.",
          example: { nombre: "Escribe un nombre." },
        }),
    }),
  })
  .meta({ id: "Error", description: "Toda respuesta con error (400, 401, 403, 404, 500) tiene esta forma." });
export type ErrorRespuesta = z.infer<typeof ErrorRespuesta>;

// ---------------------------------------------------------------------------
// Ids, plata y fechas
// ---------------------------------------------------------------------------

export const Id = z.string().min(1).meta({
  description: "Identificador de un registro (texto que la base genera; no se arma a mano).",
  example: "cm3xk2a7b0000qz8h1y2z3w4v",
});
export type Id = z.infer<typeof Id>;

// La lista tiene que calzar con el enum `Currency` de la base: la API lo comprueba al compilar
// (apps/api/src/util/al-contrato.ts).
export const Moneda = z.enum(["CLP", "UF"]).meta({
  id: "Moneda",
  description: "CLP (pesos chilenos) o UF (unidad de fomento).",
});
export type Moneda = z.infer<typeof Moneda>;

// La plata viaja como texto («1500000», «12.35») y no como número: un número de JavaScript
// redondea decimales (0,1 + 0,2 no da 0,3), y en plata eso no se acepta. Siempre con su moneda.
export const Monto = z
  .object({
    valor: z
      .string()
      .regex(/^-?\d+(\.\d+)?$/, "Escribe un monto: solo números, con punto para los decimales.")
      .meta({ description: "El monto en texto, con punto decimal y sin separador de miles.", example: "1500000" }),
    moneda: Moneda,
  })
  .meta({ id: "Monto", description: "Una cantidad de plata con su moneda al lado." });
export type Monto = z.infer<typeof Monto>;

// Una fecha «solo fecha» (un vencimiento, una visita): sin hora ni zona horaria.
export const FechaISO = z.iso.date({ error: "Escribe la fecha como AAAA-MM-DD." }).meta({
  description: "Fecha sin hora, en formato AAAA-MM-DD.",
  example: "2026-11-19",
});
export type FechaISO = z.infer<typeof FechaISO>;

// Un momento exacto (cuándo se creó o se marcó algo), en hora UTC.
export const FechaHoraISO = z.iso.datetime({ error: "Escribe fecha y hora en formato ISO (AAAA-MM-DDTHH:MM:SSZ)." }).meta({
  description: "Fecha y hora en UTC, formato ISO 8601.",
  example: "2026-11-19T14:30:00.000Z",
});
export type FechaHoraISO = z.infer<typeof FechaHoraISO>;

// ---------------------------------------------------------------------------
// Paginación: las listas largas se piden de a páginas
// ---------------------------------------------------------------------------

// Lo que se manda en la dirección (?pagina=2&porPagina=50). Vienen como texto y zod los
// convierte a número.
export const PaginacionConsulta = z.object({
  pagina: z.coerce.number().int().min(1).default(1).meta({ description: "Qué página (desde 1).", example: 1 }),
  porPagina: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .meta({ description: "Cuántos por página (hasta 100).", example: 50 }),
});
export type PaginacionConsulta = z.infer<typeof PaginacionConsulta>;

// Lo que acompaña a una página de resultados.
export const PaginacionRespuesta = z
  .object({
    pagina: z.number().int(),
    porPagina: z.number().int(),
    total: z.number().int().meta({ description: "Cuántos hay en total, en todas las páginas." }),
  })
  .meta({ id: "Paginacion" });
export type PaginacionRespuesta = z.infer<typeof PaginacionRespuesta>;

// Una página de resultados de cualquier tipo: `Pagina(Propiedad)` da { items: Propiedad[], paginacion }.
export function Pagina<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), paginacion: PaginacionRespuesta });
}
