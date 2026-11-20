// Contrato del corretaje: visitas, ofertas y la respuesta del dueño, precio, anuncios con sus
// cifras semanales y el reporte de venta. Lo usan la venta y la arriendo-búsqueda (los dos
// llevan precio, visitas y ofertas).
//
// Dos miradas del mismo dato, como en toda la API (ver «La regla de oro» en apps/api/LEEME.md):
// - La del DUEÑO (y la llave de su sistema): sin el nombre ni el contacto de los interesados, sin
//   quién mostró la propiedad, sin quién es el oferente y sin las notas internas. Solo ve las
//   ofertas que Proges ya le mostró.
// - La del EQUIPO: lo mismo más todo eso. Cada esquema del equipo extiende el del dueño.
//
// Todos los nombres llevan «Venta» delante: el contrato es un solo espacio de nombres y así no
// chocan con los de otras áreas (ver comun.ts).
import { z } from "zod";
import { FechaHoraISO, FechaISO, Id, Monto } from "./comun";

// ---------------------------------------------------------------------------
// Listas cerradas (calzan con los enums de la base; la API lo comprueba al compilar)
// ---------------------------------------------------------------------------

export const VentaOfertaEstado = z
  .enum(["RECIBIDA", "ACEPTADA", "RECHAZADA", "CAIDA", "CONTRAOFERTADA"])
  .meta({
    id: "VentaOfertaEstado",
    description:
      "RECIBIDA (llegó y nadie decidió), ACEPTADA, RECHAZADA, CAIDA (el oferente se echó atrás) o CONTRAOFERTADA.",
  });
export type VentaOfertaEstado = z.infer<typeof VentaOfertaEstado>;

export const VentaRespuestaOferta = z.enum(["ACEPTA", "CONTRAOFERTA", "RECHAZA"]).meta({
  id: "VentaRespuestaOferta",
  description: "Lo que el dueño responde a una oferta: ACEPTA, CONTRAOFERTA (con un monto) o RECHAZA.",
});
export type VentaRespuestaOferta = z.infer<typeof VentaRespuestaOferta>;

export const VentaAnuncioEstado = z.enum(["ACTIVO", "PAUSADO", "BAJADO"]).meta({
  id: "VentaAnuncioEstado",
  description: "Cómo está el aviso en el portal: ACTIVO, PAUSADO o BAJADO.",
});
export type VentaAnuncioEstado = z.infer<typeof VentaAnuncioEstado>;

export const VentaPrecioOrigen = z.enum(["PROPIETARIO", "SUGERIDO_PROGES"]).meta({
  id: "VentaPrecioOrigen",
  description: "Quién fijó el precio: el propietario, o lo sugirió Proges (por una evaluación).",
});
export type VentaPrecioOrigen = z.infer<typeof VentaPrecioOrigen>;

// ---------------------------------------------------------------------------
// Piezas del reporte
// ---------------------------------------------------------------------------

export const VentaCifra = z
  .object({
    semana: FechaISO.meta({ description: "El lunes de esa semana." }),
    vistas: z.number().int().nullable().meta({ description: "Vistas del aviso esa semana (null: no se anotó)." }),
    consultas: z.number().int().nullable().meta({ description: "Consultas por el aviso esa semana (null: no se anotó)." }),
  })
  .meta({ id: "VentaCifra", description: "Vistas y consultas de un anuncio en una semana, copiadas a mano desde Nexxos." });
export type VentaCifra = z.infer<typeof VentaCifra>;

export const VentaAnuncio = z
  .object({
    id: Id,
    portal: z.string().meta({ description: "Dónde está publicado: «Nexxos», «Portal Inmobiliario»…", example: "Nexxos" }),
    url: z.string().nullable().meta({ description: "Enlace del aviso, si se conoce." }),
    estado: VentaAnuncioEstado,
    desde: FechaISO.meta({ description: "Desde cuándo está publicado." }),
  })
  .meta({ id: "VentaAnuncio", description: "Un aviso publicado de la propiedad en un portal inmobiliario." });
export type VentaAnuncio = z.infer<typeof VentaAnuncio>;

export const VentaAnuncioConCifras = VentaAnuncio.extend({
  vistas: z.number().int().meta({ description: "Suma de las vistas anotadas, de todas las semanas." }),
  consultas: z.number().int().meta({ description: "Suma de las consultas anotadas, de todas las semanas." }),
  semanas: z.array(VentaCifra).meta({ description: "Las cifras semana a semana, de la más antigua a la más nueva." }),
}).meta({ id: "VentaAnuncioConCifras", description: "Un anuncio con sus cifras semanales y sus totales." });
export type VentaAnuncioConCifras = z.infer<typeof VentaAnuncioConCifras>;

export const VentaSemana = z
  .object({
    semana: FechaISO.meta({ description: "El lunes de esa semana." }),
    vistas: z.number().int().meta({ description: "Vistas de todos los anuncios esa semana." }),
    consultas: z.number().int().meta({ description: "Consultas de todos los anuncios esa semana." }),
    visitas: z.number().int().meta({ description: "Visitas a la propiedad esa semana." }),
  })
  .meta({ id: "VentaSemana", description: "Lo que pasó en una semana: vistas y consultas de los anuncios, y visitas." });
export type VentaSemana = z.infer<typeof VentaSemana>;

export const VentaCambioPrecio = z
  .object({
    fecha: FechaISO.meta({ description: "El día (en Chile) en que cambió el precio." }),
    anterior: Monto.nullable().meta({ description: "El precio de antes (null en el primero)." }),
    nuevo: Monto,
    origen: VentaPrecioOrigen.nullable(),
  })
  .meta({ id: "VentaCambioPrecio", description: "Un cambio del precio publicado." });
export type VentaCambioPrecio = z.infer<typeof VentaCambioPrecio>;

export const VentaCambioPrecioEquipo = VentaCambioPrecio.extend({
  motivo: z.string().nullable().meta({ description: "Por qué cambió (se pide desde el segundo precio)." }),
  autor: z.string().nullable().meta({ description: "Nombre de quien lo anotó." }),
}).meta({ id: "VentaCambioPrecioEquipo", description: "Un cambio de precio, con el motivo y quién lo anotó (solo el equipo)." });
export type VentaCambioPrecioEquipo = z.infer<typeof VentaCambioPrecioEquipo>;

// ---------------------------------------------------------------------------
// Visitas
// ---------------------------------------------------------------------------

export const VentaVisita = z
  .object({
    id: Id,
    fecha: FechaISO,
    evaluacion: z.number().int().min(1).max(5).nullable().meta({ description: "Interés del visitante, de 1 a 5." }),
    comentario: z.string().nullable(),
  })
  .meta({ id: "VentaVisita", description: "Una visita a la propiedad, como la ve el dueño (sin nombres ni contacto)." });
export type VentaVisita = z.infer<typeof VentaVisita>;

export const VentaVisitaEquipo = VentaVisita.extend({
  realizadaPor: z
    .object({ id: Id, nombre: z.string() })
    .nullable()
    .meta({ description: "Quién mostró la propiedad." }),
  interesadoNombre: z.string().nullable(),
  interesadoContacto: z.string().nullable(),
}).meta({ id: "VentaVisitaEquipo", description: "Una visita con el nombre y el contacto del interesado (solo el equipo)." });
export type VentaVisitaEquipo = z.infer<typeof VentaVisitaEquipo>;

export const VentaVisitaCrear = z
  .object({
    fecha: FechaISO.meta({ description: "El día de la visita (no puede ser futuro)." }),
    realizadaPorId: Id.optional().meta({
      description: "Quién mostró la propiedad (una persona del equipo). Si no se manda, es quien anota.",
    }),
    interesadoNombre: z.string().trim().max(200).optional(),
    interesadoContacto: z.string().trim().max(200).optional(),
    evaluacion: z.number().int().min(1).max(5).optional().meta({ description: "Interés del visitante, de 1 a 5." }),
    comentario: z.string().trim().max(2000).optional(),
  })
  .meta({ id: "VentaVisitaCrear", description: "Los datos para anotar una visita." });
export type VentaVisitaCrear = z.infer<typeof VentaVisitaCrear>;

export const VentaVisitaCambiar = z
  .object({
    fecha: FechaISO,
    realizadaPorId: Id,
    interesadoNombre: z.string().trim().max(200).nullable(),
    interesadoContacto: z.string().trim().max(200).nullable(),
    evaluacion: z.number().int().min(1).max(5).nullable(),
    comentario: z.string().trim().max(2000).nullable(),
  })
  .partial()
  .meta({ id: "VentaVisitaCambiar", description: "Lo que se corrige de una visita: solo se manda lo que cambia (null borra el dato)." });
export type VentaVisitaCambiar = z.infer<typeof VentaVisitaCambiar>;

// ---------------------------------------------------------------------------
// Ofertas
// ---------------------------------------------------------------------------

export const VentaRespuestaDelDueno = z
  .object({
    respuesta: VentaRespuestaOferta,
    contraoferta: Monto.nullable().meta({ description: "El monto de la contraoferta (solo si respondió CONTRAOFERTA)." }),
    respondidaEl: FechaHoraISO,
  })
  .meta({ id: "VentaRespuestaDelDueno", description: "Lo que el dueño respondió a una oferta." });
export type VentaRespuestaDelDueno = z.infer<typeof VentaRespuestaDelDueno>;

export const VentaOferta = z
  .object({
    id: Id,
    fecha: FechaISO,
    monto: Monto,
    estado: VentaOfertaEstado,
    recomendacion: z.string().nullable().meta({ description: "Lo que Proges recomienda hacer con esta oferta." }),
    mostradaAlDuenoEl: FechaHoraISO.nullable().meta({ description: "Cuándo se le mostró al dueño (null: todavía no la ve)." }),
    respuestaDelDueno: VentaRespuestaDelDueno.nullable().meta({ description: "Null mientras el dueño no responda." }),
  })
  .meta({ id: "VentaOferta", description: "Una oferta, como la ve el dueño (sin quién ofertó ni la nota interna)." });
export type VentaOferta = z.infer<typeof VentaOferta>;

const PersonaDelEquipo = z.object({ id: Id, nombre: z.string() });

export const VentaOfertaEquipo = VentaOferta.extend({
  oferente: z.string().meta({ description: "Quién hizo la oferta." }),
  nota: z.string().nullable().meta({ description: "Condiciones o nota interna." }),
  mostradaPor: PersonaDelEquipo.nullable(),
  respondidaPor: PersonaDelEquipo.nullable().meta({ description: "La persona del cliente que respondió." }),
}).meta({ id: "VentaOfertaEquipo", description: "Una oferta con el oferente y la nota (solo el equipo)." });
export type VentaOfertaEquipo = z.infer<typeof VentaOfertaEquipo>;

export const VentaOfertaCrear = z
  .object({
    fecha: FechaISO.optional().meta({ description: "El día que llegó la oferta (no futuro). Si falta, hoy." }),
    monto: Monto,
    oferente: z.string().trim().min(1, "Escribe quién ofertó.").max(200),
    nota: z.string().trim().max(2000).optional().meta({ description: "Condiciones o nota interna." }),
  })
  .meta({ id: "VentaOfertaCrear", description: "Los datos para registrar una oferta recibida." });
export type VentaOfertaCrear = z.infer<typeof VentaOfertaCrear>;

export const VentaOfertaCambiar = z
  .object({
    fecha: FechaISO,
    monto: Monto,
    oferente: z.string().trim().min(1, "Escribe quién ofertó.").max(200),
    nota: z.string().trim().max(2000).nullable(),
    estado: VentaOfertaEstado,
    recomendacion: z.string().trim().max(4000).nullable(),
  })
  .partial()
  .meta({ id: "VentaOfertaCambiar", description: "Lo que se corrige de una oferta: solo se manda lo que cambia." });
export type VentaOfertaCambiar = z.infer<typeof VentaOfertaCambiar>;

export const VentaOfertaMostrar = z
  .object({
    recomendacion: z.string().trim().min(1).max(4000).optional().meta({
      description: "Lo que Proges recomienda al dueño. Si no se manda, se usa la que la oferta ya tenga.",
    }),
  })
  .meta({ id: "VentaOfertaMostrar", description: "Mostrar la oferta al dueño, con la recomendación de Proges." });
export type VentaOfertaMostrar = z.infer<typeof VentaOfertaMostrar>;

export const VentaOfertaResponder = z
  .object({
    respuesta: VentaRespuestaOferta,
    monto: Monto.optional().meta({
      description: "Obligatorio si la respuesta es CONTRAOFERTA, y en la misma moneda de la oferta. Se ignora en las otras.",
    }),
  })
  .meta({ id: "VentaOfertaResponder", description: "La respuesta del dueño a una oferta." });
export type VentaOfertaResponder = z.infer<typeof VentaOfertaResponder>;

// ---------------------------------------------------------------------------
// Precio
// ---------------------------------------------------------------------------

export const VentaPrecioCambiar = z
  .object({
    monto: Monto,
    origen: VentaPrecioOrigen,
    motivo: z.string().trim().max(1000).optional().meta({
      description: "Por qué cambia el precio. Obligatorio desde el segundo precio: es lo que se le explica al propietario.",
    }),
  })
  .meta({ id: "VentaPrecioCambiar", description: "Fijar o cambiar el precio publicado." });
export type VentaPrecioCambiar = z.infer<typeof VentaPrecioCambiar>;

export const VentaPrecioRespuesta = z
  .object({
    precio: Monto,
    cambio: VentaCambioPrecioEquipo,
  })
  .meta({ id: "VentaPrecioRespuesta", description: "El precio vigente y el cambio que quedó anotado." });
export type VentaPrecioRespuesta = z.infer<typeof VentaPrecioRespuesta>;

// ---------------------------------------------------------------------------
// Anuncios y cifras
// ---------------------------------------------------------------------------

export const VentaAnuncioCrear = z
  .object({
    portal: z.string().trim().min(1, "Escribe el portal.").max(100),
    url: z.url({ error: "Escribe un enlace válido (https://…)." }).max(2000).optional(),
    estado: VentaAnuncioEstado.optional().meta({ description: "Si falta, ACTIVO." }),
    desde: FechaISO.meta({ description: "Desde cuándo está publicado." }),
  })
  .meta({ id: "VentaAnuncioCrear", description: "Los datos para anotar un aviso publicado." });
export type VentaAnuncioCrear = z.infer<typeof VentaAnuncioCrear>;

export const VentaAnuncioCambiar = z
  .object({
    portal: z.string().trim().min(1, "Escribe el portal.").max(100),
    url: z.url({ error: "Escribe un enlace válido (https://…)." }).max(2000).nullable(),
    estado: VentaAnuncioEstado,
    desde: FechaISO,
  })
  .partial()
  .meta({ id: "VentaAnuncioCambiar", description: "Lo que se corrige de un anuncio: solo se manda lo que cambia." });
export type VentaAnuncioCambiar = z.infer<typeof VentaAnuncioCambiar>;

export const VentaCifraAnotar = z
  .object({
    vistas: z.number().int().min(0).nullable().optional(),
    consultas: z.number().int().min(0).nullable().optional(),
  })
  .meta({
    id: "VentaCifraAnotar",
    description:
      "Las cifras de la semana, tal como las muestra Nexxos. Si la semana ya estaba anotada, se corrige esa misma fila; lo que no se manda queda como estaba.",
  });
export type VentaCifraAnotar = z.infer<typeof VentaCifraAnotar>;

// ---------------------------------------------------------------------------
// El reporte
// ---------------------------------------------------------------------------

const TipoComercial = z.enum(["VENTA", "ARRIENDO"]);
const EstadoServicio = z.enum(["ABIERTO", "TERMINADO", "CANCELADO"]);

export const VentaReporte = z
  .object({
    servicioId: Id,
    tipo: TipoComercial,
    estado: EstadoServicio,
    precio: Monto.nullable().meta({ description: "El precio publicado hoy (null: todavía no hay)." }),
    historiaPrecio: z.array(VentaCambioPrecio).meta({ description: "Cada cambio del precio, del más antiguo al más nuevo." }),
    diasPublicada: z.number().int().nullable().meta({
      description: "Días desde que se publicó el primer anuncio (hasta hoy, o hasta que se cerró el servicio). Null si no hay anuncios.",
    }),
    totales: z.object({
      visitas: z.number().int(),
      vistas: z.number().int().meta({ description: "Suma de las vistas de todos los anuncios." }),
      consultas: z.number().int().meta({ description: "Suma de las consultas semanales de todos los anuncios." }),
      ofertas: z.number().int().meta({ description: "Ofertas que el dueño puede ver (las que Proges ya le mostró)." }),
    }),
    mejorOferta: VentaOferta.nullable().meta({
      description:
        "La oferta vigente de mayor monto, en la moneda del precio (no se mezclan CLP y UF: no hay cómo convertirlas aquí). Null si no hay ninguna.",
    }),
    esperaRespuestaDueno: z.boolean().meta({
      description: "true si hay una oferta mostrada al dueño que todavía no responde, o si Proges marcó que espera al dueño.",
    }),
    recomendacion: z
      .object({ texto: z.string(), fecha: FechaISO.nullable() })
      .nullable()
      .meta({ description: "La recomendación general de Proges sobre el servicio." }),
    anuncios: z.array(VentaAnuncioConCifras),
    porSemana: z.array(VentaSemana).meta({ description: "Vistas, consultas y visitas semana a semana, de la más antigua a la más nueva." }),
    visitas: z.array(VentaVisita).meta({ description: "De la más reciente a la más antigua." }),
    ofertas: z.array(VentaOferta).meta({ description: "De la más reciente a la más antigua." }),
  })
  .meta({ id: "VentaReporte", description: "El reporte de venta para el dueño (y para la llave de su sistema), sin datos internos." });
export type VentaReporte = z.infer<typeof VentaReporte>;

export const VentaReporteEquipo = VentaReporte.extend({
  historiaPrecio: z.array(VentaCambioPrecioEquipo),
  mejorOferta: VentaOfertaEquipo.nullable(),
  visitas: z.array(VentaVisitaEquipo),
  ofertas: z.array(VentaOfertaEquipo).meta({ description: "Todas, también las que todavía no se le muestran al dueño." }),
}).meta({ id: "VentaReporteEquipo", description: "El reporte de venta para el equipo: con nombres de interesados, oferentes y notas." });
export type VentaReporteEquipo = z.infer<typeof VentaReporteEquipo>;
