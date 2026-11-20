// Contrato del área: cartera del dueño (arrendatarios, contratos de arriendo, cobros, gastos,
// contribuciones, movimientos), administración de arriendos y el resumen del dueño. Lo llena la pieza G.
//
// Es lo que un dueño lleva de su propiedad. El equipo de Proges puede hacerlo todo y un dueño
// (o la llave de su sistema, que solo lee) solo lo suyo: eso lo decide la API con los permisos,
// no este archivo.
//
// Cada esquema: `import { z } from "zod"`, sus descripciones con `.meta({ description })` y,
// si se nombra en /docs, `.meta({ id: "NombreUnico" })`. Lo común (Id, Monto, FechaISO, Pagina,
// ErrorRespuesta) se importa de "./comun". Ver apps/api/LEEME.md.
import { z } from "zod";
import { FechaISO, FechaHoraISO, Id, Moneda, Monto, PaginacionConsulta } from "./comun";

// ---------------------------------------------------------------------------
// Piezas que se repiten
// ---------------------------------------------------------------------------

// Un mes como «2026-11». Los cobros y las cuentas son siempre de un mes entero.
export const PeriodoCartera = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Escribe el mes como AAAA-MM.")
  .meta({ id: "PeriodoCartera", description: "Un mes, en formato AAAA-MM.", example: "2026-11" });
export type PeriodoCartera = z.infer<typeof PeriodoCartera>;

// Quién pide la lista. El equipo ve todos los clientes y puede filtrar por uno; un dueño o una
// llave siempre ven solo el suyo y este filtro se ignora.
const FiltroCliente = z
  .object({
    clienteId: Id.optional().meta({
      description: "Solo para el equipo de Proges: ver un solo cliente. Un dueño siempre ve lo suyo.",
    }),
  })
  .meta({ description: "Filtro por cliente." });

export const AjusteReajuste = z.enum(["NINGUNO", "IPC", "UF"]).meta({
  id: "CarteraTipoReajuste",
  description: "Cómo se reajusta el arriendo: NINGUNO (queda fijo), IPC o UF.",
});
export type AjusteReajuste = z.infer<typeof AjusteReajuste>;

export const EstadoCobro = z.enum(["PENDIENTE", "PAGADO", "ATRASADO"]).meta({
  id: "CarteraEstadoCobro",
  description: "PENDIENTE (aún no vence), PAGADO o ATRASADO (venció y no se pagó, o se marcó a mano).",
});
export type EstadoCobro = z.infer<typeof EstadoCobro>;

export const EstadoContrato = z.enum(["POR_EMPEZAR", "VIGENTE", "TERMINA", "TERMINADO", "VENCIDO"]).meta({
  id: "CarteraEstadoContrato",
  description:
    "POR_EMPEZAR (aún no parte), VIGENTE, TERMINA (tiene fecha de salida que no llega), TERMINADO (ya salió) o VENCIDO (llegó su término sin renovación automática).",
});
export type EstadoContrato = z.infer<typeof EstadoContrato>;

export const TipoCuenta = z.enum(["GASTO_COMUN", "LUZ", "AGUA", "GAS", "OTRO"]).meta({
  id: "CarteraTipoGasto",
  description: "Qué cuenta es: gasto común, luz, agua, gas u otra.",
});
export type TipoCuenta = z.infer<typeof TipoCuenta>;

export const EstadoPagoCuenta = z.enum(["PENDIENTE", "PAGADA"]).meta({
  id: "CarteraEstadoPago",
  description: "Si la cuenta o la cuota ya se pagó.",
});
export type EstadoPagoCuenta = z.infer<typeof EstadoPagoCuenta>;

export const TipoMovimiento = z.enum(["INGRESO", "GASTO"]).meta({
  id: "CarteraTipoMovimiento",
  description: "Si entró plata (INGRESO) o salió (GASTO).",
});
export type TipoMovimiento = z.infer<typeof TipoMovimiento>;

export const CategoriaMovimiento = z.enum(["ARRIENDO", "REPARACION", "GASTO_COMUN", "SEGURO", "IMPUESTO", "OTRO"]).meta({
  id: "CarteraCategoriaMovimiento",
  description: "En qué rubro cae el movimiento.",
});
export type CategoriaMovimiento = z.infer<typeof CategoriaMovimiento>;

// ---------------------------------------------------------------------------
// Arrendatarios (Tenant)
// ---------------------------------------------------------------------------

export const Arrendatario = z
  .object({
    id: Id,
    clienteId: Id.meta({ description: "El cliente (dueño) al que pertenece este arrendatario." }),
    nombre: z.string(),
    rut: z.string(),
    email: z.string().nullable(),
    telefono: z.string().nullable(),
  })
  .meta({ id: "Arrendatario", description: "Quien arrienda una propiedad (la persona o empresa que firma el contrato)." });
export type Arrendatario = z.infer<typeof Arrendatario>;

export const ArrendatarioEntrada = z
  .object({
    clienteId: Id.optional().meta({
      description: "Solo lo manda el equipo: para qué cliente es. Un dueño crea siempre en lo suyo.",
    }),
    nombre: z.string().trim().min(1, "El nombre es obligatorio."),
    rut: z.string().trim().min(1, "El RUT es obligatorio."),
    email: z.email({ error: "Escribe un correo válido." }).nullish(),
    telefono: z.string().trim().nullish(),
  })
  .meta({ id: "ArrendatarioEntrada", description: "Los datos para crear un arrendatario." });
export type ArrendatarioEntrada = z.infer<typeof ArrendatarioEntrada>;

export const ArrendatarioCambio = ArrendatarioEntrada.omit({ clienteId: true })
  .partial()
  .meta({ id: "ArrendatarioCambio", description: "Los campos de un arrendatario que se quieren cambiar (solo los que se manden)." });
export type ArrendatarioCambio = z.infer<typeof ArrendatarioCambio>;

export const ArrendatariosConsulta = PaginacionConsulta.extend(FiltroCliente.shape);

// ---------------------------------------------------------------------------
// Contratos de arriendo (LeaseContract)
// ---------------------------------------------------------------------------

export const Contrato = z
  .object({
    id: Id,
    clienteId: Id,
    propiedadId: Id,
    propiedadDireccion: z.string(),
    arrendatarioId: Id,
    arrendatarioNombre: z.string(),
    monto: Monto.meta({ description: "El arriendo mensual." }),
    reajusteTipo: AjusteReajuste,
    reajusteFrecuenciaMeses: z.number().int().nullable().meta({ description: "Cada cuántos meses se reajusta (vacío si no se reajusta)." }),
    ultimoReajuste: FechaISO.nullable(),
    proximoReajuste: FechaISO.nullable().meta({ description: "Cuándo toca el próximo reajuste (vacío si no se reajusta)." }),
    fechaInicio: FechaISO,
    fechaTermino: FechaISO.meta({ description: "El término del primer período, tal como se firmó." }),
    terminoVigente: FechaISO.meta({
      description: "El término del período en curso: con renovación automática avanza de a un plazo; con salida fijada es la salida.",
    }),
    fechaSalida: FechaISO.nullable().meta({ description: "Si hay, el contrato termina ese día y no se renueva." }),
    plazoMeses: z.number().int().meta({ description: "Duración de cada período y de cada renovación." }),
    renovacionAutomatica: z.boolean(),
    diasAviso: z.number().int().meta({ description: "Días antes del término para avisar que no se renueva." }),
    limiteAviso: FechaISO.meta({ description: "Último día para avisar que no se renueva." }),
    diaPago: z.number().int().meta({ description: "Día del mes en que vence cada cobro." }),
    garantia: Monto.nullable().meta({ description: "La garantía, en la moneda del arriendo." }),
    estado: EstadoContrato,
  })
  .meta({ id: "Contrato", description: "Un contrato de arriendo de una propiedad." });
export type Contrato = z.infer<typeof Contrato>;

// Los campos de un contrato, sin valores por defecto: de aquí salen la creación (que sí los tiene)
// y el cambio (que no puede tenerlos: mandar solo `monto` no debe volver a poner el reajuste en
// «ninguno»).
const ContratoCampos = z.object({
  propiedadId: Id,
  arrendatarioId: Id,
  monto: Monto.meta({ description: "El arriendo mensual; mayor que cero." }),
  reajusteTipo: AjusteReajuste,
  reajusteFrecuenciaMeses: z.number().int().min(1).nullish().meta({ description: "Cada cuántos meses se reajusta; obligatorio si hay reajuste." }),
  fechaInicio: FechaISO,
  fechaTermino: FechaISO,
  renovacionAutomatica: z.boolean(),
  diasAviso: z.number().int().min(0),
  plazoMeses: z.number().int().min(1).nullish().meta({ description: "Si no se manda al crear, se calcula entre el inicio y el término." }),
  garantia: Monto.nullish().meta({ description: "Debe venir en la misma moneda del arriendo." }),
  fechaSalida: FechaISO.nullish(),
  ultimoReajuste: FechaISO.nullish(),
  diaPago: z.number().int().min(1).max(31),
});

export const ContratoEntrada = ContratoCampos.extend({
  reajusteTipo: AjusteReajuste.default("NINGUNO"),
  renovacionAutomatica: z.boolean().default(true).meta({ description: "Se renueva sola por el mismo plazo salvo aviso." }),
  diasAviso: z.number().int().min(0).default(60),
}).meta({ id: "ContratoEntrada", description: "Los datos para crear un contrato de arriendo." });
export type ContratoEntrada = z.infer<typeof ContratoEntrada>;

export const ContratoCambio = ContratoCampos.partial().meta({
  id: "ContratoCambio",
  description: "Los campos del contrato que se quieren cambiar (solo los que se manden). Se revisan juntos con los que ya tenía.",
});
export type ContratoCambio = z.infer<typeof ContratoCambio>;

export const ContratosConsulta = PaginacionConsulta.extend({
  ...FiltroCliente.shape,
  propiedadId: Id.optional(),
  arrendatarioId: Id.optional(),
  estado: EstadoContrato.optional(),
});

export const ContratoTerminar = z
  .object({ fechaSalida: FechaISO })
  .meta({ id: "ContratoTerminar", description: "El día en que el arrendatario sale." });
export type ContratoTerminar = z.infer<typeof ContratoTerminar>;

export const ContratoReajustar = z
  .object({
    porcentaje: z.number().gt(0).max(100).meta({ description: "De cuánto sube el arriendo, en porcentaje (5 = 5 %)." }),
    fechaEfectiva: FechaISO.meta({ description: "Desde cuándo rige el arriendo nuevo; no puede ser de un mes futuro." }),
  })
  .meta({ id: "ContratoReajustar", description: "Aplica un reajuste: cambia el arriendo del contrato y de sus cobros sin pago." });
export type ContratoReajustar = z.infer<typeof ContratoReajustar>;

// ---------------------------------------------------------------------------
// Cobros de arriendo (RentCharge)
// ---------------------------------------------------------------------------

export const Cobro = z
  .object({
    id: Id,
    clienteId: Id,
    contratoId: Id,
    propiedadId: Id,
    propiedadDireccion: z.string(),
    arrendatarioNombre: z.string(),
    periodo: PeriodoCartera,
    montoEsperado: Monto,
    fechaVencimiento: FechaISO,
    estado: EstadoCobro.meta({
      description: "El estado real de hoy: un cobro sin pagar que ya venció sale ATRASADO aunque nadie lo haya marcado.",
    }),
    fechaPago: FechaISO.nullable(),
    montoPagado: Monto.nullable().meta({ description: "Lo abonado hasta ahora (suma de todos los pagos)." }),
    saldo: Monto.meta({ description: "Lo que falta por pagar; 0 si ya está cubierto." }),
    parcial: z.boolean().meta({ description: "Tiene abonos pero no está pagado entero." }),
    interesMora: Monto.nullable(),
    notas: z.string().nullable(),
  })
  .meta({ id: "Cobro", description: "El cobro del arriendo de un contrato en un mes." });
export type Cobro = z.infer<typeof Cobro>;

export const CobrosConsulta = PaginacionConsulta.extend({
  ...FiltroCliente.shape,
  mes: PeriodoCartera.optional(),
  estado: EstadoCobro.optional().meta({ description: "Filtra por el estado real de hoy (ver el campo `estado` del cobro)." }),
  propiedadId: Id.optional(),
  contratoId: Id.optional(),
});

export const CobrosAtrasadosConsulta = PaginacionConsulta.extend({
  ...FiltroCliente.shape,
  propiedadId: Id.optional(),
});

export const CobroPago = z
  .object({
    fechaPago: FechaISO,
    montoPagado: Monto.meta({ description: "Lo que se pagó ahora, en la moneda del cobro. Se suma a lo ya abonado." }),
    interesMora: Monto.nullish().meta({ description: "Interés por mora, si se cobra (reemplaza al anterior)." }),
    notas: z.string().trim().nullish().meta({ description: "Se agrega a las notas que ya tenía el cobro." }),
  })
  .meta({ id: "CobroPago", description: "Un pago (o abono) de un cobro. Lo puede anotar el equipo o el dueño." });
export type CobroPago = z.infer<typeof CobroPago>;

export const CobrosGenerar = z
  .object({
    mes: PeriodoCartera,
    clienteId: Id.optional().meta({ description: "Solo el equipo lo manda: para qué cliente se generan. Un dueño genera en lo suyo." }),
  })
  .meta({ id: "CobrosGenerar", description: "Pide crear los cobros de un mes para todos los contratos que lo cubren." });
export type CobrosGenerar = z.infer<typeof CobrosGenerar>;

export const CobrosGenerados = z
  .object({
    mes: PeriodoCartera,
    creados: z.number().int().meta({ description: "Cobros nuevos." }),
    yaExistian: z.number().int().meta({ description: "Contratos que ya tenían su cobro de ese mes (no se tocan)." }),
  })
  .meta({ id: "CobrosGenerados", description: "Cuántos cobros se crearon." });
export type CobrosGenerados = z.infer<typeof CobrosGenerados>;

// ---------------------------------------------------------------------------
// Gastos (PropertyBill): cuentas que el dueño paga por una propiedad
// ---------------------------------------------------------------------------

export const Gasto = z
  .object({
    id: Id,
    clienteId: Id,
    propiedadId: Id,
    tipo: TipoCuenta,
    periodo: PeriodoCartera,
    monto: Monto.nullable().meta({ description: "Vacío si todavía no se conoce el monto." }),
    fechaVencimiento: FechaISO,
    estado: EstadoPagoCuenta,
    fechaPago: FechaISO.nullable(),
    notas: z.string().nullable(),
    creadoEn: FechaHoraISO,
  })
  .meta({ id: "Gasto", description: "Una cuenta de una propiedad (gasto común, luz, agua, gas u otra)." });
export type Gasto = z.infer<typeof Gasto>;

export const GastoEntrada = z
  .object({
    propiedadId: Id,
    tipo: TipoCuenta,
    periodo: PeriodoCartera,
    monto: Monto.nullish(),
    fechaVencimiento: FechaISO,
    notas: z.string().trim().nullish(),
  })
  .meta({ id: "GastoEntrada", description: "Los datos para anotar un gasto. Queda anotado quién lo anotó." });
export type GastoEntrada = z.infer<typeof GastoEntrada>;

export const GastoCambio = z
  .object({
    tipo: TipoCuenta,
    periodo: PeriodoCartera,
    monto: Monto.nullable(),
    fechaVencimiento: FechaISO,
    notas: z.string().trim().nullable(),
    estado: EstadoPagoCuenta.meta({ description: "PAGADA exige `fechaPago`; PENDIENTE la borra." }),
    fechaPago: FechaISO.nullable(),
  })
  .partial()
  .meta({ id: "GastoCambio", description: "Los campos del gasto que se quieren cambiar (solo los que se manden). Así también se marca pagado." });
export type GastoCambio = z.infer<typeof GastoCambio>;

export const GastosConsulta = PaginacionConsulta.extend({
  ...FiltroCliente.shape,
  propiedadId: Id.optional(),
  periodo: PeriodoCartera.optional(),
  estado: EstadoPagoCuenta.optional(),
});

// ---------------------------------------------------------------------------
// Contribuciones (PropertyTax): el impuesto territorial, en cuatro cuotas al año
// ---------------------------------------------------------------------------

export const Contribucion = z
  .object({
    id: Id,
    clienteId: Id,
    propiedadId: Id,
    anio: z.number().int(),
    cuota: z.number().int().min(1).max(4),
    monto: Monto.nullable().meta({ description: "Siempre en pesos; vacío si todavía no se conoce." }),
    fechaVencimiento: FechaISO,
    estado: EstadoPagoCuenta,
    fechaPago: FechaISO.nullable(),
  })
  .meta({ id: "Contribucion", description: "Una cuota de las contribuciones (impuesto territorial) de una propiedad." });
export type Contribucion = z.infer<typeof Contribucion>;

export const ContribucionEntrada = z
  .object({
    propiedadId: Id,
    anio: z.number().int().min(2000).max(2100),
    cuota: z.number().int().min(1).max(4),
    monto: Monto.nullish().meta({ description: "Solo en pesos (CLP)." }),
  })
  .meta({ id: "ContribucionEntrada", description: "Los datos para anotar una cuota. El vencimiento se calcula con el calendario del SII." });
export type ContribucionEntrada = z.infer<typeof ContribucionEntrada>;

export const ContribucionCambio = z
  .object({
    monto: Monto.nullable(),
    estado: EstadoPagoCuenta.meta({ description: "PAGADA exige `fechaPago`; PENDIENTE la borra." }),
    fechaPago: FechaISO.nullable(),
  })
  .partial()
  .meta({ id: "ContribucionCambio", description: "Los campos de la cuota que se quieren cambiar. Así también se marca pagada." });
export type ContribucionCambio = z.infer<typeof ContribucionCambio>;

export const ContribucionesConsulta = PaginacionConsulta.extend({
  ...FiltroCliente.shape,
  propiedadId: Id.optional(),
  anio: z.coerce.number().int().optional(),
  estado: EstadoPagoCuenta.optional(),
});

export const ContribucionesGenerar = z
  .object({ anio: z.number().int().min(2000).max(2100) })
  .meta({ id: "ContribucionesGenerar", description: "El año del que se piden las cuatro cuotas." });
export type ContribucionesGenerar = z.infer<typeof ContribucionesGenerar>;

// ---------------------------------------------------------------------------
// Movimientos (Movement): el libro de ingresos y gastos de una propiedad
// ---------------------------------------------------------------------------

export const Movimiento = z
  .object({
    id: Id,
    clienteId: Id,
    propiedadId: Id,
    tipo: TipoMovimiento,
    categoria: CategoriaMovimiento,
    monto: Monto,
    fecha: FechaISO,
    descripcion: z.string().nullable(),
  })
  .meta({ id: "Movimiento", description: "Un ingreso o un gasto anotado en el libro de una propiedad." });
export type Movimiento = z.infer<typeof Movimiento>;

export const MovimientoEntrada = z
  .object({
    propiedadId: Id,
    tipo: TipoMovimiento,
    categoria: CategoriaMovimiento,
    monto: Monto.meta({ description: "Mayor que cero; el signo lo da `tipo`." }),
    fecha: FechaISO,
    descripcion: z.string().trim().nullish(),
  })
  .meta({ id: "MovimientoEntrada", description: "Los datos para anotar un movimiento." });
export type MovimientoEntrada = z.infer<typeof MovimientoEntrada>;

export const MovimientosConsulta = PaginacionConsulta.extend({
  ...FiltroCliente.shape,
  propiedadId: Id.optional(),
  tipo: TipoMovimiento.optional(),
  categoria: CategoriaMovimiento.optional(),
  desde: FechaISO.optional(),
  hasta: FechaISO.optional(),
});

// ---------------------------------------------------------------------------
// Administración de arriendos (Administracion)
// ---------------------------------------------------------------------------

export const Administracion = z
  .object({
    id: Id,
    clienteId: Id,
    propiedadId: Id,
    desde: FechaISO,
    hasta: FechaISO.nullable().meta({ description: "Vacío = sigue vigente." }),
    comisionPct: z.number().meta({ description: "El porcentaje de comisión (8 = 8 %)." }),
    vigente: z.boolean().meta({ description: "Sigue corriendo hoy: sin término, o con término que aún no pasa." }),
  })
  .meta({ id: "Administracion", description: "Un período en que Proges administra el arriendo de una propiedad." });
export type Administracion = z.infer<typeof Administracion>;

export const AdministracionEntrada = z
  .object({
    desde: FechaISO,
    comisionPct: z.number().gt(0).max(100),
  })
  .meta({ id: "AdministracionEntrada", description: "Pone una propiedad en administración. Solo el equipo." });
export type AdministracionEntrada = z.infer<typeof AdministracionEntrada>;

export const AdministracionCambio = z
  .object({
    desde: FechaISO,
    hasta: FechaISO.nullable().meta({ description: "Poner la fecha termina la administración; null la deja abierta." }),
    comisionPct: z.number().gt(0).max(100),
  })
  .partial()
  .meta({
    id: "AdministracionCambio",
    description: "Cambia la administración más reciente de la propiedad (solo los campos que se manden). Terminarla es mandar `hasta`.",
  });
export type AdministracionCambio = z.infer<typeof AdministracionCambio>;

export const EstadoArriendo = z.enum(["PAGADO", "ATRASADO", "POR_COBRAR", "SIN_COBRO", "FUERA"]).meta({
  id: "CarteraEstadoArriendo",
  description:
    "El estado de un mes de una propiedad administrada: PAGADO, ATRASADO, POR_COBRAR (aún no vence), SIN_COBRO (no se ha generado el cobro) o FUERA (el mes no está dentro de la administración).",
});
export type EstadoArriendo = z.infer<typeof EstadoArriendo>;

export const AdministracionMes = z
  .object({
    propiedadId: Id,
    propiedadDireccion: z.string(),
    clienteId: Id,
    periodo: PeriodoCartera,
    estado: EstadoArriendo,
    esperado: z.array(Monto).meta({ description: "Lo que se esperaba cobrar ese mes (un monto por moneda)." }),
    comision: z.array(Monto).meta({ description: "Lo que Proges factura por ese mes, sin mirar si el arriendo se pagó." }),
  })
  .meta({ id: "AdministracionMes", description: "La cuenta de un mes de una propiedad administrada." });
export type AdministracionMes = z.infer<typeof AdministracionMes>;

export const ComisionDelMes = z
  .object({
    mes: PeriodoCartera,
    propiedades: z.array(AdministracionMes),
    totalesPorCliente: z.array(
      z.object({
        clienteId: Id,
        clienteNombre: z.string(),
        total: z.array(Monto).meta({ description: "La comisión del mes de ese cliente, un monto por moneda." }),
      }),
    ),
  })
  .meta({ id: "ComisionDelMes", description: "La comisión de Proges por la administración de un mes, por propiedad y por cliente." });
export type ComisionDelMes = z.infer<typeof ComisionDelMes>;

export const ComisionConsulta = z.object({
  mes: PeriodoCartera.optional().meta({ description: "El mes (AAAA-MM). Si no se manda, el mes de hoy." }),
  ...FiltroCliente.shape,
});

// ---------------------------------------------------------------------------
// Resumen del dueño y valor de la cartera
// ---------------------------------------------------------------------------

export const ResumenCartera = z
  .object({
    mes: PeriodoCartera,
    arriendos: z.object({
      pagados: z.number().int().meta({ description: "Cobros del mes ya pagados." }),
      total: z.number().int().meta({ description: "Cobros del mes, en total." }),
      esperado: z.array(Monto).meta({ description: "Lo que se esperaba cobrar en el mes (un monto por moneda)." }),
      cobrado: z.array(Monto).meta({ description: "Lo que ya se cobró del mes (un monto por moneda)." }),
    }),
    gastos: z.object({
      cantidad: z.number().int().meta({ description: "Cuentas del mes." }),
      sinPagar: z.number().int().meta({ description: "De esas, cuántas siguen sin pagar." }),
      total: z.array(Monto).meta({ description: "Suma de las cuentas del mes que tienen monto (un monto por moneda)." }),
    }),
    atrasados: z.object({
      cantidad: z.number().int().meta({ description: "Cobros sin pagar que ya vencieron, de cualquier mes." }),
      saldo: z.array(Monto).meta({ description: "Lo que falta cobrar de esos cobros (un monto por moneda)." }),
    }),
  })
  .meta({ id: "ResumenCartera", description: "El inicio del dueño autónomo en una llamada: cómo va el mes." });
export type ResumenCartera = z.infer<typeof ResumenCartera>;

export const ResumenConsulta = z.object({
  mes: PeriodoCartera.optional().meta({ description: "El mes (AAAA-MM). Si no se manda, el mes de hoy." }),
  ...FiltroCliente.shape,
});

export const ValorCliente = z
  .object({
    clienteId: Id,
    clienteNombre: z.string(),
    propiedades: z.number().int(),
    propiedadesSinValor: z.number().int().meta({ description: "Propiedades que no tienen valor comercial (o no se pudo pasar a pesos)." }),
    valorComercial: Monto.meta({ description: "Suma del valor comercial, en pesos." }),
    deuda: Monto.meta({ description: "Suma de la deuda hipotecaria, en pesos." }),
    valorNeto: Monto.meta({ description: "Valor comercial menos deuda, en pesos." }),
    deudasSinConvertir: z.number().int().meta({ description: "Deudas en UF que no se pudieron pasar a pesos por falta del valor de la UF." }),
  })
  .meta({ id: "ValorCliente", description: "Lo que vale la cartera de un cliente y lo que debe." });
export type ValorCliente = z.infer<typeof ValorCliente>;

export const ValorCartera = z
  .object({
    valorUf: z.string().nullable().meta({ description: "El valor de la UF (en pesos) con que se convirtió; vacío si no hay." }),
    moneda: Moneda,
    clientes: z.array(ValorCliente),
    total: z.object({
      propiedades: z.number().int(),
      valorComercial: Monto,
      deuda: Monto,
      valorNeto: Monto,
    }),
  })
  .meta({ id: "ValorCartera", description: "El valor de la cartera y las deudas por cliente, en pesos." });
export type ValorCartera = z.infer<typeof ValorCartera>;

export const ValorConsulta = FiltroCliente;
