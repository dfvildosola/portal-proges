// Agenda de pendientes: se calcula al abrir la página, a partir de los datos
// (cobros, contratos, cuentas, contribuciones, papeles). No guarda nada: ver
// docs/decisiones/0008-pendientes-calculados.md.
import { cache } from "react";
import { db } from "./db";
import { getLatestUf, toCLP } from "./currency";
import { adjustmentTypeLabels, billTypeLabels, papelLabels } from "./domain";
import { formatDate, formatMoney, formatPeriodo } from "./format";
import { hoyChile, sumarDias } from "./fechas";
import {
  estaVigente,
  estadoContrato,
  fechaLimiteAviso,
  proximoReajuste,
  terminoVigente,
  whereCubreMes,
} from "./contratos";
import { estadoPapeles } from "./papeles";
import { diasSinContrato } from "./property-metrics";
import type { Currency } from "@/generated/prisma/enums";

export type Cuando = "ATRASADO" | "SEMANA" | "MES" | "TRIMESTRE";
export type TipoItem =
  | "ARRIENDO_ATRASADO"
  | "ARRIENDOS_SEMANA"
  | "COBROS_SIN_GENERAR"
  | "AVISO_NO_RENOVACION"
  | "CONTRATO_POR_VENCER"
  | "CONTRATO_VENCIDO"
  | "REAJUSTE_PENDIENTE"
  | "CONTRIBUCION"
  | "CUENTA"
  | "PAPEL"
  | "ARRENDADA_SIN_CONTRATO"
  | "DESOCUPADA_PROLONGADA";
export type ItemAgenda = {
  clave: string; // `${tipo}:${id de lo que origina el ítem}`; estable entre cálculos
  tipo: TipoItem;
  cuando: Cuando;
  fecha: Date; // cuándo hay que actuar (o desde cuándo está atrasado)
  montoCLP: number | null;
  propiedad: { id: string; direccion: string; comuna: string } | null;
  contrato: { id: string; arrendatario: string } | null;
  texto: string;
  accion: { texto: string; href: string };
  ref: {
    modelo:
      | "cobro"
      | "cuenta"
      | "contribucion"
      | "contrato"
      | "documento"
      | "propiedad"
      | "cartera";
    id: string;
  };
};

export const cuandoLabels: Record<Cuando, string> = {
  ATRASADO: "Atrasado",
  SEMANA: "Esta semana",
  MES: "Este mes",
  TRIMESTRE: "Próximos meses",
};

export const tipoItemLabels: Record<TipoItem, string> = {
  ARRIENDO_ATRASADO: "Arriendo atrasado",
  ARRIENDOS_SEMANA: "Arriendos de la semana",
  COBROS_SIN_GENERAR: "Cobros sin generar",
  AVISO_NO_RENOVACION: "Aviso de no renovación",
  CONTRATO_POR_VENCER: "Contrato por vencer",
  CONTRATO_VENCIDO: "Contrato vencido",
  REAJUSTE_PENDIENTE: "Reajuste",
  CONTRIBUCION: "Contribución",
  CUENTA: "Cuenta",
  PAPEL: "Papel o póliza",
  ARRENDADA_SIN_CONTRATO: "Arrendada sin contrato",
  DESOCUPADA_PROLONGADA: "Desocupada",
};

// Totales para el menú, Inicio y la ficha. `urgentes` (atrasados + de esta
// semana) es el contador del menú. `atrasadoSinMonto` cuenta los atrasados que
// son de plata (cobro, cuenta, contribución) sin monto en pesos, para decir
// «+ N sin monto».
export function resumenAgenda(items: ItemAgenda[]): {
  porCuando: Record<Cuando, number>;
  urgentes: number;
  atrasadoCLP: number;
  atrasadoSinMonto: number;
} {
  const porCuando: Record<Cuando, number> = {
    ATRASADO: 0,
    SEMANA: 0,
    MES: 0,
    TRIMESTRE: 0,
  };
  let atrasadoCLP = 0;
  let atrasadoSinMonto = 0;
  for (const i of items) {
    porCuando[i.cuando]++;
    if (i.cuando !== "ATRASADO") continue;
    atrasadoCLP += i.montoCLP ?? 0;
    const esDePlata =
      i.tipo === "ARRIENDO_ATRASADO" || i.tipo === "CUENTA" || i.tipo === "CONTRIBUCION";
    if (esDePlata && i.montoCLP === null) atrasadoSinMonto++;
  }
  return {
    porCuando,
    urgentes: porCuando.ATRASADO + porCuando.SEMANA,
    atrasadoCLP,
    atrasadoSinMonto,
  };
}

const MS_DIA = 86_400_000;

// Días de anticipación de cada regla (ADR 0008).
const AVISO_NO_RENOVACION_DIAS = 30;
const CONTRATO_POR_VENCER_DIAS = 120;
const REAJUSTE_DIAS = 30;
const PAPELES_DIAS = 45;
const CONTRIBUCIONES_DIAS = 30;
const CUENTAS_DIAS = 7;
const ARRIENDOS_SEMANA_DIAS = 7;
const DESOCUPADA_DIAS = 90;

const diasHasta = (f: Date, hoy: Date) =>
  Math.round((f.getTime() - hoy.getTime()) / MS_DIA);

// Cuándo toca actuar según la fecha: antes de hoy, esta semana, este mes o después.
function cuandoDe(fecha: Date, hoy: Date): Cuando {
  const dias = diasHasta(fecha, hoy);
  if (dias < 0) return "ATRASADO";
  if (dias <= 7) return "SEMANA";
  if (dias <= 30) return "MES";
  return "TRIMESTRE";
}

const enDias = (n: number) =>
  n === 0 ? "es hoy" : `quedan ${n} día${n === 1 ? "" : "s"}`;

// «$500.000» en pesos; «12,5 UF» en UF.
const dinero = (n: number, moneda: Currency) =>
  moneda === "CLP" ? `$${formatMoney(n)}` : formatMoney(n, "UF");

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type Prop = { id: string; direccion: string; comuna: string };
const propDe = (p: Prop) => ({
  id: p.id,
  direccion: p.direccion,
  comuna: p.comuna,
});

export async function calcularAgenda(
  orgId: string,
  hoy: Date,
): Promise<ItemAgenda[]> {
  // «mes de hoy» sale de `hoy` (medianoche UTC del día en Chile); mesActual(hoy)
  // se equivocaría de mes el día 1, porque leería esa medianoche en hora de Chile.
  const mes = hoy.toISOString().slice(0, 7);
  const fin7 = sumarDias(hoy, ARRIENDOS_SEMANA_DIAS);
  const propSelect = { select: { id: true, direccion: true, comuna: true } };

  const [
    uf,
    propiedades,
    contratos,
    cobrosAtrasados,
    cobrosSemana,
    sinCobro,
    contribuciones,
    cuentas,
  ] = await Promise.all([
    getLatestUf(),
    // Propiedades con sus contratos y papeles: sirven a 4 reglas.
    db.property.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        direccion: true,
        comuna: true,
        tipo: true,
        estado: true,
        contracts: {
          select: {
            fechaInicio: true,
            fechaTermino: true,
            fechaSalida: true,
            renovacionAutomatica: true,
            plazoMeses: true,
          },
        },
        documents: {
          where: { papel: { not: null } },
          select: {
            id: true,
            nombre: true,
            papel: true,
            fechaEmision: true,
            createdAt: true,
            fechaVencimiento: true,
          },
        },
      },
    }),
    db.leaseContract.findMany({
      where: {
        organizationId: orgId,
        OR: [{ fechaSalida: null }, { fechaSalida: { gte: hoy } }],
      },
      include: { property: propSelect, tenant: { select: { nombre: true } } },
    }),
    db.rentCharge.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { estado: "ATRASADO" },
          { estado: "PENDIENTE", fechaVencimiento: { lt: hoy } },
        ],
      },
      include: {
        contract: {
          include: {
            property: propSelect,
            tenant: { select: { nombre: true } },
          },
        },
      },
    }),
    db.rentCharge.findMany({
      where: {
        organizationId: orgId,
        estado: { not: "PAGADO" },
        fechaVencimiento: { gte: hoy, lte: fin7 },
      },
    }),
    db.leaseContract.count({
      where: {
        ...whereCubreMes(mes),
        organizationId: orgId,
        charges: { none: { periodo: mes } },
      },
    }),
    db.propertyTax.findMany({
      where: {
        organizationId: orgId,
        estado: "PENDIENTE",
        fechaVencimiento: { lte: sumarDias(hoy, CONTRIBUCIONES_DIAS) },
      },
      include: { property: propSelect },
    }),
    db.propertyBill.findMany({
      where: {
        organizationId: orgId,
        estado: "PENDIENTE",
        fechaVencimiento: { lte: sumarDias(hoy, CUENTAS_DIAS) },
      },
      include: { property: propSelect },
    }),
  ]);

  const items: ItemAgenda[] = [];

  // Arrendada sin contrato vigente cargado.
  for (const p of propiedades) {
    if (p.estado === "ARRENDADA" && !p.contracts.some((c) => estaVigente(c, hoy))) {
      items.push({
        clave: `ARRENDADA_SIN_CONTRATO:${p.id}`,
        tipo: "ARRENDADA_SIN_CONTRATO",
        cuando: "ATRASADO",
        fecha: hoy,
        montoCLP: null,
        propiedad: propDe(p),
        contrato: null,
        texto: "Propiedad marcada como arrendada pero sin contrato vigente cargado.",
        accion: { texto: "Cargar contrato", href: `/contratos/nuevo?propertyId=${p.id}` },
        ref: { modelo: "propiedad", id: p.id },
      });
    }
  }

  // Contratos: aviso de no renovación, por vencer, vencido y reajuste.
  for (const c of contratos) {
    const comun = {
      propiedad: propDe(c.property),
      contrato: { id: c.id, arrendatario: c.tenant.nombre },
      accion: { texto: "Ver contrato", href: `/contratos/${c.id}` },
      ref: { modelo: "contrato" as const, id: c.id },
    };
    const vigente = estaVigente(c, hoy);

    // Se renueva solo y se acerca la fecha límite para avisar que no.
    if (vigente && c.renovacionAutomatica && !c.fechaSalida) {
      const limite = fechaLimiteAviso(c, hoy);
      const dias = diasHasta(limite, hoy);
      if (dias >= 0 && dias <= AVISO_NO_RENOVACION_DIAS) {
        items.push({
          ...comun,
          clave: `AVISO_NO_RENOVACION:${c.id}`,
          tipo: "AVISO_NO_RENOVACION",
          cuando: cuandoDe(limite, hoy),
          fecha: limite,
          montoCLP: null,
          texto: `Se renueva solo el ${formatDate(terminoVigente(c, hoy))}. Si no se quiere renovar, hay que avisar antes del ${formatDate(limite)} (${enDias(dias)}).`,
        });
      }
    }

    // No se renueva solo, no tiene salida y su término se acerca.
    if (!c.renovacionAutomatica && !c.fechaSalida) {
      const dias = diasHasta(c.fechaTermino, hoy);
      if (dias >= 0 && dias <= CONTRATO_POR_VENCER_DIAS) {
        items.push({
          ...comun,
          clave: `CONTRATO_POR_VENCER:${c.id}`,
          tipo: "CONTRATO_POR_VENCER",
          cuando: cuandoDe(c.fechaTermino, hoy),
          fecha: c.fechaTermino,
          montoCLP: null,
          texto: `El contrato vence en ${dias} día${dias === 1 ? "" : "s"} (${formatDate(c.fechaTermino)}) y no se renueva solo.`,
        });
      }
    }

    // Pasó su término, no se renueva solo y nadie lo renovó ni lo terminó.
    if (estadoContrato(c, hoy) === "VENCIDO") {
      items.push({
        ...comun,
        clave: `CONTRATO_VENCIDO:${c.id}`,
        tipo: "CONTRATO_VENCIDO",
        cuando: "ATRASADO",
        fecha: c.fechaTermino,
        montoCLP: null,
        accion: { texto: "Renovar o terminar", href: `/contratos/${c.id}` },
        texto: `El contrato venció el ${formatDate(c.fechaTermino)} y no se renueva solo. Renuévalo o termínalo.`,
      });
    }

    // Reajuste que toca en ≤30 días o ya pasó.
    const reajuste = vigente ? proximoReajuste(c) : null;
    if (reajuste && diasHasta(reajuste, hoy) <= REAJUSTE_DIAS) {
      const dias = diasHasta(reajuste, hoy);
      const tipo =
        c.reajusteTipo === "NINGUNO" ? "" : ` ${adjustmentTypeLabels[c.reajusteTipo]}`;
      items.push({
        ...comun,
        clave: `REAJUSTE_PENDIENTE:${c.id}`,
        tipo: "REAJUSTE_PENDIENTE",
        cuando: cuandoDe(reajuste, hoy),
        fecha: reajuste,
        montoCLP: null,
        accion: { texto: "Reajustar", href: `/contratos/${c.id}` },
        texto:
          dias < 0
            ? `Reajuste${tipo} pendiente desde el ${formatDate(reajuste)}.`
            : `Toca reajustar${tipo} el ${formatDate(reajuste)} (${dias === 0 ? "es hoy" : `en ${dias} día${dias === 1 ? "" : "s"}`}).`,
      });
    }
  }

  // Arriendos atrasados: un ítem por cobro, por el saldo que falta (ADR 0006).
  const atrasados = new Set<string>();
  for (const ch of cobrosAtrasados) {
    atrasados.add(ch.id);
    const esperado = Number(ch.montoEsperado);
    const pagado = Number(ch.montoPagado ?? 0);
    const saldo = Math.max(0, esperado - pagado);
    const parcial = pagado > 0;
    items.push({
      clave: `ARRIENDO_ATRASADO:${ch.id}`,
      tipo: "ARRIENDO_ATRASADO",
      cuando: "ATRASADO",
      fecha: ch.fechaVencimiento,
      montoCLP: toCLP(saldo, ch.moneda, uf),
      propiedad: propDe(ch.contract.property),
      contrato: { id: ch.contractId, arrendatario: ch.contract.tenant.nombre },
      texto: parcial
        ? `Arriendo de ${minuscula(formatPeriodo(ch.periodo))} · falta ${dinero(saldo, ch.moneda)} de ${dinero(esperado, ch.moneda)} (vencía el ${formatDate(ch.fechaVencimiento)}).`
        : `Arriendo de ${minuscula(formatPeriodo(ch.periodo))} sin pagar (venció el ${formatDate(ch.fechaVencimiento)}).`,
      accion: { texto: "Registrar pago", href: `/cobranza/${ch.id}` },
      ref: { modelo: "cobro", id: ch.id },
    });
  }

  // Arriendos que vencen en los próximos 7 días: un solo ítem para toda la cartera.
  const semana = cobrosSemana.filter((ch) => !atrasados.has(ch.id));
  if (semana.length > 0) {
    let total = 0;
    let sinUf = false;
    for (const ch of semana) {
      const saldo = Math.max(0, Number(ch.montoEsperado) - Number(ch.montoPagado ?? 0));
      const clp = toCLP(saldo, ch.moneda, uf);
      if (clp === null) sinUf = true;
      else total += clp;
    }
    const primero = semana.reduce((a, b) =>
      b.fechaVencimiento < a.fechaVencimiento ? b : a,
    );
    items.push({
      clave: "ARRIENDOS_SEMANA:cartera",
      tipo: "ARRIENDOS_SEMANA",
      cuando: cuandoDe(primero.fechaVencimiento, hoy),
      fecha: primero.fechaVencimiento,
      montoCLP: sinUf ? null : total,
      propiedad: null,
      contrato: null,
      texto: `${semana.length} arriendo${semana.length === 1 ? " vence" : "s vencen"} esta semana.`,
      accion: {
        texto: "Ver cobranza",
        href: `/cobranza?mes=${primero.fechaVencimiento.toISOString().slice(0, 7)}`,
      },
      ref: { modelo: "cartera", id: "cartera" },
    });
  }

  // Contratos que deben tener cobro este mes y aún no lo tienen.
  if (sinCobro > 0) {
    items.push({
      clave: "COBROS_SIN_GENERAR:cartera",
      tipo: "COBROS_SIN_GENERAR",
      cuando: "ATRASADO",
      fecha: hoy,
      montoCLP: null,
      propiedad: null,
      contrato: null,
      texto: `${formatPeriodo(mes)}: ${sinCobro} contrato${sinCobro === 1 ? "" : "s"} sin cobro generado. Genéralos en Cobranza.`,
      accion: { texto: "Generar cobros", href: `/cobranza?mes=${mes}` },
      ref: { modelo: "cartera", id: "cartera" },
    });
  }

  // Contribuciones: una cuota pendiente, vencida o que vence en ≤30 días.
  // Las cuotas son siempre en pesos; pueden no tener monto aún.
  for (const t of contribuciones) {
    const monto = t.monto === null ? null : Number(t.monto);
    const vencida = t.fechaVencimiento < hoy;
    items.push({
      clave: `CONTRIBUCION:${t.id}`,
      tipo: "CONTRIBUCION",
      cuando: cuandoDe(t.fechaVencimiento, hoy),
      fecha: t.fechaVencimiento,
      montoCLP: monto,
      propiedad: propDe(t.property),
      contrato: null,
      texto: `Contribución ${t.anio}, cuota ${t.cuota}: ${vencida ? "vencida el" : "vence el"} ${formatDate(t.fechaVencimiento)}${monto === null ? " · sin monto registrado" : ""}.`,
      accion: { texto: "Ver propiedad", href: `/propiedades/${t.propertyId}` },
      ref: { modelo: "contribucion", id: t.id },
    });
  }

  // Cuentas: una cuenta pendiente, vencida o que vence en ≤7 días.
  for (const b of cuentas) {
    const monto = b.monto === null ? null : Number(b.monto);
    const vencida = b.fechaVencimiento < hoy;
    items.push({
      clave: `CUENTA:${b.id}`,
      tipo: "CUENTA",
      cuando: cuandoDe(b.fechaVencimiento, hoy),
      fecha: b.fechaVencimiento,
      montoCLP: toCLP(monto, b.moneda, uf),
      propiedad: propDe(b.property),
      contrato: null,
      texto: `${billTypeLabels[b.tipo]} de ${minuscula(formatPeriodo(b.periodo))}: ${vencida ? "vencida el" : "vence el"} ${formatDate(b.fechaVencimiento)}${monto === null ? " · sin monto registrado" : b.moneda === "CLP" ? "" : ` · ${dinero(monto, b.moneda)}`}.`,
      accion: { texto: "Marcar pagada", href: `/propiedades/${b.propertyId}` },
      ref: { modelo: "cuenta", id: b.id },
    });
  }

  // Papeles y pólizas: se mide con la regla de la ficha, mirando 45 días adelante.
  // «Vencido» a esa fecha = ningún documento vigente más allá de ese plazo.
  // Los papeles que faltan no entran (los muestra la ficha).
  const horizontePapeles = sumarDias(hoy, PAPELES_DIAS);
  for (const p of propiedades) {
    const estados = estadoPapeles({
      tipo: p.tipo,
      estado: p.estado,
      documents: p.documents,
      now: horizontePapeles,
    });
    for (const e of estados) {
      if (e.estado !== "vencido" || !e.documento?.fechaVencimiento) continue;
      const fecha = e.documento.fechaVencimiento;
      items.push({
        clave: `PAPEL:${p.id}:${e.papel}`,
        tipo: "PAPEL",
        cuando: cuandoDe(fecha, hoy),
        fecha,
        montoCLP: null,
        propiedad: propDe(p),
        contrato: null,
        texto: `${papelLabels[e.papel]}: ${fecha < hoy ? "vencido el" : "vence el"} ${formatDate(fecha)}.`,
        accion: { texto: "Renovar", href: `/propiedades/${p.id}` },
        ref: { modelo: "documento", id: e.documento.id },
      });
    }
  }

  // Desocupada hace más de ~3 meses, contados desde la salida del último contrato
  // (igual que la ficha). Sin contratos previos no hay desde cuándo: no hay ítem.
  for (const p of propiedades) {
    if (p.estado !== "DESOCUPADA") continue;
    const sin = diasSinContrato(p.contracts, hoy);
    if (!sin || sin.dias <= DESOCUPADA_DIAS) continue;
    const meses = Math.floor(sin.dias / 30);
    items.push({
      clave: `DESOCUPADA_PROLONGADA:${p.id}`,
      tipo: "DESOCUPADA_PROLONGADA",
      cuando: "ATRASADO",
      fecha: sin.desde,
      montoCLP: null,
      propiedad: propDe(p),
      contrato: null,
      texto: `Desocupada hace ${meses} mes${meses === 1 ? "" : "es"} (desde ${formatDate(sin.desde)}).`,
      accion: { texto: "Ver propiedad", href: `/propiedades/${p.id}` },
      ref: { modelo: "propiedad", id: p.id },
    });
  }

  // La plata primero (mayor monto arriba), para que en cada sección y en las 8
  // líneas de Inicio salga lo que más cuesta y no reajustes viejos sin monto.
  return items.sort((a, b) => {
    if (a.montoCLP !== null && b.montoCLP !== null && a.montoCLP !== b.montoCLP)
      return b.montoCLP - a.montoCLP;
    if ((a.montoCLP !== null) !== (b.montoCLP !== null))
      return a.montoCLP !== null ? -1 : 1;
    return (
      a.fecha.getTime() - b.fecha.getTime() || a.clave.localeCompare(b.clave)
    );
  });
}

// Una sola vez por página: `cache` compara argumentos por identidad, por eso
// recibe solo `orgId` y calcula «hoy» adentro.
export const agenda = cache(async (orgId: string) =>
  calcularAgenda(orgId, hoyChile()),
);
