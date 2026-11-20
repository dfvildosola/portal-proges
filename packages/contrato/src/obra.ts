// Contrato del área: obra (orden de Odoo, partidas, presupuestos, facturas, recepción) y maestros.
//
// La obra es la carpeta de una reparación en una constructora: adentro va el contrato con el
// dueño (la orden de Odoo), cada presupuesto de maestro, las facturas que llegan y la hoja de
// recepción donde se firma partida por partida (ADR 0014).
//
// Dos vistas del mismo panel (GET /v1/servicios/{id}/obra):
//  - `ObraEquipo`: todo, incluido el costo del maestro, presupuestos, facturas y margen.
//  - `ObraDueno`: lo que ve un dueño o la llave de un cliente. Solo la orden (lo que se le cobra),
//    el avance y la recepción de cada partida. Nada del maestro. Su lista de campos es explícita
//    (el recorte la arma campo por campo en la API), y por eso aquí no existe ningún campo de costo.
//
// La plata sale como `Monto` (texto con su moneda). Lo que entra por JSON también (`MontoClp`: el
// maestro y sus facturas son siempre en pesos). Lo que entra por formulario con archivos
// (multipart) va como texto simple, porque un formulario no lleva objetos.
import { z } from "zod";
import { FechaHoraISO, FechaISO, Id, Monto } from "./comun";

// ---------------------------------------------------------------------------
// Piezas que se repiten
// ---------------------------------------------------------------------------

export const ObraRecepcion = z
  .enum(["PENDIENTE", "CONFORME", "OBSERVADA"])
  .meta({ id: "ObraRecepcion", description: "Cómo va la recepción de una partida: por recibir, conforme u observada." });
export type ObraRecepcion = z.infer<typeof ObraRecepcion>;

export const PresupuestoTipo = z
  .enum(["ORIGINAL", "ADICIONAL"])
  .meta({ id: "ObraPresupuestoTipo", description: "Original (lo acordado al inicio) o adicional (un cambio de alcance durante la obra)." });
export type PresupuestoTipo = z.infer<typeof PresupuestoTipo>;

export const PresupuestoEstado = z
  .enum(["RECIBIDO", "APROBADO", "RECHAZADO"])
  .meta({ id: "ObraPresupuestoEstado", description: "Un presupuesto llega recibido; la jefatura lo aprueba o lo rechaza." });
export type PresupuestoEstado = z.infer<typeof PresupuestoEstado>;

// Un archivo adjunto en un formulario multipart. zod no sabe qué es un archivo: la API revisa el
// tipo, el peso y el contenido al recibirlo. Aquí solo sirve para que /docs lo muestre como archivo.
const ArchivoSubido = z.any().meta({ type: "string", format: "binary", description: "Un archivo." });

// Pesos, para lo que entra por JSON: mayor que cero y siempre en CLP.
export const MontoClp = z
  .object({
    valor: z
      .string()
      .regex(/^\d+(\.\d+)?$/, "Escribe un monto: solo números, con punto para los decimales.")
      .refine((v) => Number(v) > 0, "El monto tiene que ser mayor que cero.")
      .meta({ description: "El monto en pesos, en texto y sin separador de miles.", example: "1500000" }),
    moneda: z.literal("CLP"),
  })
  .meta({ id: "MontoClp", description: "Una cantidad en pesos chilenos (los maestros y sus facturas son siempre en CLP)." });
export type MontoClp = z.infer<typeof MontoClp>;

const textoCorto = (max: number, mensajeLargo: string) => z.string().trim().max(max, mensajeLargo);

// ---------------------------------------------------------------------------
// Maestros: proveedores de Odoo con su especialidad (viven en el espacio de Proges)
// ---------------------------------------------------------------------------

export const Maestro = z
  .object({
    id: Id,
    odooPartnerId: z.number().int().meta({ description: "El id del proveedor en Odoo (res.partner)." }),
    nombre: z.string().meta({ description: "El nombre, copiado de Odoo al agregarlo." }),
    especialidad: z.string().nullable().meta({ description: "Lo que hace («gasfíter»). Odoo no lo sabe." }),
    telefono: z.string().nullable(),
    activo: z.boolean().meta({ description: "Uno desactivado no se ofrece al cargar presupuestos; nunca se borra." }),
  })
  .meta({ id: "Maestro", description: "Un maestro: un proveedor de Odoo al que Proges le encarga trabajos." });
export type Maestro = z.infer<typeof Maestro>;

export const MaestrosRespuesta = z.object({ items: z.array(Maestro) }).meta({ id: "MaestrosRespuesta" });
export type MaestrosRespuesta = z.infer<typeof MaestrosRespuesta>;

export const MaestroNuevo = z
  .object({
    odooPartnerId: z.number().int().positive("Elige un proveedor de la lista."),
    buscado: z
      .string()
      .trim()
      .min(2, "Falta el nombre con que se buscó al proveedor.")
      .meta({ description: "El texto con que se lo encontró en Odoo: la API lo vuelve a buscar y toma el nombre de Odoo, no del navegador." }),
    especialidad: textoCorto(80, "La especialidad es muy larga.").optional(),
    telefono: textoCorto(40, "El teléfono es muy largo.").optional(),
  })
  .meta({ id: "MaestroNuevo", description: "Agrega un proveedor de Odoo como maestro." });
export type MaestroNuevo = z.infer<typeof MaestroNuevo>;

export const MaestroCambio = z
  .object({
    especialidad: textoCorto(80, "La especialidad es muy larga.").nullable().optional(),
    telefono: textoCorto(40, "El teléfono es muy largo.").nullable().optional(),
    activo: z.boolean().optional(),
    refrescarNombreDeOdoo: z
      .boolean()
      .optional()
      .meta({ description: "true: vuelve a copiar el nombre desde Odoo (por si lo corrigieron allá)." }),
  })
  .meta({ id: "MaestroCambio", description: "Lo que se puede cambiar de un maestro. Lo que no se manda, no cambia." });
export type MaestroCambio = z.infer<typeof MaestroCambio>;

export const ProveedorOdoo = z
  .object({
    id: z.number().int().meta({ description: "El id del proveedor en Odoo: es el `odooPartnerId` del maestro." }),
    nombre: z.string(),
    rut: z.string().nullable(),
    telefono: z.string().nullable(),
    correo: z.string().nullable(),
    facturas: z.number().int().meta({ description: "Cuántas facturas de proveedor tiene en Odoo: ayuda a reconocer al correcto." }),
    yaAgregado: z.boolean().meta({ description: "true si ya es maestro del portal." }),
  })
  .meta({ id: "ProveedorOdoo", description: "Un proveedor encontrado en Odoo." });
export type ProveedorOdoo = z.infer<typeof ProveedorOdoo>;

export const ProveedoresRespuesta = z.object({ items: z.array(ProveedorOdoo) }).meta({ id: "ProveedoresRespuesta" });
export type ProveedoresRespuesta = z.infer<typeof ProveedoresRespuesta>;

export const FacturaOdooDeMaestro = z
  .object({
    odooMoveId: z.number().int().meta({ description: "El id de la factura en Odoo." }),
    numero: z.string(),
    fecha: FechaISO.nullable(),
    total: Monto.meta({ description: "El total de la factura en Odoo (con IVA)." }),
    estado: z.enum(["borrador", "publicada", "anulada"]),
    pendiente: Monto.meta({ description: "Lo que falta pagar según Odoo." }),
    asignado: Monto.meta({ description: "Cuánto de esta factura ya está asignado a obras (todas, no solo esta)." }),
    asignable: Monto.meta({ description: "Cuánto queda por asignar: el total menos lo asignado, nunca negativo." }),
  })
  .meta({ id: "FacturaOdooDeMaestro", description: "Una factura de proveedor de un maestro, leída de Odoo, con cuánto de ella ya está asignado." });
export type FacturaOdooDeMaestro = z.infer<typeof FacturaOdooDeMaestro>;

export const FacturasOdooRespuesta = z.object({ items: z.array(FacturaOdooDeMaestro) }).meta({ id: "FacturasOdooRespuesta" });
export type FacturasOdooRespuesta = z.infer<typeof FacturasOdooRespuesta>;

// ---------------------------------------------------------------------------
// El panel de la obra: vista del dueño
// ---------------------------------------------------------------------------

const PartidaDueno = z
  .object({
    id: Id,
    codigo: z.string().nullable(),
    descripcion: z.string(),
    cantidad: z.string().nullable().meta({ description: "La cantidad en texto (hasta 3 decimales)." }),
    unidad: z.string().nullable(),
    avance: z.number().int().meta({ description: "0 a 100." }),
    recepcion: ObraRecepcion,
  })
  .meta({ id: "ObraPartidaDueno", description: "Una línea de la orden vista por el dueño: qué se hace y cómo va. Sin precio, sin maestro y sin la observación del equipo." });

const RecintoDueno = z
  .object({
    nombre: z.string().nullable().meta({ description: "null: las líneas que no están bajo ningún recinto." }),
    avance: z.number().meta({ description: "0 a 100, ponderado igual que el de la obra." }),
    partidas: z.array(PartidaDueno),
  })
  .meta({ id: "ObraRecintoDueno" });

export const ResumenRecepcion = z
  .object({
    conformes: z.number().int(),
    observadas: z.number().int(),
    pendientes: z.number().int(),
    total: z.number().int().meta({ description: "Las partidas vigentes (sin las que Odoo ya no trae)." }),
  })
  .meta({ id: "ObraResumenRecepcion", description: "Cuántas partidas están conformes, observadas o por recibir." });
export type ResumenRecepcion = z.infer<typeof ResumenRecepcion>;

export const ObraDueno = z
  .object({
    vista: z.literal("dueno"),
    servicioId: Id,
    orden: z
      .object({
        numero: z.string().meta({ description: "El número de la orden en Odoo («S00047»)." }),
        total: Monto.meta({ description: "Lo que se le cobra al dueño (sin impuesto)." }),
        anticipado: Monto.meta({ description: "Lo que el dueño ya pagó como anticipo." }),
      })
      .nullable()
      .meta({ description: "null si todavía no se enlaza la orden de Odoo." }),
    avance: z.number().meta({ description: "El avance de toda la obra, 0 a 100." }),
    recepcion: ResumenRecepcion,
    recintos: z.array(RecintoDueno),
  })
  .meta({ id: "ObraDueno", description: "El panel de la obra como lo ve un dueño o la llave de un cliente: la orden, el avance y la recepción. Nunca costos, maestros, presupuestos, facturas ni márgenes." });
export type ObraDueno = z.infer<typeof ObraDueno>;

// ---------------------------------------------------------------------------
// El panel de la obra: vista del equipo
// ---------------------------------------------------------------------------

const MaestroResumen = z.object({ id: Id, nombre: z.string() }).meta({ id: "ObraMaestroResumen" });

const FotoDePartida = z
  .object({ driveFileId: z.string(), nombre: z.string() })
  .meta({ id: "ObraFoto", description: "Una foto de la recepción, guardada en el Drive de la propiedad." });

const PartidaEquipo = z
  .object({
    id: Id,
    recinto: z.string().nullable(),
    codigo: z.string().nullable(),
    descripcion: z.string(),
    cantidad: z.string().nullable(),
    unidad: z.string().nullable(),
    precioDueno: Monto.nullable().meta({ description: "Lo que Odoo le cobra al dueño por la línea. Sirve para ponderar el avance." }),
    avance: z.number().int(),
    recepcion: ObraRecepcion,
    observacion: z.string().nullable().meta({ description: "Lo que hay que corregir (si quedó observada), o la última observación como historia." }),
    recibidaEl: FechaHoraISO.nullable(),
    recibidaPor: z.string().nullable().meta({ description: "El nombre de quien la recibió." }),
    quitadaEnOdoo: z.boolean().meta({ description: "Odoo ya no trae esta línea: no cuenta para el avance ni para recibir la obra." }),
    maestro: MaestroResumen.nullable(),
    fotos: z.array(FotoDePartida),
  })
  .meta({ id: "ObraPartidaEquipo", description: "Una línea de trabajo de la orden, con todo lo que ve el equipo." });
export type PartidaEquipo = z.infer<typeof PartidaEquipo>;

const PresupuestoEquipo = z
  .object({
    id: Id,
    maestro: MaestroResumen,
    tipo: PresupuestoTipo,
    total: Monto,
    plazoDias: z.number().int().nullable(),
    estado: PresupuestoEstado,
    nota: z.string().nullable(),
    pdfDriveFileId: z.string().nullable(),
    partidaIds: z.array(Id).meta({ description: "Las partidas que cubre." }),
    cargadoPor: z.string(),
    resueltoPor: z.string().nullable(),
    resueltoEl: FechaHoraISO.nullable(),
    creadoEl: FechaHoraISO,
  })
  .meta({ id: "ObraPresupuestoEquipo", description: "El presupuesto que mandó un maestro para esta obra." });
export type PresupuestoEquipo = z.infer<typeof PresupuestoEquipo>;

const FacturaDeObra = z
  .object({
    id: Id.meta({ description: "El id de la asignación (para quitarla)." }),
    maestro: MaestroResumen,
    origen: z.enum(["odoo", "manual"]).meta({ description: "«manual»: una factura fuera de Odoo, anotada a mano." }),
    odooMoveId: z.number().int().nullable(),
    numero: z.string().nullable(),
    fecha: FechaISO.nullable(),
    montoAsignado: Monto.meta({ description: "Cuánto de la factura es de esta obra." }),
    nota: z.string().nullable(),
    totalOdoo: Monto.nullable().meta({ description: "Solo las de Odoo, y solo si Odoo respondió." }),
    estado: z.enum(["borrador", "publicada", "anulada"]).nullable(),
    pendiente: Monto.nullable().meta({ description: "Lo que falta pagar según Odoo." }),
    pagada: z.boolean().nullable().meta({ description: "Solo las manuales: la casilla «pagada». En las de Odoo, null." }),
    sinDatosDeOdoo: z.boolean().meta({ description: "true si es de Odoo pero no se pudo leer su estado: cuenta lo asignado como facturado y nada como pagado." }),
  })
  .meta({ id: "ObraFactura", description: "Una factura de un maestro asignada (en todo o en parte) a esta obra." });
export type FacturaDeObra = z.infer<typeof FacturaDeObra>;

const CuentasObra = z
  .object({
    aprobado: Monto.meta({ description: "Los presupuestos originales aprobados." }),
    adicionales: Monto.meta({ description: "Los adicionales aprobados." }),
    facturado: Monto.meta({ description: "Lo que los maestros han facturado a esta obra (lo asignado; sin las anuladas)." }),
    pagado: Monto.meta({ description: "Lo que Odoo marca pagado de lo asignado, más las manuales pagadas." }),
    saldo: Monto.meta({ description: "Aprobado más adicionales, menos lo pagado: lo que falta pagarle a los maestros." }),
  })
  .meta({ id: "ObraCuentas", description: "Las cuentas con los maestros, calculadas cada vez que se mira (nunca guardadas)." });

export const PlanContraReal = z
  .object({
    costo: z.object({
      planificado: Monto.meta({ description: "Lo aprobado más los adicionales." }),
      real: Monto.meta({ description: "Lo facturado por los maestros." }),
      diferencia: Monto.meta({ description: "Positivo: costó más de lo planificado." }),
    }),
    plazo: z.object({
      planificado: z.number().int().nullable().meta({ description: "Días: el plazo del maestro que más se demora, entre los aprobados." }),
      real: z.number().int().nullable().meta({ description: "Días desde el inicio de la obra hasta hoy (o hasta el cierre). null sin fecha de inicio." }),
      diferencia: z.number().int().nullable().meta({ description: "Positivo: se demoró más de lo planificado." }),
    }),
    partidas: ResumenRecepcion,
  })
  .meta({ id: "ObraPlanContraReal", description: "Lo planificado contra lo real: costo, plazo y partidas." });
export type PlanContraReal = z.infer<typeof PlanContraReal>;

const MargenObra = z
  .object({
    precioDueno: Monto.meta({ description: "Lo que se le cobra al dueño (el total de la orden)." }),
    costoPlanificado: Monto.meta({ description: "Aprobado más adicionales." }),
    costoReal: Monto.meta({ description: "Lo facturado por los maestros." }),
    planificado: Monto.meta({ description: "Precio al dueño menos costo planificado." }),
    real: Monto.meta({ description: "Precio al dueño menos costo real. Mientras la obra sigue, es provisorio." }),
  })
  .meta({ id: "ObraMargen", description: "El margen de la obra. Solo existe si la orden está en pesos." });

export const ObraEquipo = z
  .object({
    vista: z.literal("equipo"),
    servicioId: Id,
    estado: z.enum(["ABIERTO", "TERMINADO", "CANCELADO"]),
    inicioObra: FechaISO.nullable(),
    fechaComprometida: FechaISO.nullable().meta({ description: "Cuándo se le prometió al dueño que terminaba." }),
    orden: z
      .object({
        numero: z.string(),
        odooOrderId: z.number().int(),
        total: Monto.meta({ description: "Lo que se le cobra al dueño (sin impuesto)." }),
        facturadoAlDueno: Monto.meta({ description: "Lo que ya se le facturó al dueño (los anticipos)." }),
        traidaEl: FechaHoraISO,
      })
      .nullable()
      .meta({ description: "null si todavía no se enlaza la orden de Odoo." }),
    partidas: z.array(PartidaEquipo),
    presupuestos: z.array(PresupuestoEquipo),
    facturas: z.array(FacturaDeObra),
    cuentas: CuentasObra,
    avance: z.number().meta({ description: "El avance ponderado de toda la obra, 0 a 100." }),
    recepcion: ResumenRecepcion,
    planContraReal: PlanContraReal,
    margen: MargenObra.nullable().meta({ description: "null si no hay orden o está en UF." }),
    sePuedeCerrar: z.boolean().meta({ description: "Hay partidas y todas están conformes. Cerrar además exige jefatura." }),
    odooError: z.string().nullable().meta({ description: "Si Odoo no respondió al leer las facturas, el mensaje; si todo bien, null." }),
  })
  .meta({ id: "ObraEquipo", description: "El panel completo de la obra, para el equipo de Proges." });
export type ObraEquipo = z.infer<typeof ObraEquipo>;

export const ObraRespuesta = z
  .union([ObraEquipo, ObraDueno])
  .meta({ id: "ObraRespuesta", description: "El panel de la obra. El campo `vista` dice cuál es: «equipo» (completo) o «dueno» (recortado)." });
export type ObraRespuesta = z.infer<typeof ObraRespuesta>;

// ---------------------------------------------------------------------------
// La orden de Odoo
// ---------------------------------------------------------------------------

export const OrdenPedido = z
  .object({
    numero: z.string().trim().min(1, "Escribe el número de la orden (por ejemplo S00047).").max(30, "El número es demasiado largo."),
    confirmar: z
      .boolean()
      .default(false)
      .meta({ description: "false (por defecto): solo revisa y dice qué se enlazaría, sin guardar nada. true: el equipo ya confirmó que la orden es de esta unidad; la guarda y crea sus partidas." }),
  })
  .meta({ id: "OrdenPedido", description: "Trae una orden de Odoo a un servicio. Primero se revisa; después se confirma." });
export type OrdenPedido = z.infer<typeof OrdenPedido>;

export const OrdenRevision = z
  .object({
    numero: z.string(),
    clienteOdoo: z.string().nullable(),
    estadoOdoo: z.string().meta({ description: "El estado de la orden en Odoo (sale, draft, cancel…)." }),
    total: Monto,
    facturadoAlDueno: Monto,
    anticipos: z.number().int(),
    recintos: z.number().int(),
    partidas: z.number().int(),
    cuentaAnalitica: z.string().nullable().meta({ description: "El código de la cuenta analítica de la orden." }),
    propiedad: z.string().meta({ description: "La dirección de la propiedad del servicio." }),
    veredicto: z.enum(["calza", "otra", "ninguna", "sin-cuenta"]).meta({
      description: "La unidad sugerida por la cuenta analítica: calza (es esta propiedad), otra (es de otra del mismo cliente), ninguna (no calza con ninguna) o sin-cuenta. El equipo siempre confirma.",
    }),
    mensajeCuenta: z.string(),
    avisos: z.array(z.string()),
  })
  .meta({ id: "OrdenRevision", description: "Lo que se va a enlazar, para que el equipo confirme." });
export type OrdenRevision = z.infer<typeof OrdenRevision>;

export const OrdenRespuesta = z
  .object({
    enlazada: z.boolean().meta({ description: "false: fue solo una revisión. true: la orden quedó enlazada." }),
    revision: OrdenRevision,
    mensaje: z.string().nullable(),
  })
  .meta({ id: "OrdenRespuesta" });
export type OrdenRespuesta = z.infer<typeof OrdenRespuesta>;

export const OrdenActualizada = z
  .object({
    nuevas: z.number().int(),
    cambiadas: z.number().int(),
    quitadasEnOdoo: z.number().int(),
    mensaje: z.string(),
  })
  .meta({ id: "OrdenActualizada", description: "Lo que cambió al volver a traer la orden. El avance, la recepción y el maestro de cada partida no se tocan." });
export type OrdenActualizada = z.infer<typeof OrdenActualizada>;

// ---------------------------------------------------------------------------
// Partidas: avance, maestro y recepción
// ---------------------------------------------------------------------------

const Avance = z
  .union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(100)], { error: "El avance es 0, 25, 50, 75 o 100." })
  .meta({ description: "0, 25, 50, 75 o 100." });

export const PartidaCambio = z
  .object({
    avance: Avance.optional(),
    maestroId: Id.nullable().optional().meta({ description: "El maestro a cargo de la partida. null: la deja sin maestro." }),
  })
  .meta({ id: "ObraPartidaCambio", description: "Cambia el avance y/o el maestro de una partida. Lo que no se manda, no cambia." });
export type PartidaCambio = z.infer<typeof PartidaCambio>;

export const AvanceRecinto = z
  .object({
    recinto: z.string().nullable().meta({ description: "El nombre del recinto. null: las líneas que no están bajo ningún recinto." }),
    avance: Avance,
  })
  .meta({ id: "ObraAvanceRecinto", description: "Marca el avance de todas las partidas vigentes de un recinto." });
export type AvanceRecinto = z.infer<typeof AvanceRecinto>;

export const AvanceRecintoRespuesta = z.object({ partidasCambiadas: z.number().int() }).meta({ id: "ObraAvanceRecintoRespuesta" });

// Recepción: formulario multipart (lleva fotos).
export const RecepcionPedido = z
  .object({
    resultado: z.enum(["CONFORME", "OBSERVADA"], { error: "Elige conforme u observada." }),
    observacion: textoCorto(500, "Máximo 500 caracteres.").optional().meta({ description: "Obligatoria si es OBSERVADA: qué hay que corregir." }),
    responsableId: Id.optional().meta({ description: "Si es OBSERVADA: quién corrige (una persona del equipo). Va a la tarea «Corregir…»." }),
    fotos: z.union([ArchivoSubido, z.array(ArchivoSubido)]).optional().meta({ description: "Hasta 6 fotos JPG, PNG o WebP, de hasta 4 MB cada una. Van al Drive de la propiedad." }),
  })
  .meta({ id: "ObraRecepcionPedido", description: "Recibe una partida: conforme u observada. Formulario multipart (lleva fotos)." });
export type RecepcionPedido = z.infer<typeof RecepcionPedido>;

export const RecepcionRespuesta = z
  .object({
    partidaId: Id,
    recepcion: ObraRecepcion,
    tareaId: Id.nullable().meta({ description: "La tarea «Corregir…» que abrió una observada (o que se actualizó)." }),
    fotos: z.number().int().meta({ description: "Cuántas fotos quedaron guardadas." }),
  })
  .meta({ id: "ObraRecepcionRespuesta" });
export type RecepcionRespuesta = z.infer<typeof RecepcionRespuesta>;

// ---------------------------------------------------------------------------
// Presupuestos de maestros
// ---------------------------------------------------------------------------

// Formulario multipart (lleva el PDF): los números van como texto.
export const PresupuestoPedido = z
  .object({
    maestroId: Id,
    tipo: PresupuestoTipo,
    total: z
      .string()
      .trim()
      .regex(/^\d+$/, "Escribe el total en pesos, solo números.")
      .refine((v) => Number(v) > 0, "El total tiene que ser mayor que cero.")
      .meta({ description: "El total del presupuesto en pesos (CLP), solo números.", example: "1500000" }),
    plazoDias: z.coerce.number().int("Escribe los días como número entero.").min(1, "Mínimo 1 día.").max(1000, "Máximo 1000 días.").optional(),
    partidaIds: z.union([Id, z.array(Id)]).optional().meta({ description: "Las partidas de la orden que cubre (repite el campo). Tienen que ser de este servicio." }),
    nota: textoCorto(1000, "La nota es muy larga.").optional(),
    pdf: ArchivoSubido.optional().meta({ description: "El PDF del presupuesto, de hasta 4 MB." }),
  })
  .meta({ id: "ObraPresupuestoPedido", description: "Carga el presupuesto de un maestro. Formulario multipart (lleva el PDF). Queda RECIBIDO." });
export type PresupuestoPedido = z.infer<typeof PresupuestoPedido>;

export const Rechazo = z
  .object({ motivo: z.string().trim().min(1, "Escribe el motivo del rechazo.").max(500, "El motivo es muy largo.") })
  .meta({ id: "ObraRechazo" });
export type Rechazo = z.infer<typeof Rechazo>;

// ---------------------------------------------------------------------------
// Facturas, fechas y cierre
// ---------------------------------------------------------------------------

export const FacturaAsignar = z
  .object({
    maestroId: Id,
    odooMoveId: z.number().int().positive(),
    monto: MontoClp.meta({ description: "Cuánto de la factura es de esta obra. La suma asignada de una factura, entre todas las obras, nunca pasa su total." }),
  })
  .meta({ id: "ObraFacturaAsignar", description: "Asigna una factura de Odoo (o una parte de ella) a esta obra." });
export type FacturaAsignar = z.infer<typeof FacturaAsignar>;

export const FacturaManual = z
  .object({
    maestroId: Id,
    numero: textoCorto(40, "El número es muy largo.").optional(),
    fecha: FechaISO,
    monto: MontoClp,
    pagada: z.boolean().default(false),
    nota: textoCorto(500, "La nota es muy larga.").optional(),
  })
  .meta({ id: "ObraFacturaManual", description: "Anota a mano una factura que no está en Odoo («fuera de Odoo»)." });
export type FacturaManual = z.infer<typeof FacturaManual>;

export const FechasObra = z
  .object({
    inicioObra: FechaISO.nullable().optional().meta({ description: "Cuándo empezó el trabajo. null: la borra." }),
    fechaComprometida: FechaISO.nullable().optional().meta({ description: "Cuándo se le prometió al dueño que terminaba. null: la borra." }),
  })
  .meta({ id: "ObraFechas", description: "Las fechas de la obra. Lo que no se manda, no cambia." });
export type FechasObra = z.infer<typeof FechasObra>;

export const CierrePedido = z
  .object({ motivo: textoCorto(500, "La nota es muy larga.").optional().meta({ description: "Una nota para quien lea el cierre después." }) })
  .meta({ id: "ObraCierrePedido" });
export type CierrePedido = z.infer<typeof CierrePedido>;

export const CierreRespuesta = z
  .object({
    servicioId: Id,
    cerradoEl: FechaHoraISO,
    planContraReal: PlanContraReal,
  })
  .meta({ id: "ObraCierreRespuesta", description: "La obra quedó cerrada (servicio TERMINADO), con lo planificado contra lo real." });
export type CierreRespuesta = z.infer<typeof CierreRespuesta>;

export const AsignacionRespuesta = z.object({ id: Id }).meta({ id: "ObraAsignacionRespuesta" });
export type AsignacionRespuesta = z.infer<typeof AsignacionRespuesta>;
export const PresupuestoRespuesta = z.object({ id: Id, estado: PresupuestoEstado }).meta({ id: "ObraPresupuestoRespuesta" });
export type PresupuestoRespuesta = z.infer<typeof PresupuestoRespuesta>;
export const FechasRespuesta = z
  .object({ inicioObra: FechaISO.nullable(), fechaComprometida: FechaISO.nullable() })
  .meta({ id: "ObraFechasRespuesta" });
export type FechasRespuesta = z.infer<typeof FechasRespuesta>;
