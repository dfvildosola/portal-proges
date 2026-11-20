// Lo que llega de la web, revisado antes de guardar: las reglas que zod no puede decir solas
// porque miran varios campos a la vez (el término no puede ser anterior al inicio) o miran lo
// que el registro ya tenía (un cambio parcial se revisa junto con el resto del contrato).
//
// Todo es puro: no toca la base. Si algo está mal se lanza un ErrorApi 400 con los campos que hay
// que arreglar, igual que cuando zod rechaza el cuerpo.
import { Prisma } from "@proges/db";
import type { ContratoEntrada, FechaISO, Monto } from "@proges/contrato";
import { ErrorApi } from "../../errores";
import { aFechaISO } from "../../util/al-contrato";

// ---------------------------------------------------------------------------
// Fechas y montos
// ---------------------------------------------------------------------------

// «2026-11-19» → medianoche UTC de ese día (la convención de las fechas «solo fecha»).
export function deFechaISO(fecha: FechaISO): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

export function deFechaISOONull(fecha: FechaISO | null | undefined): Date | null {
  return fecha ? deFechaISO(fecha) : null;
}

export function aDecimal(monto: Monto): Prisma.Decimal {
  return new Prisma.Decimal(monto.valor);
}

// Un monto que se guarda tiene que ser mayor que cero (arriendo, pago, movimiento).
export function exigirMontoPositivo(monto: Monto, campo: string): void {
  if (!(aDecimal(monto).gt(0))) {
    throw new ErrorApi(400, "Revisa los campos.", { [campo]: "Debe ser mayor que cero." });
  }
}

// Un monto opcional que puede ser cero (una cuenta, una cuota) pero no negativo ni absurdo.
export function exigirMontoValido(monto: Monto | null | undefined, campo: string): void {
  if (!monto) return;
  const d = aDecimal(monto);
  if (d.lt(0) || d.gte(1e12)) {
    throw new ErrorApi(400, "Revisa los campos.", { [campo]: "Debe ser un monto válido (cero o más)." });
  }
}

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

// Un contrato completo, con los defaults ya puestos: es lo que se revisa y se guarda. Las fechas
// van como «AAAA-MM-DD»: ese texto se ordena igual que las fechas, así que se comparan con < y >.
export type ContratoCompleto = ContratoEntrada;

// Las reglas de un contrato (las mismas del formulario del portal viejo). Devuelve los campos
// con problema; vacío = todo bien.
export function problemasDelContrato(d: ContratoCompleto): Record<string, string> {
  const campos: Record<string, string> = {};
  if (!aDecimal(d.monto).gt(0)) campos.monto = "Debe ser mayor que cero.";
  if (d.fechaTermino < d.fechaInicio) campos.fechaTermino = "El término no puede ser anterior al inicio.";
  const reajusta = d.reajusteTipo !== "NINGUNO";
  if (reajusta && !d.reajusteFrecuenciaMeses) {
    campos.reajusteFrecuenciaMeses = "Indica cada cuántos meses se reajusta.";
  }
  if (d.fechaSalida && d.fechaSalida < d.fechaInicio) campos.fechaSalida = "La salida no puede ser anterior al inicio.";
  // Puede ser futura: «reajustar» guarda la fecha efectiva, que suele ser la del próximo reajuste.
  if (reajusta && d.ultimoReajuste && d.ultimoReajuste < d.fechaInicio) {
    campos.ultimoReajuste = "El reajuste no puede ser anterior al inicio.";
  }
  if (d.garantia) {
    if (d.garantia.moneda !== d.monto.moneda) campos.garantia = "La garantía va en la misma moneda del arriendo.";
    else if (aDecimal(d.garantia).lt(0)) campos.garantia = "No puede ser negativa.";
  }
  return campos;
}

export function exigirContratoValido(d: ContratoCompleto): void {
  const campos = problemasDelContrato(d);
  if (Object.keys(campos).length > 0) throw new ErrorApi(400, "Revisa los campos.", campos);
}

// Los datos que se guardan en la base a partir de un contrato ya revisado. `modificadoPorId` es
// quien guarda (el equipo y el dueño editan lo mismo: vale el último, y queda quién fue).
// `plazoEnMeses` calcula el plazo cuando no se mandó (es la función de contratos.ts).
export function datosDeContrato(
  d: ContratoCompleto,
  modificadoPorId: string,
  plazoEnMeses: (inicio: Date, termino: Date) => number,
) {
  const aplicaReajuste = d.reajusteTipo !== "NINGUNO";
  const fechaInicio = deFechaISO(d.fechaInicio);
  const fechaTermino = deFechaISO(d.fechaTermino);
  return {
    propertyId: d.propiedadId,
    tenantId: d.arrendatarioId,
    monto: aDecimal(d.monto),
    moneda: d.monto.moneda,
    aplicaReajuste,
    reajusteTipo: d.reajusteTipo,
    // La frecuencia y el último reajuste solo tienen sentido si hay reajuste.
    reajusteFrecuenciaMeses: aplicaReajuste ? (d.reajusteFrecuenciaMeses ?? null) : null,
    ultimoReajuste: aplicaReajuste ? deFechaISOONull(d.ultimoReajuste) : null,
    fechaInicio,
    fechaTermino,
    fechaSalida: deFechaISOONull(d.fechaSalida),
    diaPago: d.diaPago,
    renovacionAutomatica: d.renovacionAutomatica,
    diasAviso: d.diasAviso,
    plazoMeses: d.plazoMeses ?? plazoEnMeses(fechaInicio, fechaTermino),
    garantia: d.garantia ? aDecimal(d.garantia) : null,
    modificadoPorId,
  };
}

// El contrato que ya existe, escrito con la forma de lo que llega (para mezclarlo con un cambio).
export function contratoComoEntrada(c: {
  propertyId: string;
  tenantId: string;
  monto: Prisma.Decimal;
  moneda: Monto["moneda"];
  reajusteTipo: ContratoEntrada["reajusteTipo"];
  reajusteFrecuenciaMeses: number | null;
  ultimoReajuste: Date | null;
  fechaInicio: Date;
  fechaTermino: Date;
  fechaSalida: Date | null;
  diaPago: number;
  renovacionAutomatica: boolean;
  diasAviso: number;
  plazoMeses: number;
  garantia: Prisma.Decimal | null;
}): ContratoCompleto {
  return {
    propiedadId: c.propertyId,
    arrendatarioId: c.tenantId,
    monto: { valor: c.monto.toFixed(), moneda: c.moneda },
    reajusteTipo: c.reajusteTipo,
    reajusteFrecuenciaMeses: c.reajusteFrecuenciaMeses,
    ultimoReajuste: c.ultimoReajuste ? aFechaISO(c.ultimoReajuste) : null,
    fechaInicio: aFechaISO(c.fechaInicio),
    fechaTermino: aFechaISO(c.fechaTermino),
    fechaSalida: c.fechaSalida ? aFechaISO(c.fechaSalida) : null,
    diaPago: c.diaPago,
    renovacionAutomatica: c.renovacionAutomatica,
    diasAviso: c.diasAviso,
    plazoMeses: c.plazoMeses,
    garantia: c.garantia ? { valor: c.garantia.toFixed(), moneda: c.moneda } : null,
  };
}

// ---------------------------------------------------------------------------
// Marcar pagada una cuenta o una cuota
// ---------------------------------------------------------------------------

// Un gasto o una contribución cambian de PENDIENTE a PAGADA con su fecha de pago. Regla: PAGADA
// necesita fecha de pago; PENDIENTE no puede tenerla. Devuelve cómo queda; lanza 400 si no cuadra.
export function resolverPago(
  actual: { estado: "PENDIENTE" | "PAGADA"; fechaPago: Date | null },
  cambio: { estado?: "PENDIENTE" | "PAGADA"; fechaPago?: FechaISO | null },
): { estado: "PENDIENTE" | "PAGADA"; fechaPago: Date | null } {
  const estado = cambio.estado ?? actual.estado;
  const fechaPago = cambio.fechaPago !== undefined ? deFechaISOONull(cambio.fechaPago) : actual.fechaPago;
  if (estado === "PAGADA" && !fechaPago) {
    throw new ErrorApi(400, "Revisa los campos.", { fechaPago: "Escribe la fecha en que se pagó." });
  }
  if (estado === "PENDIENTE" && cambio.fechaPago) {
    throw new ErrorApi(400, "Revisa los campos.", { fechaPago: "Algo pendiente no tiene fecha de pago." });
  }
  return { estado, fechaPago: estado === "PENDIENTE" ? null : fechaPago };
}
