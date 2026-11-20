// Contrato del área de trabajo del día: servicios, tareas, bitácora (notas y fotos), pedidos,
// inicio del equipo, novedades del dueño y catálogo. Es de la pieza D.
//
// Lo que sale hacia un dueño o una llave tiene su propio esquema, más corto que el del equipo:
// sin responsable, sin tareas y sin notas internas (ver «La regla de oro» en apps/api/LEEME.md).
// Por eso hay pares como NotaDueno / NotaEquipo y ServicioDueno / ServicioEquipo.
//
// Las listas de valores (tipos de servicio, a quién se espera…) tienen que calzar con los enums
// de la base: la API lo comprueba al compilar (apps/api/src/dominio/trabajo/recorte.ts).
import { z } from "zod";
import { FechaHoraISO, FechaISO, Id, PaginacionConsulta, PaginacionRespuesta } from "./comun";

// ---------------------------------------------------------------------------
// Listas de valores
// ---------------------------------------------------------------------------

export const ServicioTipo = z
  .enum(["EVALUACION", "INSPECCION", "VENTA", "ARRIENDO", "OBRA", "ADMINISTRACION"])
  .meta({ id: "ServicioTipo", description: "El tipo de servicio que Proges presta en una propiedad." });
export type ServicioTipo = z.infer<typeof ServicioTipo>;

export const ServicioEstado = z.enum(["ABIERTO", "TERMINADO", "CANCELADO"]).meta({
  id: "ServicioEstado",
  description: "ABIERTO: Proges está trabajando. TERMINADO: se entregó. CANCELADO: se dejó sin terminar.",
});
export type ServicioEstado = z.infer<typeof ServicioEstado>;

export const EsperandoA = z
  .enum(["CONSERVADOR", "NOTARIA", "MUNICIPALIDAD", "MAESTRO", "DUENO", "BANCO", "OTRO"])
  .meta({
    id: "EsperandoA",
    description: "A quién espera Proges para avanzar un servicio. Sin valor significa «nos toca a nosotros».",
  });
export type EsperandoA = z.infer<typeof EsperandoA>;

export const SolicitudEstado = z.enum(["NUEVA", "ACEPTADA", "RECHAZADA"]).meta({
  id: "SolicitudEstado",
  description: "NUEVA: el equipo todavía no la revisa. ACEPTADA: se abrió el servicio. RECHAZADA: se dijo que no, con motivo.",
});
export type SolicitudEstado = z.infer<typeof SolicitudEstado>;

// Los tipos de propiedad que se pueden escribir al pedir un servicio para una propiedad nueva.
export const PedidoTipoPropiedad = z
  .enum(["DEPARTAMENTO", "CASA", "OFICINA", "LOCAL", "BODEGA", "ESTACIONAMIENTO", "TERRENO", "PARCELA", "AGRICOLA"])
  .meta({ id: "PedidoTipoPropiedad", description: "Qué tipo de propiedad es." });
export type PedidoTipoPropiedad = z.infer<typeof PedidoTipoPropiedad>;

// ---------------------------------------------------------------------------
// Piezas que se repiten
// ---------------------------------------------------------------------------

export const TrabajoPropiedad = z
  .object({ id: Id, direccion: z.string(), comuna: z.string() })
  .meta({ id: "TrabajoPropiedad", description: "La propiedad donde se hace un servicio, en corto." });
export type TrabajoPropiedad = z.infer<typeof TrabajoPropiedad>;

export const TrabajoPersona = z
  .object({ id: Id, nombre: z.string() })
  .meta({ id: "TrabajoPersona", description: "Una persona del equipo de Proges." });
export type TrabajoPersona = z.infer<typeof TrabajoPersona>;

export const TrabajoCliente = z
  .object({ id: Id, nombre: z.string() })
  .meta({ id: "TrabajoCliente", description: "El cliente dueño de la propiedad." });
export type TrabajoCliente = z.infer<typeof TrabajoCliente>;

export const Esperando = z
  .object({
    a: EsperandoA,
    detalle: z.string().nullable().meta({ description: "Texto libre; obligatorio cuando se espera a «OTRO»." }),
    desde: FechaISO.meta({ description: "El día desde el que se espera." }),
    dias: z.number().int().meta({ description: "Cuántos días calendario lleva la espera (en hora de Chile)." }),
  })
  .meta({ id: "Esperando", description: "A quién espera Proges en este servicio y desde cuándo." });
export type Esperando = z.infer<typeof Esperando>;

export const FotoDeNota = z
  .object({ id: Id.meta({ description: "Se pide en GET /v1/fotos/{id} (con ?miniatura=1 para la versión chica)." }), nombre: z.string() })
  .meta({ id: "FotoDeNota", description: "Una foto de la bitácora. La API la entrega revisando el permiso: nunca hay enlace público." });
export type FotoDeNota = z.infer<typeof FotoDeNota>;

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export const CatalogoServicio = z
  .object({
    id: Id,
    codigo: z.string().meta({ example: "NV-100" }),
    familia: z.string().meta({ description: "El prefijo del código (NV, RR, ADMP…).", example: "NV" }),
    nombre: z.string(),
    unidad: z.string().nullable(),
    tipos: z.array(ServicioTipo).meta({ description: "En qué tipos de servicio se puede ofrecer." }),
  })
  .meta({ id: "CatalogoServicio", description: "Un servicio del catálogo de Proges." });
export type CatalogoServicio = z.infer<typeof CatalogoServicio>;

export const Catalogo = z
  .object({ items: z.array(CatalogoServicio) })
  .meta({ id: "Catalogo", description: "Los servicios activos del catálogo, por código." });
export type Catalogo = z.infer<typeof Catalogo>;

// ---------------------------------------------------------------------------
// Notas (la bitácora)
// ---------------------------------------------------------------------------

export const NotaDueno = z
  .object({
    id: Id,
    texto: z.string(),
    creadaEl: FechaHoraISO,
    fotos: z.array(FotoDeNota),
  })
  .meta({ id: "NotaDueno", description: "Una nota que el equipo marcó para el dueño. Sin autor ni tarea." });
export type NotaDueno = z.infer<typeof NotaDueno>;

export const NotaEquipo = NotaDueno.extend({
  paraDueno: z.boolean().meta({ description: "Si el dueño la ve." }),
  autor: TrabajoPersona,
  tareaId: Id.nullable().meta({ description: "La tarea a la que se refiere, si se anotó desde una." }),
}).meta({ id: "NotaEquipo", description: "Una nota de la bitácora como la ve el equipo (todas, con su autor)." });
export type NotaEquipo = z.infer<typeof NotaEquipo>;

// El formulario para anotar: multipart (texto y fotos van en el mismo envío). Una sola foto llega
// como archivo y varias como lista; las fotos ya vienen achicadas desde el teléfono.
// Un archivo subido. El `type` en meta le dice a /docs cómo dibujarlo (zod no sabe describir un
// archivo en OpenAPI por su cuenta).
const Archivo = z.file().meta({ type: "string", format: "binary" });

export const NotaNueva = z
  .object({
    texto: z.string().max(4000, "Máximo 4000 caracteres").optional(),
    paraDueno: z.enum(["true", "false", "1", "0"]).optional().meta({ description: "«true» o «1»: la ve el dueño." }),
    tareaId: Id.optional().meta({ description: "Una tarea abierta del mismo servicio, si la nota se refiere a ella." }),
    fotos: z
      .union([Archivo, z.array(Archivo)])
      .optional()
      .meta({ description: "Hasta 6 fotos JPG, PNG o WebP, de hasta 4 MB cada una." }),
  })
  .meta({ id: "NotaNueva", description: "Una nota nueva con sus fotos (multipart/form-data)." });
export type NotaNueva = z.infer<typeof NotaNueva>;

export const NotaCreada = z
  .object({
    nota: NotaEquipo,
    aviso: z.string().nullable().meta({
      description:
        "Si las fotos no subieron del todo, aquí dice por qué. La nota ya quedó guardada: no es un error.",
    }),
  })
  .meta({ id: "NotaCreada" });
export type NotaCreada = z.infer<typeof NotaCreada>;

export const NotaCambiar = z
  .object({ paraDueno: z.boolean() })
  .meta({ id: "NotaCambiar", description: "Cambia si el dueño ve la nota (y sus fotos)." });
export type NotaCambiar = z.infer<typeof NotaCambiar>;

export const NotasDeServicio = z.object({ items: z.array(NotaEquipo) }).meta({ id: "NotasDeServicio" });
export const NotasParaDueno = z.object({ items: z.array(NotaDueno) }).meta({ id: "NotasParaDueno" });

// ---------------------------------------------------------------------------
// Tareas
// ---------------------------------------------------------------------------

export const Tarea = z
  .object({
    id: Id,
    que: z.string(),
    responsable: TrabajoPersona.nullable(),
    vence: FechaISO.nullable(),
    hecha: z.boolean(),
    hechaEl: FechaHoraISO.nullable(),
    hechaPor: TrabajoPersona.nullable(),
    esRevision: z.boolean().meta({ description: "Es la tarea «Revisar y repartir» que abre un pedido del cliente." }),
    creadaEl: FechaHoraISO,
  })
  .meta({ id: "Tarea", description: "Lo que alguien tiene que hacer en un servicio: qué, quién y para cuándo." });
export type Tarea = z.infer<typeof Tarea>;

export const TareaConServicio = Tarea.extend({
  servicio: z.object({ id: Id, tipo: ServicioTipo, nombre: z.string() }),
  propiedad: TrabajoPropiedad,
  cliente: TrabajoCliente,
}).meta({ id: "TareaConServicio", description: "Una tarea con el servicio, la propiedad y el cliente donde vive." });
export type TareaConServicio = z.infer<typeof TareaConServicio>;

export const TareaNueva = z
  .object({
    que: z.string().trim().min(1, "Escribe qué hay que hacer").max(300, "Máximo 300 caracteres"),
    responsableId: Id.nullable().optional().meta({ description: "Una persona del equipo; sin valor queda sin responsable." }),
    vence: FechaISO.nullable().optional(),
  })
  .meta({ id: "TareaNueva" });
export type TareaNueva = z.infer<typeof TareaNueva>;

export const TareaCambiar = z
  .object({
    que: z.string().trim().min(1, "Escribe qué hay que hacer").max(300, "Máximo 300 caracteres").optional(),
    responsableId: Id.nullable().optional(),
    vence: FechaISO.nullable().optional(),
    hecha: z.boolean().optional().meta({ description: "true la marca hecha; false la deshace." }),
  })
  .refine((t) => Object.values(t).some((v) => v !== undefined), { message: "Manda al menos un cambio." })
  .meta({
    id: "TareaCambiar",
    description: "Lo que cambia de una tarea. Una tarea hecha no se edita: primero se deshace (hecha: false).",
  });
export type TareaCambiar = z.infer<typeof TareaCambiar>;

export const TareasConsulta = z.object({
  vista: z.enum(["hoy", "equipo", "semana"]).default("hoy").meta({
    description:
      "hoy: las mías (atrasadas, hoy y mañana). equipo: la carga de cada persona. semana: las tareas de cada persona y las sin responsable, para Repartir.",
  }),
  cliente: Id.optional().meta({ description: "Solo las de este cliente (en «equipo» y «semana»)." }),
});
export type TareasConsulta = z.infer<typeof TareasConsulta>;

export const TareasHoy = z
  .object({
    vista: z.literal("hoy"),
    fecha: FechaISO.meta({ description: "El «hoy» en Chile con el que se calculó." }),
    atrasadas: z.array(TareaConServicio),
    hoy: z.array(TareaConServicio),
    manana: z.array(TareaConServicio),
    masAdelante: z.number().int().meta({ description: "Cuántas más tienes abiertas, para después o sin fecha." }),
  })
  .meta({ id: "TareasHoy", description: "Mis tareas abiertas de hoy." });

const CargaDePersona = z.object({
  persona: TrabajoPersona,
  abiertas: z.number().int(),
  atrasadas: z.number().int(),
  estaSemana: z.number().int().meta({ description: "Vencen de hoy a 7 días." }),
});
export type CargaDePersona = z.infer<typeof CargaDePersona>;

export const TareasEquipo = z
  .object({ vista: z.literal("equipo"), personas: z.array(CargaDePersona) })
  .meta({ id: "TareasEquipo", description: "La carga de cada persona del equipo." });

export const TareasSemana = z
  .object({
    vista: z.literal("semana"),
    personas: z.array(
      z.object({
        persona: TrabajoPersona,
        atrasadas: z.array(TareaConServicio),
        estaSemana: z.array(TareaConServicio),
      }),
    ),
    sinResponsable: z.array(TareaConServicio),
  })
  .meta({ id: "TareasSemana", description: "Las tareas de cada persona y las que no tiene nadie, para Repartir." });

export const TareasRespuesta = z.discriminatedUnion("vista", [TareasHoy, TareasEquipo, TareasSemana]);
export type TareasRespuesta = z.infer<typeof TareasRespuesta>;

// ---------------------------------------------------------------------------
// Servicios: lo que sale en listas
// ---------------------------------------------------------------------------

// Lo que ve el dueño o una llave de una fila de la lista: sin responsable ni cliente.
export const ServicioFila = z
  .object({
    id: Id,
    tipo: ServicioTipo,
    nombre: z.string().meta({ description: "El nombre del servicio en el catálogo." }),
    estado: ServicioEstado,
    propiedad: TrabajoPropiedad,
    abiertoEl: FechaISO,
    cerradoEl: FechaISO.nullable(),
    esperando: Esperando.nullable(),
  })
  .meta({ id: "ServicioFila", description: "Un servicio en una lista, como lo ve el dueño." });
export type ServicioFila = z.infer<typeof ServicioFila>;

export const ServicioFilaEquipo = ServicioFila.extend({
  cliente: TrabajoCliente,
  responsable: TrabajoPersona.nullable(),
  porRevisar: z.boolean().meta({ description: "Viene de un pedido y la jefatura todavía no lo reparte." }),
  porConfirmar: z.boolean().meta({ description: "Se dedujo de la carga inicial y falta que el equipo lo confirme." }),
}).meta({ id: "ServicioFilaEquipo", description: "Un servicio en una lista, como lo ve el equipo." });
export type ServicioFilaEquipo = z.infer<typeof ServicioFilaEquipo>;

export const ServicioTableroItem = z
  .object({
    id: Id,
    tipo: ServicioTipo,
    nombre: z.string(),
    propiedad: TrabajoPropiedad,
    cliente: TrabajoCliente,
    responsable: TrabajoPersona.nullable(),
    esperando: Esperando.nullable(),
    tareasPendientes: z.number().int(),
    abiertoEl: FechaISO,
  })
  .meta({ id: "ServicioTableroItem", description: "Un servicio abierto en el tablero." });
export type ServicioTableroItem = z.infer<typeof ServicioTableroItem>;

export const ServiciosConsulta = z.object({
  vista: z.enum(["tablero", "lista"]).default("tablero").meta({
    description:
      "tablero: los servicios abiertos según quién tiene la pelota (solo el equipo). lista: todos los servicios que puedes leer, de a páginas.",
  }),
  cliente: Id.optional().meta({ description: "Solo los de este cliente (solo el equipo; para un dueño se ignora)." }),
  tipo: ServicioTipo.optional(),
  responsable: z.union([Id, z.literal("sin")]).optional().meta({
    description: "Solo el tablero: el id de una persona, o «sin» para los que no lleva nadie.",
  }),
  propiedadId: Id.optional().meta({ description: "Solo la lista: los servicios de esta propiedad." }),
  estado: ServicioEstado.optional().meta({ description: "Solo la lista." }),
  ...PaginacionConsulta.shape,
});
export type ServiciosConsulta = z.infer<typeof ServiciosConsulta>;

export const ServiciosTablero = z
  .object({
    vista: z.literal("tablero"),
    nuevo: z.array(ServicioTableroItem).meta({ description: "Por revisar: vienen de un pedido y nadie los reparte." }),
    nosToca: z.array(ServicioTableroItem).meta({ description: "Sin «esperando a» y con tareas pendientes: nos toca." }),
    esperando: z.array(ServicioTableroItem).meta({ description: "Con «esperando a»; los que llevan más días, primero." }),
    porEntregar: z
      .array(ServicioTableroItem)
      .meta({ description: "Abiertos, sin tareas pendientes y sin espera: falta entregarlos o darlos por terminados." }),
  })
  .meta({ id: "ServiciosTablero", description: "Los servicios abiertos agrupados por quién tiene la pelota." });
export type ServiciosTablero = z.infer<typeof ServiciosTablero>;

export const ServiciosLista = z
  .object({
    vista: z.literal("lista"),
    items: z.array(z.union([ServicioFilaEquipo, ServicioFila])),
    paginacion: PaginacionRespuesta,
  })
  .meta({ id: "ServiciosLista", description: "Una página de servicios." });
export type ServiciosLista = z.infer<typeof ServiciosLista>;

export const ServiciosRespuesta = z.discriminatedUnion("vista", [ServiciosTablero, ServiciosLista]);
export type ServiciosRespuesta = z.infer<typeof ServiciosRespuesta>;

export const ServicioSugerido = z
  .object({
    id: Id,
    tipo: ServicioTipo,
    nombre: z.string(),
    propiedad: TrabajoPropiedad,
    cliente: TrabajoCliente,
    tareasHoy: z.number().int().meta({ description: "Cuántas tareas tuyas vencen hoy o ya vencieron en este servicio." }),
  })
  .meta({ id: "ServicioSugerido" });
export type ServicioSugerido = z.infer<typeof ServicioSugerido>;

export const ServiciosSugeridos = z
  .object({ items: z.array(ServicioSugerido) })
  .meta({
    id: "ServiciosSugeridos",
    description: "Los servicios donde la persona tiene tareas hoy: «Anotar» los propone para guardar la nota.",
  });
export type ServiciosSugeridos = z.infer<typeof ServiciosSugeridos>;

// ---------------------------------------------------------------------------
// Servicios: la ficha y lo que se le puede hacer
// ---------------------------------------------------------------------------

export const ServicioDueno = z
  .object({
    id: Id,
    tipo: ServicioTipo,
    nombre: z.string().meta({ description: "El nombre del servicio en el catálogo." }),
    estado: ServicioEstado,
    propiedad: TrabajoPropiedad,
    abiertoEl: FechaISO,
    cerradoEl: FechaISO.nullable(),
    esperando: Esperando.nullable(),
    notas: z.array(NotaDueno).meta({ description: "Solo las que el equipo marcó para el dueño, de la más nueva a la más antigua." }),
  })
  .meta({
    id: "ServicioDueno",
    description: "Un servicio como lo ve el dueño o una llave: datos, «esperando a» y notas marcadas. Nunca tareas ni notas internas.",
  });
export type ServicioDueno = z.infer<typeof ServicioDueno>;

export const CambioDeEspera = z
  .object({
    fecha: FechaHoraISO,
    de: EsperandoA.nullable().meta({ description: "A quién se esperaba antes; sin valor era «nos toca»." }),
    a: EsperandoA.nullable().meta({ description: "A quién se espera ahora; sin valor es «nos toca»." }),
    detalle: z.string().nullable(),
    autor: TrabajoPersona.nullable(),
  })
  .meta({ id: "CambioDeEspera", description: "Una vez que cambió a quién se esperaba." });
export type CambioDeEspera = z.infer<typeof CambioDeEspera>;

export const ServicioEquipo = ServicioDueno.extend({
  cliente: TrabajoCliente,
  responsable: TrabajoPersona.nullable(),
  nota: z.string().nullable(),
  motivoCierre: z.string().nullable(),
  porRevisar: z.boolean(),
  porConfirmar: z.boolean(),
  historialEspera: z.array(CambioDeEspera).meta({ description: "De lo más nuevo a lo más antiguo." }),
  tareas: z.array(Tarea).meta({ description: "Las abiertas primero (por fecha) y después las hechas." }),
  notas: z.array(NotaEquipo).meta({ description: "La bitácora completa, de la más nueva a la más antigua." }),
}).meta({ id: "ServicioEquipo", description: "La ficha de un servicio como la ve el equipo." });
export type ServicioEquipo = z.infer<typeof ServicioEquipo>;

export const ServicioFicha = z.union([ServicioEquipo, ServicioDueno]);
export type ServicioFicha = z.infer<typeof ServicioFicha>;

export const ServicioAbrir = z
  .object({
    propiedadId: Id,
    servicioId: Id.meta({ description: "El servicio del catálogo (GET /v1/catalogo)." }),
    tipo: ServicioTipo.optional().meta({
      description:
        "El tipo de servicio. Si se omite se deduce de la familia del catálogo; en las familias que sirven a varios tipos (SC) hay que mandarlo.",
    }),
    responsableId: Id.nullable().optional(),
    nota: z.string().trim().max(2000, "Máximo 2000 caracteres").nullable().optional(),
  })
  .meta({ id: "ServicioAbrir", description: "Abrir un servicio a mano en una propiedad." });
export type ServicioAbrir = z.infer<typeof ServicioAbrir>;

export const ServicioCambiar = z
  .object({
    responsableId: Id.nullable().optional().meta({ description: "Una persona del equipo; null lo deja sin responsable." }),
    esperandoA: EsperandoA.nullable().optional().meta({ description: "A quién se espera; null es «nos toca»." }),
    esperandoDetalle: z.string().trim().max(300, "Máximo 300 caracteres").nullable().optional(),
  })
  .refine((s) => Object.values(s).some((v) => v !== undefined), { message: "Manda al menos un cambio." })
  .meta({
    id: "ServicioCambiar",
    description:
      "Cambiar quién lleva el servicio o a quién se espera. Cada cambio de «esperando a» fija el día de inicio y queda en el historial.",
  });
export type ServicioCambiar = z.infer<typeof ServicioCambiar>;

export const ServicioCerrar = z
  .object({
    resultado: z.enum(["TERMINADO", "CANCELADO"]),
    motivo: z.string().trim().min(1, "Escribe el motivo").max(2000, "Máximo 2000 caracteres"),
  })
  .meta({ id: "ServicioCerrar", description: "Cerrar un servicio, dando por terminado o cancelándolo, con su motivo." });
export type ServicioCerrar = z.infer<typeof ServicioCerrar>;

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export const PedidoNuevo = z
  .object({
    tipo: ServicioTipo.meta({ description: "Qué tipo de servicio necesita. La jefatura elige después el del catálogo." }),
    descripcion: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)").max(2000, "Máximo 2000 caracteres"),
    propiedadId: Id.optional().meta({ description: "Una propiedad que ya tiene." }),
    propiedadNueva: z
      .object({
        direccion: z.string().trim().min(1, "La dirección es obligatoria").max(200, "Máximo 200 caracteres"),
        comuna: z.string().trim().min(1, "La comuna es obligatoria").max(100, "Máximo 100 caracteres"),
        region: z.string().trim().max(100, "Máximo 100 caracteres").optional().meta({ description: "Sin región queda «Por confirmar»." }),
        tipo: PedidoTipoPropiedad,
      })
      .optional()
      .meta({ description: "O los datos de una propiedad nueva, que se crea en la cartera del cliente." }),
  })
  .refine((p) => (p.propiedadId === undefined) !== (p.propiedadNueva === undefined), {
    message: "Elige una propiedad o escribe los datos de una nueva.",
    path: ["propiedadId"],
  })
  .meta({ id: "PedidoNuevo", description: "El pedido de un servicio de un cliente o dueño autónomo." });
export type PedidoNuevo = z.infer<typeof PedidoNuevo>;

export const PedidoCreado = z
  .object({
    pedidoId: Id,
    servicioId: Id.meta({ description: "El servicio, abierto «por revisar»." }),
    tareaId: Id.meta({ description: "La tarea «Revisar y repartir» que le queda a la jefatura." }),
    propiedad: TrabajoPropiedad,
    propiedadCreada: z.boolean(),
  })
  .meta({ id: "PedidoCreado" });
export type PedidoCreado = z.infer<typeof PedidoCreado>;

export const PedidoDueno = z
  .object({
    id: Id,
    estado: SolicitudEstado,
    tipo: ServicioTipo,
    descripcion: z.string(),
    propiedad: TrabajoPropiedad,
    creadoEl: FechaHoraISO,
    motivoRechazo: z.string().nullable(),
    servicioId: Id.nullable().meta({ description: "El servicio abierto, una vez aceptado el pedido." }),
  })
  .meta({ id: "PedidoDueno", description: "Un pedido como lo ve quien lo hizo." });
export type PedidoDueno = z.infer<typeof PedidoDueno>;

export const PedidoEquipo = PedidoDueno.extend({
  cliente: TrabajoCliente,
  pedidoPor: TrabajoPersona,
}).meta({ id: "PedidoEquipo", description: "Un pedido en la bandeja del equipo." });
export type PedidoEquipo = z.infer<typeof PedidoEquipo>;

export const PedidosConsulta = z.object({
  estado: SolicitudEstado.optional().meta({ description: "Para el equipo, por defecto solo los NUEVA; para un dueño, todos los suyos." }),
  cliente: Id.optional().meta({ description: "Solo el equipo: los pedidos de este cliente." }),
});
export type PedidosConsulta = z.infer<typeof PedidosConsulta>;

export const Pedidos = z
  .object({ items: z.array(z.union([PedidoEquipo, PedidoDueno])) })
  .meta({
    id: "Pedidos",
    description:
      "Para el equipo, la bandeja (los más antiguos primero). Para un dueño o una llave, sus propios pedidos (los más nuevos primero).",
  });
export type Pedidos = z.infer<typeof Pedidos>;

export const PedidoAceptar = z
  .object({
    servicioId: Id.meta({ description: "El servicio del catálogo con que se abre (de una familia que ese tipo ofrece)." }),
    responsableId: Id.nullable().optional(),
    nota: z.string().trim().max(2000, "Máximo 2000 caracteres").nullable().optional(),
  })
  .meta({ id: "PedidoAceptar", description: "Aceptar un pedido: elige el servicio y quién lo lleva." });
export type PedidoAceptar = z.infer<typeof PedidoAceptar>;

export const PedidoRechazar = z
  .object({ motivo: z.string().trim().min(1, "Escribe por qué se rechaza").max(2000, "Máximo 2000 caracteres") })
  .meta({ id: "PedidoRechazar", description: "Rechazar un pedido. El motivo lo ve quien lo pidió." });
export type PedidoRechazar = z.infer<typeof PedidoRechazar>;

// ---------------------------------------------------------------------------
// Inicio del equipo y novedades del dueño
// ---------------------------------------------------------------------------

export const InicioCifras = z
  .object({
    serviciosEnCurso: z.number().int().meta({ description: "Abiertos y ya repartidos." }),
    nuevosSinRepartir: z.number().int(),
    esperando: z.number().int(),
    esperandoMasDe10Dias: z.number().int(),
    tareasAtrasadas: z.number().int(),
  })
  .meta({ id: "InicioCifras" });

export const InicioNota = z
  .object({
    id: Id,
    texto: z.string(),
    creadaEl: FechaHoraISO,
    autor: TrabajoPersona,
    servicio: z.object({ id: Id, tipo: ServicioTipo, nombre: z.string() }),
    propiedad: TrabajoPropiedad,
    cliente: TrabajoCliente,
    fotos: z.array(FotoDeNota),
  })
  .meta({ id: "InicioNota", description: "Una nota reciente con foto." });

export const InicioEquipo = z
  .object({
    fecha: FechaISO.meta({ description: "El «hoy» en Chile con el que se calculó." }),
    cifras: InicioCifras,
    nuevo: z.array(ServicioTableroItem).meta({ description: "Lo que entró y nadie reparte (los más antiguos primero)." }),
    trabado: z.object({
      esperandoMasDe10Dias: z.array(ServicioTableroItem).meta({ description: "Los que llevan más días esperando, primero." }),
      tareasAtrasadas: z.array(TareaConServicio).meta({ description: "Las más atrasadas primero (hasta 30)." }),
      presupuestosPorAprobar: z.number().int().meta({ description: "Presupuestos de maestros recibidos y sin aprobar ni rechazar (solo la cuenta)." }),
    }),
    carga: z.array(CargaDePersona),
    ultimasNotasConFoto: z.array(InicioNota),
  })
  .meta({ id: "InicioEquipo", description: "Todo lo que necesita el Inicio del equipo, en una sola llamada." });
export type InicioEquipo = z.infer<typeof InicioEquipo>;

export const InicioConsulta = z.object({
  cliente: Id.optional().meta({ description: "Mirar solo lo de este cliente." }),
});

export const NovedadNota = z
  .object({
    tipo: z.literal("NOTA"),
    fecha: FechaHoraISO,
    servicio: z.object({ id: Id, tipo: ServicioTipo, nombre: z.string() }),
    propiedad: TrabajoPropiedad,
    nota: NotaDueno,
  })
  .meta({ id: "NovedadNota" });

export const NovedadEspera = z
  .object({
    tipo: z.literal("ESPERA"),
    fecha: FechaHoraISO,
    servicio: z.object({ id: Id, tipo: ServicioTipo, nombre: z.string() }),
    propiedad: TrabajoPropiedad,
    de: EsperandoA.nullable(),
    a: EsperandoA.nullable().meta({ description: "Sin valor: ahora nos toca a nosotros." }),
    detalle: z.string().nullable(),
  })
  .meta({ id: "NovedadEspera" });

export const Novedad = z.discriminatedUnion("tipo", [NovedadNota, NovedadEspera]);
export type Novedad = z.infer<typeof Novedad>;

export const NovedadesConsulta = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(50).meta({ description: "Cuántas novedades traer (hasta 100)." }),
  cliente: Id.optional().meta({ description: "Solo el equipo: las de este cliente." }),
});
export type NovedadesConsulta = z.infer<typeof NovedadesConsulta>;

export const Novedades = z
  .object({ items: z.array(Novedad) })
  .meta({
    id: "Novedades",
    description:
      "Lo que pasó en los servicios de un dueño: notas marcadas para él y cambios de «esperando a». De lo más nuevo a lo más antiguo.",
  });
export type Novedades = z.infer<typeof Novedades>;
