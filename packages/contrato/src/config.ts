// Contrato del área: configuración (clientes y usuarios), llaves de la API y resultados.
// Lo llena la pieza H.
//
// Todo esto lo ve solo el equipo de Proges: clientes, usuarios y llaves los maneja el
// administrador, y Resultados lo miran la jefatura y el administrador. Nada de esto sale
// hacia un dueño ni hacia una llave.
import { z } from "zod";
import { FechaHoraISO, FechaISO, Id, Moneda, Monto } from "./comun";
import { ModoCliente, Rol } from "./acceso";

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

const NombreCliente = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(80, "El nombre es demasiado largo.")
  .meta({ description: "Nombre del cliente («NPL»). No se repite entre clientes, sin importar mayúsculas." });

export const ClienteConfig = z
  .object({
    id: Id,
    nombre: z.string(),
    activa: z.boolean().meta({ description: "Un cliente desactivado no se ofrece al equipo y sus llaves dejan de servir, pero sus datos quedan intactos." }),
    modo: ModoCliente,
    creadoEl: FechaHoraISO,
  })
  .meta({ id: "ClienteConfig", description: "Un cliente de Proges, como lo ve el administrador." });
export type ClienteConfig = z.infer<typeof ClienteConfig>;

export const ClienteNuevo = z
  .object({
    nombre: NombreCliente,
    modo: ModoCliente.default("ATENDIDO"),
  })
  .meta({ id: "ClienteNuevo", description: "Los datos para crear un cliente." });
export type ClienteNuevo = z.infer<typeof ClienteNuevo>;

export const ClienteCambios = z
  .object({
    nombre: NombreCliente.optional(),
    activa: z.boolean().optional(),
    modo: ModoCliente.optional(),
  })
  .refine((c) => Object.values(c).some((v) => v !== undefined), { message: "Manda al menos un campo para cambiar." })
  .meta({ id: "ClienteCambios", description: "Lo que se cambia de un cliente: solo los campos que se mandan." });
export type ClienteCambios = z.infer<typeof ClienteCambios>;

export const ClientesLista = z
  .object({ items: z.array(ClienteConfig) })
  .meta({ id: "ClientesLista", description: "Todos los clientes, activos y desactivados, por nombre." });
export type ClientesLista = z.infer<typeof ClientesLista>;

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

const Correo = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Escribe un correo válido.")
  .meta({ description: "Correo de la persona. Se guarda en minúsculas y no se repite en todo el portal.", example: "ana@proges.cl" });

const NombreUsuario = z.string().trim().min(1, "El nombre es obligatorio.").max(120, "El nombre es demasiado largo.");

export const UsuarioConfig = z
  .object({
    id: Id,
    nombre: z.string(),
    correo: z.string(),
    rol: Rol,
    clienteId: Id.nullable().meta({ description: "El cliente de la persona; null si es del equipo de Proges." }),
    clienteNombre: z.string().nullable(),
    jefatura: z.boolean().meta({ description: "Solo del equipo: aprueba presupuestos de maestros, cierra obras y mira Resultados." }),
    admin: z.boolean().meta({ description: "Solo del equipo: crea clientes, usuarios y llaves." }),
    activo: z.boolean(),
    haEntrado: z.boolean().meta({ description: "false mientras la persona invitada no haya entrado nunca." }),
    ultimoIngreso: FechaHoraISO.nullable(),
  })
  .meta({ id: "UsuarioConfig", description: "Una persona con acceso al portal, como la ve el administrador." });
export type UsuarioConfig = z.infer<typeof UsuarioConfig>;

export const UsuariosConsulta = z.object({
  cliente: Id.optional().meta({ description: "Solo las personas de ese cliente." }),
  rol: Rol.optional().meta({ description: "EQUIPO o CLIENTE." }),
});
export type UsuariosConsulta = z.infer<typeof UsuariosConsulta>;

export const UsuariosLista = z
  .object({ items: z.array(UsuarioConfig) })
  .meta({ id: "UsuariosLista", description: "Las personas con acceso, por nombre." });
export type UsuariosLista = z.infer<typeof UsuariosLista>;

export const UsuarioNuevo = z
  .object({
    nombre: NombreUsuario,
    correo: Correo,
    rol: Rol,
    clienteId: Id.optional().meta({ description: "Obligatorio si el rol es CLIENTE; se ignora si es EQUIPO." }),
    jefatura: z.boolean().default(false).meta({ description: "Solo para el equipo; en un cliente se ignora." }),
    admin: z.boolean().default(false).meta({ description: "Solo para el equipo; en un cliente se ignora." }),
  })
  .meta({
    id: "UsuarioNuevo",
    description:
      "Los datos para dar acceso a una persona. Se entra solo por invitación: crear el usuario con su correo basta, y al ingresar con ese correo queda enlazada.",
  });
export type UsuarioNuevo = z.infer<typeof UsuarioNuevo>;

export const UsuarioCambios = z
  .object({
    nombre: NombreUsuario.optional(),
    correo: Correo.optional(),
    rol: Rol.optional(),
    clienteId: Id.optional(),
    jefatura: z.boolean().optional(),
    admin: z.boolean().optional(),
    activo: z.boolean().optional(),
  })
  .refine((c) => Object.values(c).some((v) => v !== undefined), { message: "Manda al menos un campo para cambiar." })
  .meta({ id: "UsuarioCambios", description: "Lo que se cambia de un usuario: solo los campos que se mandan." });
export type UsuarioCambios = z.infer<typeof UsuarioCambios>;

// ---------------------------------------------------------------------------
// Llaves de la API
// ---------------------------------------------------------------------------

export const LlaveConfig = z
  .object({
    id: Id,
    clienteId: Id,
    clienteNombre: z.string(),
    nombre: z.string().meta({ description: "Para qué es la llave («Sistema de NPL»)." }),
    prefijo: z.string().meta({ description: "El comienzo de la llave, para reconocerla a la vista. No alcanza para usarla." }),
    creadaEl: FechaHoraISO,
    ultimoUso: FechaHoraISO.nullable(),
    revocadaEl: FechaHoraISO.nullable().meta({ description: "Si tiene fecha, la llave ya no funciona." }),
  })
  .meta({ id: "LlaveConfig", description: "Una llave de la API, sin la llave misma: solo se guarda su prefijo y su huella." });
export type LlaveConfig = z.infer<typeof LlaveConfig>;

export const LlavesConsulta = z.object({
  cliente: Id.optional().meta({ description: "Solo las llaves de ese cliente." }),
});
export type LlavesConsulta = z.infer<typeof LlavesConsulta>;

export const LlavesLista = z
  .object({ items: z.array(LlaveConfig) })
  .meta({ id: "LlavesLista", description: "Las llaves de la API, las más nuevas primero (incluye las revocadas)." });
export type LlavesLista = z.infer<typeof LlavesLista>;

export const LlaveNueva = z
  .object({
    clienteId: Id,
    nombre: z.string().trim().min(1, "Escribe para qué es la llave.").max(80, "El nombre es demasiado largo."),
  })
  .meta({ id: "LlaveNueva", description: "Los datos para crear una llave de la API de un cliente." });
export type LlaveNueva = z.infer<typeof LlaveNueva>;

export const LlaveCreada = LlaveConfig.extend({
  llave: z.string().meta({
    description: "La llave completa. Se muestra esta única vez: Proges guarda solo su huella y no puede volver a mostrarla.",
    example: "prg_Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90Uv1",
  }),
}).meta({ id: "LlaveCreada", description: "La llave recién creada, con la llave completa (única vez)." });
export type LlaveCreada = z.infer<typeof LlaveCreada>;

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

export const ResultadosConsulta = z.object({
  desde: FechaISO.optional().meta({ description: "Primer día del período. Por defecto, 12 semanas atrás." }),
  hasta: FechaISO.optional().meta({ description: "Último día del período (incluido). Por defecto, hoy." }),
  cliente: Id.optional().meta({ description: "Solo los servicios de ese cliente. Sin esto, todos los clientes activos." }),
});
export type ResultadosConsulta = z.infer<typeof ResultadosConsulta>;

export const ResultadosTipoServicio = z
  .enum(["EVALUACION", "INSPECCION", "VENTA", "ARRIENDO", "OBRA", "ADMINISTRACION"])
  .meta({ id: "ResultadosTipoServicio", description: "El tipo de servicio." });
export type ResultadosTipoServicio = z.infer<typeof ResultadosTipoServicio>;

export const ResultadosEsperandoA = z
  .enum(["CONSERVADOR", "NOTARIA", "MUNICIPALIDAD", "MAESTRO", "DUENO", "BANCO", "OTRO"])
  .meta({ id: "ResultadosEsperandoA", description: "A quién se esperaba." });
export type ResultadosEsperandoA = z.infer<typeof ResultadosEsperandoA>;

export const ResultadosCifras = z
  .object({
    serviciosCerrados: z.number().int().meta({ description: "Servicios terminados dentro del período." }),
    duracionPromedioDias: z.number().nullable().meta({ description: "Días promedio entre abrir y terminar un servicio. null si no se cerró ninguno." }),
    porcentajeEsperando: z.number().nullable().meta({ description: "Qué parte del tiempo de esos servicios estuvo esperando a otros (0 a 100). null si no se cerró ninguno." }),
    margenObras: Monto.nullable().meta({ description: "Lo cobrado al dueño menos lo facturado por los maestros, en las obras que tienen orden en pesos. null si ninguna la tiene." }),
    margenObrasPorcentaje: z.number().nullable().meta({ description: "Ese margen como porcentaje de lo cobrado al dueño." }),
  })
  .meta({ id: "ResultadosCifras", description: "Las cifras grandes de arriba." });
export type ResultadosCifras = z.infer<typeof ResultadosCifras>;

export const ResultadosSemana = z
  .object({
    semana: FechaISO.meta({ description: "El lunes de la semana." }),
    entran: z.number().int().meta({ description: "Servicios abiertos esa semana." }),
    cierran: z.number().int().meta({ description: "Servicios terminados esa semana." }),
  })
  .meta({ id: "ResultadosSemana", description: "Servicios que entran y que se cierran en una semana." });
export type ResultadosSemana = z.infer<typeof ResultadosSemana>;

export const ResultadosDiasPorTipo = z
  .object({
    tipo: ResultadosTipoServicio,
    servicios: z.number().int().meta({ description: "Cuántos servicios terminados de este tipo entran en el promedio." }),
    diasTrabajando: z.number().meta({ description: "Días promedio en que el servicio estaba en manos de Proges." }),
    diasEsperando: z.number().meta({ description: "Días promedio esperando a otros (conservador, notaría, maestro, dueño…)." }),
  })
  .meta({ id: "ResultadosDiasPorTipo", description: "Cuánto se demora un tipo de servicio, separando trabajar de esperar a otros." });
export type ResultadosDiasPorTipo = z.infer<typeof ResultadosDiasPorTipo>;

export const ResultadosObra = z
  .object({
    servicioId: Id,
    clienteId: Id,
    propiedad: z.string().meta({ description: "La dirección de la propiedad." }),
    estado: z.enum(["ABIERTO", "TERMINADO"]),
    costoAprobado: Monto.meta({ description: "Lo aprobado a los maestros (presupuesto original más adicionales)." }),
    facturado: Monto.meta({ description: "Lo que los maestros han facturado a esta obra." }),
    diferencia: Monto.meta({ description: "Facturado menos aprobado. Positivo: costó más de lo acordado." }),
    precioDueno: Monto.nullable().meta({ description: "Lo cobrado al dueño según su orden de venta; null si todavía no hay orden." }),
    margen: Monto.nullable().meta({ description: "Precio al dueño menos facturado; null si no hay orden en pesos." }),
  })
  .meta({ id: "ResultadosObra", description: "Una obra: lo acordado con el maestro contra lo facturado." });
export type ResultadosObra = z.infer<typeof ResultadosObra>;

export const ResultadosTareasPersona = z
  .object({
    usuarioId: Id,
    nombre: z.string(),
    hechasATiempo: z.number().int(),
    hechasTarde: z.number().int(),
    vencidasSinHacer: z.number().int(),
    porcentajeATiempo: z.number().nullable().meta({ description: "Hechas a tiempo sobre las que ya tenían que estar hechas (0 a 100). null si ninguna ha vencido." }),
  })
  .meta({ id: "ResultadosTareasPersona", description: "Cuántas tareas de una persona se hicieron a tiempo." });
export type ResultadosTareasPersona = z.infer<typeof ResultadosTareasPersona>;

export const Resultados = z
  .object({
    desde: FechaISO,
    hasta: FechaISO,
    cliente: Id.nullable().meta({ description: "El cliente del filtro; null si son todos." }),
    moneda: Moneda.meta({ description: "La moneda de las obras (hoy todo es en pesos)." }),
    cifras: ResultadosCifras,
    serviciosPorSemana: z.array(ResultadosSemana),
    diasPorTipo: z.array(ResultadosDiasPorTipo),
    obras: z.array(ResultadosObra),
    tareas: z.array(ResultadosTareasPersona),
  })
  .meta({ id: "Resultados", description: "Todo Resultados en una sola llamada, calculado al mirar." });
export type Resultados = z.infer<typeof Resultados>;
