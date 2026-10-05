import type { LeaseContract, Prisma } from "@/generated/prisma/client";
import { rangoDelMes, sumarDias, sumarMeses } from "./fechas";

// Lo mínimo que necesitan estas funciones: se pueden llamar con un `select` parcial.
export type ContratoFechas = Pick<
  LeaseContract,
  | "fechaInicio"
  | "fechaTermino"
  | "fechaSalida"
  | "renovacionAutomatica"
  | "plazoMeses"
>;
export type ContratoAviso = ContratoFechas & Pick<LeaseContract, "diasAviso">;
export type ContratoReajuste = Pick<
  LeaseContract,
  | "aplicaReajuste"
  | "reajusteFrecuenciaMeses"
  | "ultimoReajuste"
  | "fechaInicio"
>;

export type EstadoContrato =
  | "POR_EMPEZAR"
  | "VIGENTE"
  | "TERMINA"
  | "TERMINADO"
  | "VENCIDO";

const DIAS_POR_MES = 30.4375;

// Meses entre dos fechas (mínimo 1). Misma regla que usó la migración.
export function plazoEnMeses(inicio: Date, termino: Date): number {
  const dias = (termino.getTime() - inicio.getTime()) / 86_400_000;
  return Math.max(1, Math.round(dias / DIAS_POR_MES));
}

// Término del período en curso. Con renovación automática se avanza el término
// guardado de a un plazo (siempre desde `fechaTermino`, con k·plazo, para no
// arrastrar el recorte de fin de mes) hasta pasar hoy.
export function terminoVigente(c: ContratoFechas, hoy: Date): Date {
  if (c.fechaSalida) return c.fechaSalida;
  if (!c.renovacionAutomatica) return c.fechaTermino;
  for (let k = 0; ; k++) {
    const t = sumarMeses(c.fechaTermino, k * c.plazoMeses);
    if (t >= hoy) return t;
  }
}

// Último día en que se puede avisar que no se renueva.
export function fechaLimiteAviso(c: ContratoAviso, hoy: Date): Date {
  return sumarDias(terminoVigente(c, hoy), -c.diasAviso);
}

export function estadoContrato(c: ContratoFechas, hoy: Date): EstadoContrato {
  if (c.fechaInicio > hoy) return "POR_EMPEZAR";
  if (c.fechaSalida) return c.fechaSalida < hoy ? "TERMINADO" : "TERMINA";
  if (!c.renovacionAutomatica && c.fechaTermino < hoy) return "VENCIDO";
  return "VIGENTE";
}

// «Vigente» en el sentido de hoy: corre el contrato (aunque ya tenga salida fijada).
export function estaVigente(c: ContratoFechas, hoy: Date): boolean {
  const e = estadoContrato(c, hoy);
  return e === "VIGENTE" || e === "TERMINA";
}

// Fecha del próximo reajuste, o null si el contrato no reajusta.
export function proximoReajuste(c: ContratoReajuste): Date | null {
  if (!c.aplicaReajuste || !c.reajusteFrecuenciaMeses) return null;
  return sumarMeses(c.ultimoReajuste ?? c.fechaInicio, c.reajusteFrecuenciaMeses);
}

// Contratos vigentes en una fecha; dice lo mismo que `estadoContrato`: una
// salida fijada manda sobre el término. Lleva un `OR` propio: quien lo combine
// con otro `OR` debe anidarlo (`AND: [whereVigenteEn(hoy), ...]`) y no hacer
// spread, para no pisarlo.
export function whereVigenteEn(fecha: Date): Prisma.LeaseContractWhereInput {
  return {
    fechaInicio: { lte: fecha },
    OR: [
      { fechaSalida: { gte: fecha } },
      {
        fechaSalida: null,
        OR: [{ renovacionAutomatica: true }, { fechaTermino: { gte: fecha } }],
      },
    ],
  };
}

// Contratos que deben tener cobro en ese mes. Mismo cuidado con `OR` que arriba.
export function whereCubreMes(mes: string): Prisma.LeaseContractWhereInput {
  const { inicio, fin } = rangoDelMes(mes);
  return {
    fechaInicio: { lte: fin },
    OR: [
      { fechaSalida: { gte: inicio } },
      {
        fechaSalida: null,
        OR: [{ renovacionAutomatica: true }, { fechaTermino: { gte: inicio } }],
      },
    ],
  };
}

// Nuevo término al renovar: un plazo más allá del término vigente; si aun así
// queda antes de hoy (contrato vencido hace mucho), sigue de a plazo. Siempre
// se calcula como k·plazo desde `fechaTermino` (sin acumular recortes de fin de
// mes): el primer resultado con k ≥ 1 que sea mayor que el término vigente y
// no anterior a hoy.
export function terminoRenovado(c: ContratoFechas, hoy: Date): Date {
  const vigente = terminoVigente(c, hoy);
  for (let k = 1; ; k++) {
    const t = sumarMeses(c.fechaTermino, k * c.plazoMeses);
    if (t > vigente && t >= hoy) return t;
  }
}

// Monto tras un reajuste: entero en CLP, 2 decimales en UF.
export function montoReajustado(
  monto: number,
  porcentaje: number,
  moneda: "CLP" | "UF",
): number {
  const nuevo = monto * (1 + porcentaje / 100);
  return moneda === "UF"
    ? Math.round((nuevo + Number.EPSILON) * 100) / 100
    : Math.round(nuevo);
}
