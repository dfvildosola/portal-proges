// Administración de arriendos: las cuentas del mes, como funciones puras (ADR 0012, punto 3).
//
// Cuando Proges «administra» el arriendo de una propiedad, el arrendatario le paga directo al
// dueño. Proges no toca esa plata: lleva la lista de quién pagó y quién no (el conserje que
// no cobra los gastos comunes pero sabe quién está al día), y por ese control cobra una
// comisión: un porcentaje del arriendo de cada mes. Esa comisión se factura en Odoo.
//
// Todo lo de acá es puro (no lee la base ni la sesión): recibe los datos ya leídos y la fecha
// de «hoy». Así la pantalla de Administración, la ficha de la propiedad y la prueba hacen la
// misma cuenta, y la cuenta vive en un solo lugar. Las consultas están aparte, en
// src/app/(app)/administracion/consultas.ts.
//
// Reglas (se escribieron desde el diseño de Diego; se revisan con la primera propiedad real):
//  - Un mes está «dentro» de la administración si toca el rango desde..hasta en algún día. Se
//    compara por mes: la comisión es del arriendo del mes completo, sin prorratear.
//  - La comisión es monto esperado × porcentaje, en la moneda del cobro (CLP entero, UF con
//    dos decimales), sin mirar si el arriendo se pagó: es lo que Proges factura por el mes.
//  - «Atrasado» es un cobro sin pagar que ya venció según hoyChile(), o que alguien marcó
//    atrasado a mano. Un cobro sin pagar que aún no vence está «por cobrar».

import { formatMoney } from "@/lib/format";

export type Moneda = "CLP" | "UF";

// Lo que se necesita de una administración (la fila de la base, con los números ya como number).
export type AdministracionDato = {
  desde: Date; // fecha civil (medianoche UTC)
  hasta: Date | null; // vacío = sigue vigente
  comisionPct: number; // 8 significa 8%
};

// Lo que se necesita de un cobro de arriendo (RentCharge).
export type CobroDato = {
  periodo: string; // "AAAA-MM"
  montoEsperado: number;
  moneda: Moneda;
  fechaVencimiento: Date;
  estado: "PENDIENTE" | "PAGADO" | "ATRASADO";
};

export type MontoEnMoneda = { moneda: Moneda; monto: number };

// El estado de un cobro (o de un mes entero) visto desde la administración.
// FUERA: el mes no está dentro de la administración. SIN_COBRO: está dentro pero todavía no se
// generó el cobro en la cobranza.
export type EstadoArriendo = "PAGADO" | "ATRASADO" | "POR_COBRAR" | "SIN_COBRO" | "FUERA";

export type MesAdministrado = {
  periodo: string;
  estado: EstadoArriendo;
  esperado: MontoEnMoneda[]; // lo que se esperaba cobrar ese mes
  comision: MontoEnMoneda[]; // lo que Proges factura por ese mes
};

// Redondeo de plata: CLP entero, UF con 2 decimales (el mismo criterio de src/lib/cobros.ts).
function redondear(monto: number, moneda: Moneda): number {
  return moneda === "UF" ? Math.round((monto + Number.EPSILON) * 100) / 100 : Math.round(monto);
}

// "AAAA-MM" de una fecha civil (medianoche UTC).
export function periodoDe(fecha: Date): string {
  return fecha.toISOString().slice(0, 7);
}

// Los últimos `n` meses que terminan en `hasta` ("AAAA-MM"), del más antiguo al más nuevo.
export function ultimosMeses(hasta: string, n: number): string[] {
  const [anio, mes] = hasta.split("-").map(Number);
  const meses: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(anio, mes - 1 - i, 1));
    meses.push(periodoDe(d));
  }
  return meses;
}

// ¿Está el mes dentro de la administración? Compara por mes (ver reglas arriba).
export function mesEnAdministracion(adm: AdministracionDato, periodo: string): boolean {
  if (periodo < periodoDe(adm.desde)) return false;
  if (adm.hasta && periodo > periodoDe(adm.hasta)) return false;
  return true;
}

// ¿Sigue vigente hoy? Sin fecha de término, o con término que aún no pasa.
export function administracionVigente(adm: AdministracionDato, hoy: Date): boolean {
  return adm.hasta === null || adm.hasta >= hoy;
}

// El estado de un cobro. PAGADO manda; después, ATRASADO si lo marcaron a mano o ya venció.
export function estadoDelCobro(
  cobro: Pick<CobroDato, "estado" | "fechaVencimiento">,
  hoy: Date,
): Exclude<EstadoArriendo, "SIN_COBRO" | "FUERA"> {
  if (cobro.estado === "PAGADO") return "PAGADO";
  if (cobro.estado === "ATRASADO" || cobro.fechaVencimiento < hoy) return "ATRASADO";
  return "POR_COBRAR";
}

// La comisión de un cobro: monto esperado × porcentaje. 0 si el mes está fuera de la administración.
export function comisionDelCobro(adm: AdministracionDato, cobro: CobroDato): number {
  if (!mesEnAdministracion(adm, cobro.periodo)) return 0;
  return redondear((cobro.montoEsperado * adm.comisionPct) / 100, cobro.moneda);
}

// Suma montos agrupándolos por moneda (nunca se mezclan CLP y UF). Sale CLP primero.
export function sumarPorMoneda(montos: MontoEnMoneda[]): MontoEnMoneda[] {
  const total = new Map<Moneda, number>();
  for (const m of montos) total.set(m.moneda, (total.get(m.moneda) ?? 0) + m.monto);
  return (["CLP", "UF"] as const)
    .filter((moneda) => total.has(moneda))
    .map((moneda) => ({ moneda, monto: redondear(total.get(moneda) ?? 0, moneda) }));
}

// El estado de un mes con uno o varios cobros (dos contratos pueden tocar el mismo mes):
// basta un atrasado para que el mes esté atrasado; pagado solo si todos están pagados.
function estadoDelMes(estados: EstadoArriendo[]): EstadoArriendo {
  if (estados.length === 0) return "SIN_COBRO";
  if (estados.includes("ATRASADO")) return "ATRASADO";
  if (estados.includes("POR_COBRAR")) return "POR_COBRAR";
  return "PAGADO";
}

// La cuenta de un mes de una propiedad administrada.
export function cuentaDelMes(
  adm: AdministracionDato,
  cobros: CobroDato[],
  periodo: string,
  hoy: Date,
): MesAdministrado {
  if (!mesEnAdministracion(adm, periodo)) {
    return { periodo, estado: "FUERA", esperado: [], comision: [] };
  }
  const delMes = cobros.filter((c) => c.periodo === periodo);
  return {
    periodo,
    estado: estadoDelMes(delMes.map((c) => estadoDelCobro(c, hoy))),
    esperado: sumarPorMoneda(delMes.map((c) => ({ moneda: c.moneda, monto: c.montoEsperado }))),
    comision: sumarPorMoneda(delMes.map((c) => ({ moneda: c.moneda, monto: comisionDelCobro(adm, c) }))),
  };
}

// La cuenta de varios meses seguidos (la ficha muestra los últimos 6).
export function cuentaDeMeses(
  adm: AdministracionDato,
  cobros: CobroDato[],
  periodos: string[],
  hoy: Date,
): MesAdministrado[] {
  return periodos.map((p) => cuentaDelMes(adm, cobros, p, hoy));
}

// Los meses atrasados de una propiedad administrada: todos los cobros dentro de la
// administración que están sin pagar y vencidos. Sirve para la lista «Atrasados».
export function cobrosAtrasados(adm: AdministracionDato, cobros: CobroDato[], hoy: Date): CobroDato[] {
  return cobros
    .filter((c) => mesEnAdministracion(adm, c.periodo) && estadoDelCobro(c, hoy) === "ATRASADO")
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

// Las comisiones del mes agrupadas por cliente (lo que se factura en Odoo, una factura por
// cliente). Cada fila trae el cliente y la comisión de una propiedad ya calculada.
export function comisionesPorCliente(
  filas: { clienteId: string; comision: MontoEnMoneda[] }[],
): { clienteId: string; total: MontoEnMoneda[] }[] {
  const porCliente = new Map<string, MontoEnMoneda[]>();
  for (const f of filas) {
    porCliente.set(f.clienteId, [...(porCliente.get(f.clienteId) ?? []), ...f.comision]);
  }
  return [...porCliente.entries()].map(([clienteId, montos]) => ({
    clienteId,
    total: sumarPorMoneda(montos),
  }));
}

// Los montos de un mes como texto para la pantalla: «320.000 CLP», o «—» si no hay ninguno.
// Si hay más de una moneda se separan con « + » (nunca se suman CLP con UF).
export function textoMontos(montos: MontoEnMoneda[]): string {
  if (montos.length === 0) return "—";
  return montos.map((m) => formatMoney(m.monto, m.moneda)).join(" + ");
}

// Etiquetas de cada estado, para la ficha y para /administracion.
export const estadoArriendoLabels: Record<EstadoArriendo, string> = {
  PAGADO: "Pagado",
  ATRASADO: "Atrasado",
  POR_COBRAR: "Por cobrar",
  SIN_COBRO: "Sin cobro",
  FUERA: "Fuera",
};

// El color (variante de Badge) de cada estado.
export const estadoArriendoVariant: Record<EstadoArriendo, "success" | "destructive" | "warning" | "outline" | "ghost"> = {
  PAGADO: "success",
  ATRASADO: "destructive",
  POR_COBRAR: "warning",
  SIN_COBRO: "outline",
  FUERA: "ghost",
};
