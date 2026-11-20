// Lo que sale de la cartera hacia la web o hacia el sistema de un cliente (la «función de recorte»
// de LEEME.md, «La regla de oro»).
//
// Cada función arma un objeto NUEVO, campo por campo, con el tipo del contrato como tipo de
// retorno: nunca `{ ...registro }`. Así, si mañana la base gana un campo interno (quién guardó,
// una nota del equipo), no se cuela solo hacia el dueño. Por eso `modificadoPorId` y `anotadoPorId`
// se guardan pero no salen: son datos de Proges, no del dueño.
import type {
  Administracion as AdministracionBD,
  AdjustmentType,
  BillStatus,
  BillType,
  ChargeStatus,
  MovementCategory,
  MovementType,
  Movement,
  PropertyBill,
  PropertyTax,
  TaxStatus,
  Tenant,
} from "@proges/db";
import type * as contrato from "@proges/contrato";
import { aFechaHoraISO, aFechaISO, aMonto } from "../../util/al-contrato";
import { estadoDelCobro, administracionVigente, type MontoEnMoneda } from "./administracion";
import { esParcial, saldoCobroDecimal } from "./cobros";
import type { CobroLeido, ContratoLeido } from "./consultas";
import { estadoContrato, fechaLimiteAviso, proximoReajuste, terminoVigente } from "./contratos";

// Comprobaciones al compilar: las listas del contrato (que no puede importar la base, porque la
// web lo usa) tienen que calzar exacto con los enums de la base. Si alguien agrega un valor en un
// lado y no en el otro, `npm run tipos` falla aquí.
type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const reajusteCalza: Iguales<AdjustmentType, contrato.AjusteReajuste> = true;
const cobroCalza: Iguales<ChargeStatus, contrato.EstadoCobro> = true;
const cuentaCalza: Iguales<BillType, contrato.TipoCuenta> = true;
const pagoCuentaCalza: Iguales<BillStatus, contrato.EstadoPagoCuenta> = true;
const pagoCuotaCalza: Iguales<TaxStatus, contrato.EstadoPagoCuenta> = true;
const tipoMovCalza: Iguales<MovementType, contrato.TipoMovimiento> = true;
const categoriaMovCalza: Iguales<MovementCategory, contrato.CategoriaMovimiento> = true;
void [reajusteCalza, cobroCalza, cuentaCalza, pagoCuentaCalza, pagoCuotaCalza, tipoMovCalza, categoriaMovCalza];

const aFechaONull = (f: Date | null): string | null => (f ? aFechaISO(f) : null);

export function arrendatarioParaDueno(t: Tenant): contrato.Arrendatario {
  return {
    id: t.id,
    clienteId: t.organizationId,
    nombre: t.nombre,
    rut: t.rut,
    email: t.email,
    telefono: t.telefono,
  };
}

export function contratoParaDueno(c: ContratoLeido, hoy: Date): contrato.Contrato {
  const proximo = proximoReajuste(c);
  return {
    id: c.id,
    clienteId: c.organizationId,
    propiedadId: c.propertyId,
    propiedadDireccion: c.property.direccion,
    arrendatarioId: c.tenantId,
    arrendatarioNombre: c.tenant.nombre,
    monto: aMonto(c.monto, c.moneda),
    reajusteTipo: c.reajusteTipo,
    reajusteFrecuenciaMeses: c.reajusteFrecuenciaMeses,
    ultimoReajuste: aFechaONull(c.ultimoReajuste),
    proximoReajuste: proximo ? aFechaISO(proximo) : null,
    fechaInicio: aFechaISO(c.fechaInicio),
    fechaTermino: aFechaISO(c.fechaTermino),
    terminoVigente: aFechaISO(terminoVigente(c, hoy)),
    fechaSalida: aFechaONull(c.fechaSalida),
    plazoMeses: c.plazoMeses,
    renovacionAutomatica: c.renovacionAutomatica,
    diasAviso: c.diasAviso,
    limiteAviso: aFechaISO(fechaLimiteAviso(c, hoy)),
    diaPago: c.diaPago,
    garantia: c.garantia ? aMonto(c.garantia, c.moneda) : null,
    estado: estadoContrato(c, hoy),
  };
}

export function cobroParaDueno(c: CobroLeido, hoy: Date): contrato.Cobro {
  const real = estadoDelCobro(c, hoy);
  return {
    id: c.id,
    clienteId: c.organizationId,
    contratoId: c.contractId,
    propiedadId: c.contract.propertyId,
    propiedadDireccion: c.contract.property.direccion,
    arrendatarioNombre: c.contract.tenant.nombre,
    periodo: c.periodo,
    montoEsperado: aMonto(c.montoEsperado, c.moneda),
    fechaVencimiento: aFechaISO(c.fechaVencimiento),
    estado: real === "POR_COBRAR" ? "PENDIENTE" : real,
    fechaPago: aFechaONull(c.fechaPago),
    montoPagado: c.montoPagado ? aMonto(c.montoPagado, c.moneda) : null,
    saldo: aMonto(saldoCobroDecimal(c), c.moneda),
    parcial: esParcial(c),
    interesMora: c.interesMora ? aMonto(c.interesMora, c.moneda) : null,
    notas: c.notas,
  };
}

export function gastoParaDueno(g: PropertyBill): contrato.Gasto {
  return {
    id: g.id,
    clienteId: g.organizationId,
    propiedadId: g.propertyId,
    tipo: g.tipo,
    periodo: g.periodo,
    monto: g.monto ? aMonto(g.monto, g.moneda) : null,
    fechaVencimiento: aFechaISO(g.fechaVencimiento),
    estado: g.estado,
    fechaPago: aFechaONull(g.fechaPago),
    notas: g.notas,
    creadoEn: aFechaHoraISO(g.createdAt),
  };
}

// Las contribuciones se anotan siempre en pesos: la base no guarda moneda para ellas.
export function contribucionParaDueno(t: PropertyTax): contrato.Contribucion {
  return {
    id: t.id,
    clienteId: t.organizationId,
    propiedadId: t.propertyId,
    anio: t.anio,
    cuota: t.cuota,
    monto: t.monto ? aMonto(t.monto, "CLP") : null,
    fechaVencimiento: aFechaISO(t.fechaVencimiento),
    estado: t.estado,
    fechaPago: aFechaONull(t.fechaPago),
  };
}

export function movimientoParaDueno(m: Movement): contrato.Movimiento {
  return {
    id: m.id,
    clienteId: m.organizationId,
    propiedadId: m.propertyId,
    tipo: m.tipo,
    categoria: m.categoria,
    monto: aMonto(m.monto, m.moneda),
    fecha: aFechaISO(m.fecha),
    descripcion: m.descripcion,
  };
}

export function administracionParaDueno(a: AdministracionBD, hoy: Date): contrato.Administracion {
  return {
    id: a.id,
    clienteId: a.organizationId,
    propiedadId: a.propertyId,
    desde: aFechaISO(a.desde),
    hasta: aFechaONull(a.hasta),
    comisionPct: Number(a.comisionPct),
    vigente: administracionVigente({ desde: a.desde, hasta: a.hasta, comisionPct: Number(a.comisionPct) }, hoy),
  };
}

// Una lista de montos por moneda (lo que calculan las funciones puras) como lo entrega el contrato.
export function montosParaDueno(montos: MontoEnMoneda[]): contrato.Monto[] {
  return montos.map((m) => aMonto(m.monto, m.moneda));
}
