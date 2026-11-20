// Contrato del área: propiedades, ficha clínica, documentos, dueños y vencimientos (pieza C).
//
// La ficha de una propiedad es como la ficha clínica de un paciente: todo lo que se sabe y todo
// lo que se ha hecho ahí. Aquí está la forma de cada respuesta y de cada cosa que se manda.
//
// Los nombres llevan un prefijo del área (Propiedad…, Ficha…, Documento…, Dueno…, Vencimiento…)
// porque este paquete junta los contratos de todas las áreas en un solo índice: dos áreas con un
// mismo nombre se pisarían. Lo común (Id, Monto, FechaISO, Pagina…) viene de "./comun".
import { z } from "zod";
import { FechaHoraISO, FechaISO, Id, Monto, PaginacionConsulta, PaginacionRespuesta } from "./comun";

// ---------------------------------------------------------------------------
// Listas de valores (calzan con los enums de la base; la API lo comprueba al compilar)
// ---------------------------------------------------------------------------

export const PropiedadTipo = z
  .enum(["DEPARTAMENTO", "CASA", "OFICINA", "LOCAL", "BODEGA", "ESTACIONAMIENTO", "TERRENO", "PARCELA", "AGRICOLA"])
  .meta({ id: "PropiedadTipo", description: "Qué tipo de propiedad es." });
export type PropiedadTipo = z.infer<typeof PropiedadTipo>;

export const PropiedadEstado = z
  .enum(["ARRENDADA", "DISPONIBLE", "EN_VENTA", "USO_PROPIO", "DESOCUPADA"])
  .meta({ id: "PropiedadEstado", description: "En qué situación está hoy la propiedad." });
export type PropiedadEstado = z.infer<typeof PropiedadEstado>;

export const PropiedadObjetivo = z
  .enum(["INVERSION", "USO_PROPIO", "VENTA"])
  .meta({ id: "PropiedadObjetivo", description: "Para qué la tiene su dueño." });
export type PropiedadObjetivo = z.infer<typeof PropiedadObjetivo>;

export const PropiedadValorFuente = z
  .enum(["TASACION", "CORREDOR", "ESTIMACION_PROPIA"])
  .meta({ id: "PropiedadValorFuente", description: "De dónde sale el valor comercial." });
export type PropiedadValorFuente = z.infer<typeof PropiedadValorFuente>;

export const FichaServicioTipo = z
  .enum(["EVALUACION", "INSPECCION", "VENTA", "ARRIENDO", "OBRA", "ADMINISTRACION"])
  .meta({ id: "FichaServicioTipo", description: "Los seis tipos de servicio que presta Proges." });
export type FichaServicioTipo = z.infer<typeof FichaServicioTipo>;

export const FichaServicioEstado = z
  .enum(["ABIERTO", "TERMINADO", "CANCELADO"])
  .meta({ id: "FichaServicioEstado", description: "Cómo va un servicio." });
export type FichaServicioEstado = z.infer<typeof FichaServicioEstado>;

export const FichaEsperandoA = z
  .enum(["CONSERVADOR", "NOTARIA", "MUNICIPALIDAD", "MAESTRO", "DUENO", "BANCO", "OTRO"])
  .meta({ id: "FichaEsperandoA", description: "A quién espera Proges para poder avanzar un servicio." });
export type FichaEsperandoA = z.infer<typeof FichaEsperandoA>;

export const FichaEsperando = z
  .object({
    a: FichaEsperandoA,
    desde: FechaISO.meta({ description: "Desde qué día se espera." }),
    dias: z.number().int().meta({ description: "Cuántos días llevan esperando (hoy menos `desde`)." }),
    detalle: z
      .string()
      .nullable()
      .optional()
      .meta({ description: "Texto libre del equipo («falta el timbre»). Solo lo ve el equipo: no sale hacia dueños ni llaves." }),
  })
  .meta({ id: "FichaEsperando", description: "A quién se espera en un servicio y desde cuándo." });
export type FichaEsperando = z.infer<typeof FichaEsperando>;

// ---------------------------------------------------------------------------
// Los datos de una propiedad
// ---------------------------------------------------------------------------

const MetrosCuadrados = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Escribe solo números, con punto para los decimales.")
  .meta({ example: "85.5" });

const PropiedadValorComercial = z
  .object({
    monto: Monto,
    fecha: FechaISO.nullable().meta({ description: "A qué día corresponde el valor (no puede ser futura)." }),
    fuente: PropiedadValorFuente.nullable(),
  })
  .meta({ id: "PropiedadValorComercial", description: "Lo que vale hoy la propiedad, con su fecha y su fuente." });

const PropiedadCompra = z
  .object({
    fecha: FechaISO.nullable().meta({ description: "Cuándo se compró (no puede ser futura)." }),
    precio: Monto.nullable(),
  })
  .meta({ id: "PropiedadCompra", description: "Cuándo y por cuánto se compró." });

const PropiedadDeuda = z
  .object({
    saldo: Monto.meta({ description: "Saldo de la deuda hipotecaria. Su moneda es la de toda la deuda." }),
    fecha: FechaISO.nullable().meta({ description: "A qué día corresponde el saldo (no puede ser futura)." }),
    banco: z.string().nullable(),
    dividendo: z.string().regex(/^\d+(\.\d+)?$/).nullable().meta({
      description: "Dividendo mensual, en la misma moneda que el saldo.",
      example: "12.35",
    }),
    termino: FechaISO.nullable().meta({ description: "Fecha del último dividendo." }),
  })
  .meta({ id: "PropiedadDeuda", description: "Deuda hipotecaria vigente. Si no hay deuda, la propiedad no trae este bloque." });

export const PropiedadDatos = z
  .object({
    id: Id,
    clienteId: Id.meta({ description: "El cliente dueño de esta propiedad." }),
    rolSII: z.string().nullable().meta({ description: "El ROL del SII. Puede faltar." }),
    tipo: PropiedadTipo,
    direccion: z.string(),
    edificio: z.string().nullable().meta({ description: "Texto que agrupa las unidades de un mismo edificio." }),
    comuna: z.string(),
    region: z.string(),
    objetivo: PropiedadObjetivo,
    estado: PropiedadEstado,
    monedaPrincipal: z.enum(["CLP", "UF"]),
    m2Terreno: z.string().nullable(),
    m2Construidos: z.string().nullable(),
    anoConstruccion: z.number().int().nullable(),
    valorComercial: PropiedadValorComercial.nullable(),
    compra: PropiedadCompra.nullable(),
    deuda: PropiedadDeuda.nullable(),
    exentaContribuciones: z.boolean().meta({ description: "Si no paga cuotas de contribuciones." }),
    tieneCarpetaDrive: z.boolean().meta({
      description: "Si la propiedad ya tiene enlazada su carpeta de Drive. Sin ella no se pueden subir PDF ni fotos.",
    }),
    creadaEl: FechaHoraISO,
    actualizadaEl: FechaHoraISO,
  })
  .meta({ id: "PropiedadDatos", description: "Los datos de la ficha de una propiedad." });
export type PropiedadDatos = z.infer<typeof PropiedadDatos>;

// Lo que se manda al crear o cambiar una propiedad. Los bloques de plata (valorComercial,
// compra, deuda) se mandan enteros: lo que no se manda dentro de un bloque queda vacío, y
// mandarlo en null lo borra.
const PropiedadCampos = z.object({
  rolSII: z.string().nullish(),
  tipo: PropiedadTipo,
  direccion: z.string().trim().min(1, "La dirección es obligatoria."),
  edificio: z.string().nullish(),
  comuna: z.string().trim().min(1, "La comuna es obligatoria."),
  region: z.string().trim().min(1, "La región es obligatoria."),
  objetivo: PropiedadObjetivo.optional(),
  estado: PropiedadEstado.optional(),
  monedaPrincipal: z.enum(["CLP", "UF"]).optional(),
  m2Terreno: MetrosCuadrados.nullish(),
  m2Construidos: MetrosCuadrados.nullish(),
  anoConstruccion: z.number().int().min(1800).max(2100).nullish(),
  valorComercial: PropiedadValorComercial.nullish(),
  compra: PropiedadCompra.nullish(),
  deuda: PropiedadDeuda.nullish(),
  exentaContribuciones: z.boolean().optional(),
});

export const PropiedadNueva = PropiedadCampos.extend({
  clienteId: Id.optional().meta({
    description: "Para qué cliente es. El equipo tiene que elegirlo; un cliente crea siempre en el suyo y esto se ignora.",
  }),
}).meta({ id: "PropiedadNueva", description: "Datos para crear una propiedad." });
export type PropiedadNueva = z.infer<typeof PropiedadNueva>;

export const PropiedadCambios = PropiedadCampos.partial()
  .extend({
    driveCarpetaId: z
      .string()
      .trim()
      .min(1, "Pega el enlace de la carpeta de Drive o su id.")
      .optional()
      .meta({
        description:
          "La carpeta de Drive de la propiedad: el enlace completo o solo el id. Solo la puede cambiar el equipo, y la cuenta de servicio de Proges tiene que poder abrirla.",
        example: "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv",
      }),
  })
  .meta({
    id: "PropiedadCambios",
    description: "Los datos de la ficha que cambian. Lo que no se manda queda como estaba.",
  });
export type PropiedadCambios = z.infer<typeof PropiedadCambios>;

// ---------------------------------------------------------------------------
// La lista de propiedades
// ---------------------------------------------------------------------------

export const PropiedadesConsulta = PaginacionConsulta.extend({
  cliente: Id.optional().meta({ description: "Solo las de este cliente (el equipo; un cliente siempre ve solo las suyas)." }),
  enCurso: z
    .enum(["true", "false"])
    .optional()
    .meta({ description: "`true`: solo las que tienen algún servicio en curso. `false`: solo las que no tienen ninguno." }),
  q: z.string().optional().meta({ description: "Busca en la dirección y en el ROL." }),
  comuna: z.string().optional().meta({ description: "Solo las de esta comuna." }),
});
export type PropiedadesConsulta = z.infer<typeof PropiedadesConsulta>;

export const PropiedadResumen = z
  .object({
    id: Id,
    clienteId: Id,
    clienteNombre: z.string(),
    direccion: z.string(),
    comuna: z.string(),
    tipo: PropiedadTipo,
    estado: PropiedadEstado,
    serviciosEnCurso: z.number().int().meta({ description: "Cuántos servicios abiertos tiene." }),
    serviciosNuevos: z.number().int().meta({
      description:
        "Cuántos de sus servicios abiertos son nuevos (por revisar, por confirmar o sin responsable): la columna «Nuevo» del tablero. Para un dueño, siempre 0.",
    }),
    esperandoMasAntiguo: FichaEsperando.extend({ servicioId: Id })
      .nullable()
      .meta({ description: "El «esperando a» que lleva más tiempo entre sus servicios abiertos, o null si no se espera a nadie." }),
    ultimoHecho: z
      .object({ fecha: FechaHoraISO, texto: z.string() })
      .nullable()
      .meta({ description: "Lo último que pasó en la propiedad (una nota, un cambio o un servicio abierto), o null si no ha pasado nada." }),
  })
  .meta({ id: "PropiedadResumen", description: "Una propiedad en la lista, con lo justo para saber dónde hay trabajo." });
export type PropiedadResumen = z.infer<typeof PropiedadResumen>;

export const PropiedadesPagina = z
  .object({ items: z.array(PropiedadResumen), paginacion: PaginacionRespuesta })
  .meta({ id: "PropiedadesPagina", description: "Una página de la lista de propiedades." });
export type PropiedadesPagina = z.infer<typeof PropiedadesPagina>;

// ---------------------------------------------------------------------------
// La ficha clínica: el resumen en una sola llamada
// ---------------------------------------------------------------------------

export const VencimientoGravedad = z
  .enum(["alta", "media", "baja"])
  .meta({ id: "VencimientoGravedad", description: "Qué tan urgente es: alta = atrasado, media = esta semana, baja = más adelante." });
export type VencimientoGravedad = z.infer<typeof VencimientoGravedad>;

export const FichaCifras = z
  .object({
    servicios: z.number().int().meta({ description: "Cuántos servicios ha hecho Proges en la propiedad desde que llegó (sin los cancelados)." }),
    llegoEl: FechaISO.meta({ description: "Cuándo entró la propiedad al portal." }),
    cobradoReparaciones: z
      .array(Monto)
      .meta({ description: "Lo cobrado al dueño en reparaciones (órdenes de venta de Odoo de las obras), un monto por moneda." }),
    costoMaestros: Monto.optional().meta({
      description: "SOLO EQUIPO. Lo aprobado a los maestros (presupuestos originales y adicionales), en pesos.",
    }),
    margen: Monto.nullable().optional().meta({
      description: "SOLO EQUIPO. Lo cobrado menos el costo de los maestros, en las obras con orden en pesos. null si no se puede calcular.",
    }),
  })
  .meta({ id: "FichaCifras", description: "Las cifras de la propiedad. El costo de maestros y el margen solo salen para el equipo." });
export type FichaCifras = z.infer<typeof FichaCifras>;

export const FichaAlerta = z
  .object({
    tipo: z.enum(["DOCUMENTO_FALTA", "DOCUMENTO_VENCIDO", "DOCUMENTO_VENCE", "CONTRIBUCION_VENCIDA", "CONTRIBUCION_VENCE"]),
    gravedad: VencimientoGravedad,
    texto: z.string().meta({ description: "Qué pasa, escrito para una persona." }),
    documento: z
      .string()
      .nullable()
      .meta({ description: "El nombre del documento (Escritura, Plano…) si la alerta es de un documento; null en las de contribuciones." }),
    fecha: FechaISO.nullable().meta({ description: "El día del vencimiento, si lo hay." }),
    referenciaId: Id.nullable().meta({ description: "El id del documento o de la cuota de contribución, si lo hay." }),
  })
  .meta({ id: "FichaAlerta", description: "Algo que la propiedad necesita: un documento que falta o vence, una contribución por vencer." });
export type FichaAlerta = z.infer<typeof FichaAlerta>;

export const FichaServicio = z
  .object({
    id: Id,
    tipo: FichaServicioTipo,
    nombre: z.string().meta({ description: "El nombre del servicio en el catálogo." }),
    estado: FichaServicioEstado,
    abiertoEl: FechaISO,
    esperando: FichaEsperando.nullable(),
    responsable: z.string().nullable().optional().meta({ description: "SOLO EQUIPO. Quién lo lleva." }),
    nuevo: z
      .boolean()
      .optional()
      .meta({ description: "SOLO EQUIPO. Si está en la columna «Nuevo» del tablero: por revisar, por confirmar o sin responsable." }),
  })
  .meta({ id: "FichaServicio", description: "Un servicio de la propiedad, con a quién se espera." });
export type FichaServicio = z.infer<typeof FichaServicio>;

export const HistorialTipo = z
  .enum(["servicio", "nota", "precio", "espera", "visita", "oferta", "documento", "presupuesto", "recepcion"])
  .meta({ id: "HistorialTipo", description: "Qué clase de hecho es cada línea del historial." });
export type HistorialTipo = z.infer<typeof HistorialTipo>;

export const HistorialCategoria = z
  .enum(["reparaciones", "papeles", "visitas", "venta-arriendo"])
  .meta({ id: "HistorialCategoria", description: "El filtro por tipo del historial." });
export type HistorialCategoria = z.infer<typeof HistorialCategoria>;

export const HistorialItem = z
  .object({
    id: z.string().meta({ description: "Único en el historial (lleva el tipo y el id del registro)." }),
    tipo: HistorialTipo,
    categoria: HistorialCategoria.nullable().meta({ description: "A qué filtro pertenece; null si solo sale sin filtro." }),
    fecha: FechaHoraISO,
    titulo: z.string().meta({ description: "La línea principal." }),
    detalle: z.string().nullable().meta({ description: "El texto de apoyo, si lo hay." }),
    servicioId: Id.nullable().meta({ description: "El servicio al que pertenece, si es de uno." }),
  })
  .meta({ id: "HistorialItem", description: "Una línea de la línea de tiempo de la propiedad." });
export type HistorialItem = z.infer<typeof HistorialItem>;

export const FichaResumen = z
  .object({
    propiedad: PropiedadDatos,
    cifras: FichaCifras,
    alertas: z.array(FichaAlerta),
    serviciosEnCurso: z.array(FichaServicio),
    ultimosHechos: z.array(HistorialItem).meta({ description: "Los 4 últimos hechos del historial." }),
  })
  .meta({ id: "FichaResumen", description: "Todo lo que muestra la cabecera de la ficha de una propiedad, en una llamada." });
export type FichaResumen = z.infer<typeof FichaResumen>;

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

export const HistorialConsulta = PaginacionConsulta.extend({
  tipo: HistorialCategoria.optional().meta({ description: "Solo este tipo de hechos. Sin esto salen todos." }),
});
export type HistorialConsulta = z.infer<typeof HistorialConsulta>;

export const HistorialPagina = z
  .object({ items: z.array(HistorialItem), paginacion: PaginacionRespuesta })
  .meta({ id: "HistorialPagina", description: "Una página de la línea de tiempo, de lo más nuevo a lo más antiguo." });
export type HistorialPagina = z.infer<typeof HistorialPagina>;

// ---------------------------------------------------------------------------
// Reparaciones
// ---------------------------------------------------------------------------

export const FichaPartida = z
  .object({
    id: Id,
    recinto: z.string().nullable().meta({ description: "El recinto de la propiedad donde se trabaja («Baño»); null si no tiene." }),
    codigo: z.string().nullable(),
    descripcion: z.string().meta({ description: "Qué se hizo (o se hace)." }),
    cantidad: z.string().nullable(),
    unidad: z.string().nullable(),
    cobrado: Monto.nullable().meta({ description: "Lo que se le cobra al dueño por esta partida." }),
    avance: z.number().int().meta({ description: "0 a 100." }),
    recepcion: z.enum(["PENDIENTE", "CONFORME", "OBSERVADA"]).meta({ description: "Si ya se recibió conforme." }),
    fotos: z.number().int().meta({ description: "Cuántas fotos tiene la recepción." }),
    observacion: z.string().nullable().optional().meta({ description: "SOLO EQUIPO. Lo que se observó al recibir." }),
  })
  .meta({ id: "FichaPartida", description: "Una línea de trabajo de una obra." });
export type FichaPartida = z.infer<typeof FichaPartida>;

export const FichaObra = z
  .object({
    servicioId: Id,
    nombre: z.string(),
    estado: FichaServicioEstado,
    abiertoEl: FechaISO,
    cerradoEl: FechaISO.nullable(),
    orden: z
      .object({ numero: z.string(), cobrado: Monto })
      .nullable()
      .meta({ description: "La orden de venta de Odoo y lo cobrado al dueño (sin impuesto). null si todavía no se enlaza." }),
    avance: z.number().meta({ description: "Avance de toda la obra, 0 a 100." }),
    partidas: z.array(FichaPartida),
    costoMaestro: Monto.optional().meta({ description: "SOLO EQUIPO. Lo aprobado a los maestros para esta obra, en pesos." }),
    margen: Monto.nullable().optional().meta({ description: "SOLO EQUIPO. Cobrado menos costo del maestro. null si la orden no está en pesos o no hay orden." }),
    dias: z
      .object({
        planificado: z.number().int().nullable(),
        real: z.number().int().nullable(),
        diferencia: z.number().int().nullable(),
      })
      .optional()
      .meta({ description: "SOLO EQUIPO. Días planificados contra días reales (desde que empezó la obra)." }),
  })
  .meta({ id: "FichaObra", description: "Una obra de la propiedad, con lo cobrado y sus partidas." });
export type FichaObra = z.infer<typeof FichaObra>;

export const FichaReparaciones = z
  .object({
    obras: z.array(FichaObra),
    totalPorRecinto: z
      .array(
        z.object({
          recinto: z.string().nullable(),
          total: z.array(Monto).meta({ description: "Lo cobrado en ese recinto, un monto por moneda." }),
          partidas: z.number().int(),
        }),
      )
      .meta({ description: "Lo cobrado al dueño en cada recinto, sumando todas las obras." }),
  })
  .meta({ id: "FichaReparaciones", description: "Las reparaciones de la propiedad: cada obra y el total por recinto." });
export type FichaReparaciones = z.infer<typeof FichaReparaciones>;

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

export const DocumentoPapel = z
  .enum([
    "ESCRITURA",
    "DOMINIO_VIGENTE",
    "HIPOTECAS_GRAVAMENES",
    "CERTIFICADO_AVALUO",
    "PLANO",
    "CIP",
    "RECEPCION_FINAL",
    "POLIZA_SEGURO",
    "PERMISO_EDIFICACION",
    "CERTIFICADO_NUMERO",
    "REGLAMENTO_COPROPIEDAD",
    "SUBDIVISION_SAG",
    "DERECHOS_AGUA",
    "CONTRATO_ARRIENDO",
  ])
  .meta({ id: "DocumentoPapel", description: "Qué papel concreto es un documento (dominio vigente, recepción final…)." });
export type DocumentoPapel = z.infer<typeof DocumentoPapel>;

export const DocumentoTipo = z
  .enum(["ESCRITURA_TITULO", "CONTRATO", "AVALUO_TASACION", "LEGAL_JUDICIAL", "MUNICIPAL", "SEGURO", "MANTENCION", "CONTRIBUCION", "OTRO"])
  .meta({ id: "DocumentoTipo", description: "El cajón donde se archiva un documento." });
export type DocumentoTipo = z.infer<typeof DocumentoTipo>;

export const DocumentoGrupo = z
  .enum(["dominio", "municipales", "planos", "informes", "otros"])
  .meta({ id: "DocumentoGrupo", description: "Cómo se agrupan los documentos en la ficha." });
export type DocumentoGrupo = z.infer<typeof DocumentoGrupo>;

export const DocumentoEstado = z
  .enum(["vigente", "vence", "vencido", "falta"])
  .meta({
    id: "DocumentoEstado",
    description:
      "vigente: al día. vence: vence en los próximos 45 días. vencido: ya venció. falta: la propiedad necesita ese papel y no está cargado.",
  });
export type DocumentoEstado = z.infer<typeof DocumentoEstado>;

export const DocumentoFicha = z
  .object({
    id: Id,
    nombre: z.string(),
    tipo: DocumentoTipo,
    papel: DocumentoPapel.nullable(),
    fechaEmision: FechaISO.nullable(),
    fechaVencimiento: FechaISO.nullable(),
    subidoEl: FechaHoraISO,
    subidoPor: z.string().nullable().optional().meta({ description: "SOLO EQUIPO. Quién lo subió." }),
  })
  .meta({ id: "DocumentoFicha", description: "Un documento cargado en la propiedad. El archivo se pide aparte, con su permiso." });
export type DocumentoFicha = z.infer<typeof DocumentoFicha>;

export const DocumentoItem = z
  .object({
    papel: DocumentoPapel.nullable(),
    papelNombre: z.string().nullable().meta({ description: "El nombre del papel, para mostrar." }),
    estado: DocumentoEstado,
    documento: DocumentoFicha.nullable().meta({ description: "null cuando el papel falta." }),
  })
  .meta({ id: "DocumentoItem", description: "Un documento (o un papel que falta) con su estado." });
export type DocumentoItem = z.infer<typeof DocumentoItem>;

export const DocumentosRespuesta = z
  .object({
    grupos: z.array(
      z.object({
        grupo: DocumentoGrupo,
        nombre: z.string(),
        items: z.array(DocumentoItem),
      }),
    ),
    faltan: z.number().int().meta({ description: "Cuántos papeles requeridos faltan." }),
    vencenPronto: z.number().int().meta({ description: "Cuántos documentos vencen en los próximos 45 días o ya vencieron." }),
  })
  .meta({ id: "DocumentosRespuesta", description: "Los documentos de la propiedad, agrupados, y los papeles que faltan." });
export type DocumentosRespuesta = z.infer<typeof DocumentosRespuesta>;

// Un archivo recibido en un formulario. El contrato no puede nombrar `File` (no hay librería de
// navegador aquí), así que se reconoce por lo que tiene: el `File` de la web y el de Node lo cumplen.
export type ArchivoSubido = { name: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> };
const esArchivo = (v: unknown): v is ArchivoSubido =>
  typeof v === "object" && v !== null && "name" in v && "size" in v && "type" in v && "arrayBuffer" in v;

// Se manda como formulario con archivo (multipart/form-data), no como JSON.
export const DocumentoSubida = z
  .object({
    // z.file() no se puede dibujar en /docs; un archivo se declara como texto «binary».
    file: z
      .custom<ArchivoSubido>(esArchivo, "Sube un archivo.")
      .meta({ type: "string", format: "binary", description: "El PDF (hasta 25 MB)." }),
    papel: z
      .union([DocumentoPapel, z.literal("OTRO")])
      .meta({ description: "Qué papel es. «OTRO» lo deja sin papel y entonces hay que mandar `tipo`." }),
    tipo: DocumentoTipo.optional().meta({ description: "El cajón. Solo con papel «OTRO»; con un papel de la lista el cajón sale solo." }),
    nombre: z.string().optional().meta({ description: "Cómo se llama. Si no se manda, el nombre del archivo." }),
    fechaEmision: FechaISO.optional().meta({ description: "No puede ser futura." }),
    fechaVencimiento: FechaISO.optional(),
  })
  .meta({ id: "DocumentoSubida", description: "Formulario para subir un documento." });
export type DocumentoSubida = z.infer<typeof DocumentoSubida>;

// ---------------------------------------------------------------------------
// Unidades, avalúos y dueños
// ---------------------------------------------------------------------------

export const PropiedadUnidad = z
  .object({
    id: Id,
    tipo: z.enum(["ESTACIONAMIENTO", "BODEGA"]),
    numero: z.string(),
    rolSII: z.string().nullable(),
    avaluoFiscal: Monto.nullable().meta({ description: "En pesos." }),
  })
  .meta({ id: "PropiedadUnidad", description: "Un estacionamiento o una bodega anexa a la propiedad." });
export type PropiedadUnidad = z.infer<typeof PropiedadUnidad>;

export const PropiedadUnidadNueva = z
  .object({
    tipo: z.enum(["ESTACIONAMIENTO", "BODEGA"]),
    numero: z.string().trim().min(1, "Escribe el número o identificador."),
    rolSII: z.string().nullish(),
    avaluoFiscal: z.string().regex(/^\d+(\.\d+)?$/, "Escribe solo números.").nullish().meta({ description: "En pesos." }),
  })
  .meta({ id: "PropiedadUnidadNueva", description: "Datos para agregar una unidad anexa." });
export type PropiedadUnidadNueva = z.infer<typeof PropiedadUnidadNueva>;

export const PropiedadAvaluo = z
  .object({ id: Id, anio: z.number().int(), valor: Monto.meta({ description: "Avalúo fiscal, en pesos." }) })
  .meta({ id: "PropiedadAvaluo", description: "El avalúo fiscal de un año." });
export type PropiedadAvaluo = z.infer<typeof PropiedadAvaluo>;

export const PropiedadAvaluoNuevo = z
  .object({
    anio: z.number().int().min(1800).max(2100),
    valor: z.string().regex(/^\d+(\.\d+)?$/, "Escribe solo números.").meta({ description: "En pesos." }),
  })
  .meta({ id: "PropiedadAvaluoNuevo", description: "Datos para anotar el avalúo de un año." });
export type PropiedadAvaluoNuevo = z.infer<typeof PropiedadAvaluoNuevo>;

export const DuenoTipo = z.enum(["PERSONA", "SOCIEDAD"]).meta({ id: "DuenoTipo", description: "Persona natural o sociedad." });
export type DuenoTipo = z.infer<typeof DuenoTipo>;

export const DuenoEntidad = z
  .object({
    id: Id,
    clienteId: Id,
    nombre: z.string(),
    rut: z.string(),
    tipo: DuenoTipo,
    grupoId: Id.nullable(),
    grupoNombre: z.string().nullable(),
  })
  .meta({ id: "DuenoEntidad", description: "Una persona o sociedad que es dueña de propiedades." });
export type DuenoEntidad = z.infer<typeof DuenoEntidad>;

export const DuenoGrupo = z
  .object({
    id: Id,
    clienteId: Id,
    nombre: z.string(),
    rut: z.string().nullable(),
    entidades: z.number().int().meta({ description: "Cuántas entidades pertenecen al grupo." }),
  })
  .meta({ id: "DuenoGrupo", description: "Un grupo económico: la familia o persona que controla varias entidades." });
export type DuenoGrupo = z.infer<typeof DuenoGrupo>;

export const DuenosRespuesta = z
  .object({ duenos: z.array(DuenoEntidad), grupos: z.array(DuenoGrupo) })
  .meta({ id: "DuenosRespuesta", description: "Las entidades dueñas y los grupos económicos." });
export type DuenosRespuesta = z.infer<typeof DuenosRespuesta>;

export const DuenosConsulta = z.object({
  cliente: Id.optional().meta({ description: "Solo los de este cliente (el equipo)." }),
});

export const DuenoNuevo = z
  .object({
    clienteId: Id.optional().meta({ description: "El equipo tiene que elegirlo; un cliente crea siempre en el suyo." }),
    nombre: z.string().trim().min(1, "El nombre es obligatorio."),
    rut: z.string().trim().min(1, "El RUT es obligatorio."),
    tipo: DuenoTipo,
    grupoId: Id.nullish().meta({ description: "El grupo económico, que tiene que ser del mismo cliente." }),
  })
  .meta({ id: "DuenoNuevo", description: "Datos para crear una entidad dueña." });
export type DuenoNuevo = z.infer<typeof DuenoNuevo>;

export const DuenoCambios = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio.").optional(),
    rut: z.string().trim().min(1, "El RUT es obligatorio.").optional(),
    tipo: DuenoTipo.optional(),
    grupoId: Id.nullable().optional().meta({ description: "El grupo al que pasa; null la saca de su grupo." }),
  })
  .meta({ id: "DuenoCambios", description: "Lo que cambia de una entidad dueña." });
export type DuenoCambios = z.infer<typeof DuenoCambios>;

export const GrupoNuevo = z
  .object({
    clienteId: Id.optional().meta({ description: "El equipo tiene que elegirlo; un cliente crea siempre en el suyo." }),
    nombre: z.string().trim().min(1, "El nombre es obligatorio."),
    rut: z.string().nullish(),
  })
  .meta({ id: "GrupoNuevo", description: "Datos para crear un grupo económico." });
export type GrupoNuevo = z.infer<typeof GrupoNuevo>;

export const PropiedadDueno = z
  .object({
    id: Id.meta({ description: "El id de esta relación propiedad-dueño (sirve para quitarla)." }),
    porcentaje: z.string().meta({ description: "Qué parte de la propiedad es de este dueño, de 0 a 100.", example: "50" }),
    dueno: DuenoEntidad,
  })
  .meta({ id: "PropiedadDueno", description: "Un dueño de la propiedad con su porcentaje." });
export type PropiedadDueno = z.infer<typeof PropiedadDueno>;

export const PropiedadDuenoNuevo = z
  .object({
    duenoId: Id.optional().meta({ description: "Una entidad que ya existe. Si no se manda, se crea una con nombre, rut y tipo." }),
    nombre: z.string().trim().optional(),
    rut: z.string().trim().optional(),
    tipo: DuenoTipo.optional(),
    porcentaje: z
      .string()
      .regex(/^\d+(\.\d+)?$/, "Escribe un número entre 0 y 100.")
      .meta({ description: "De 0 (sin incluirlo) a 100." }),
  })
  .meta({ id: "PropiedadDuenoNuevo", description: "Agrega un dueño a la propiedad: uno existente o uno nuevo." });
export type PropiedadDuenoNuevo = z.infer<typeof PropiedadDuenoNuevo>;

// ---------------------------------------------------------------------------
// Vencimientos
// ---------------------------------------------------------------------------

export const VencimientoTipo = z
  .enum([
    "ARRIENDO_ATRASADO",
    "ARRIENDOS_SEMANA",
    "COBROS_SIN_GENERAR",
    "AVISO_NO_RENOVACION",
    "CONTRATO_POR_VENCER",
    "CONTRATO_VENCIDO",
    "REAJUSTE_PENDIENTE",
    "CONTRIBUCION",
    "CUENTA",
    "PAPEL",
    "PAPEL_FALTA",
    "ARRENDADA_SIN_CONTRATO",
    "DESOCUPADA_PROLONGADA",
  ])
  .meta({ id: "VencimientoTipo", description: "Qué clase de pendiente es." });
export type VencimientoTipo = z.infer<typeof VencimientoTipo>;

export const VencimientoItem = z
  .object({
    clave: z.string().meta({ description: "Identifica el pendiente y no cambia entre consultas." }),
    tipo: VencimientoTipo,
    cuando: z
      .enum(["ATRASADO", "SEMANA", "MES", "TRIMESTRE"])
      .meta({ description: "En qué grupo de la agenda cae: atrasado, esta semana, este mes o más adelante." }),
    gravedad: VencimientoGravedad,
    fecha: FechaISO.meta({ description: "El día en que hay que actuar (o desde cuándo está atrasado)." }),
    monto: Monto.nullable().meta({ description: "En pesos, si el pendiente es de plata y se sabe cuánto." }),
    propiedad: z
      .object({ id: Id, direccion: z.string(), comuna: z.string(), clienteId: Id })
      .nullable()
      .meta({ description: "null en los pendientes de toda la cartera (por ejemplo «cobros sin generar»)." }),
    contrato: z.object({ id: Id, arrendatario: z.string() }).nullable(),
    texto: z.string().meta({ description: "Qué hay que hacer, escrito para una persona." }),
    servicioSugerido: z
      .object({ tipo: FichaServicioTipo })
      .nullable()
      .meta({ description: "El servicio que se puede pedir a Proges para resolverlo («que Proges lo haga»). null si no hay uno que corresponda." }),
  })
  .meta({ id: "VencimientoItem", description: "Un pendiente de la agenda: algo que vence, falta o está atrasado." });
export type VencimientoItem = z.infer<typeof VencimientoItem>;

export const VencimientosConsulta = z.object({
  cliente: Id.optional().meta({ description: "Solo los de este cliente (el equipo; un cliente siempre ve solo los suyos)." }),
});
export type VencimientosConsulta = z.infer<typeof VencimientosConsulta>;

export const VencimientosRespuesta = z
  .object({
    items: z.array(VencimientoItem).meta({ description: "Ordenados: la plata primero, después por fecha." }),
    resumen: z.object({
      atrasados: z.number().int(),
      estaSemana: z.number().int(),
      esteMes: z.number().int(),
      proximos: z.number().int(),
      atrasadoCLP: Monto.meta({ description: "Plata atrasada, en pesos." }),
      atrasadoSinMonto: z.number().int().meta({ description: "Cuántos atrasados de plata no tienen monto." }),
    }),
  })
  .meta({ id: "VencimientosRespuesta", description: "Lo que vence, falta o está atrasado, con su resumen." });
export type VencimientosRespuesta = z.infer<typeof VencimientosRespuesta>;
