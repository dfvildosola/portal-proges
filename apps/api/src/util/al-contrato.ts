// Conversiones de lo que guarda la base a lo que dice el contrato. Las rutas las usan al armar
// cada respuesta, para que la plata y las fechas salgan iguales en todos los endpoints.
//
// - Plata: la base guarda Decimal; el contrato la entrega como texto con su moneda
//   ({ valor: "1500000", moneda: "CLP" }), nunca como número (un número redondea decimales).
// - Fechas «solo fecha»: se guardan a medianoche UTC, así que se leen en UTC («2026-11-19»).
//   Nunca con métodos locales: el Mac está en hora de Chile y daría el día anterior.
// - Momentos (cuándo se creó algo): ISO completo en UTC.
import { Prisma, type Currency, type ModoCliente, type UsuarioRol } from "@proges/db";
import type * as contrato from "@proges/contrato";

export function aMonto(valor: Prisma.Decimal | number | string, moneda: Currency): contrato.Monto {
  return { valor: new Prisma.Decimal(valor).toFixed(), moneda };
}

export function aFechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function aFechaHoraISO(fecha: Date): string {
  return fecha.toISOString();
}

// Comprobaciones al compilar: las listas del contrato (que no puede importar la base, porque la
// web lo usa) tienen que calzar exacto con los enums de la base. Si alguien agrega una moneda
// o un rol en un lado y no en el otro, `npm run tipos` falla aquí.
type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const monedasCalzan: Iguales<Currency, contrato.Moneda> = true;
const rolesCalzan: Iguales<UsuarioRol, contrato.Rol> = true;
const modosCalzan: Iguales<ModoCliente, contrato.ModoCliente> = true;
void [monedasCalzan, rolesCalzan, modosCalzan];
