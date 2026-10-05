import { db } from "./db";
import { AlertType, AlertSeverity } from "@/generated/prisma/enums";
import { formatDate, formatPeriodo } from "./format";
import { hoyChile, mesActual, sumarDias, sumarMeses } from "./fechas";
import {
  estadoContrato,
  estaVigente,
  fechaLimiteAviso,
  proximoReajuste,
  terminoVigente,
  whereCubreMes,
  whereVigenteEn,
} from "./contratos";
import { adjustmentTypeLabels } from "./domain";

type AlertSpec = {
  tipo: AlertType;
  severidad: AlertSeverity;
  mensaje: string;
  propertyId?: string;
  contractId?: string;
};

function specKey(
  tipo: string,
  propertyId?: string | null,
  contractId?: string | null,
): string {
  return `${tipo}:${propertyId ?? ""}:${contractId ?? ""}`;
}

export async function syncAlerts(
  orgId: string,
): Promise<{ created: number; resolved: number }> {
  const now = hoyChile();
  const in30Days = sumarDias(now, 30);
  const threeMonthsAgo = sumarMeses(now, -3);

  const specs: AlertSpec[] = [];

  // Regla 1: Propiedad ARRENDADA sin contrato VIGENTE
  const arrendadas = await db.property.findMany({
    where: { organizationId: orgId, estado: "ARRENDADA" },
    include: { contracts: { where: whereVigenteEn(now), select: { id: true } } },
  });
  for (const p of arrendadas) {
    if (p.contracts.length === 0) {
      specs.push({
        tipo: AlertType.ARRENDADA_SIN_CONTRATO,
        severidad: AlertSeverity.ALTA,
        mensaje:
          "Propiedad marcada como arrendada pero sin contrato vigente cargado.",
        propertyId: p.id,
      });
    }
  }

  // Regla 2: Contratos — aviso de no renovación, por vencer, vencido y reajuste.
  const contratos = await db.leaseContract.findMany({
    where: {
      organizationId: orgId,
      OR: [{ fechaSalida: null }, { fechaSalida: { gte: now } }],
    },
  });
  const diasHasta = (f: Date) => Math.round((f.getTime() - now.getTime()) / 86_400_000);
  const enDias = (n: number) => (n === 0 ? "es hoy" : `quedan ${n} día${n === 1 ? "" : "s"}`);
  for (const c of contratos) {
    const base = { propertyId: c.propertyId, contractId: c.id };
    const vigente = estaVigente(c, now);

    if (vigente && c.renovacionAutomatica && !c.fechaSalida) {
      const limite = fechaLimiteAviso(c, now);
      const dias = diasHasta(limite);
      if (dias >= 0 && dias <= 30) {
        specs.push({
          ...base,
          tipo: AlertType.AVISO_NO_RENOVACION,
          severidad: dias <= 7 ? AlertSeverity.ALTA : AlertSeverity.MEDIA,
          mensaje: `Se renueva solo el ${formatDate(terminoVigente(c, now))}. Si no se quiere renovar, hay que avisar antes del ${formatDate(limite)} (${enDias(dias)}).`,
        });
      }
    }

    if (!c.renovacionAutomatica && !c.fechaSalida) {
      const dias = diasHasta(c.fechaTermino);
      if (dias >= 0 && dias <= 120) {
        specs.push({
          ...base,
          tipo: AlertType.CONTRATO_POR_VENCER,
          severidad: dias <= 30 ? AlertSeverity.ALTA : AlertSeverity.MEDIA,
          mensaje: `El contrato vence en ${dias} día${dias === 1 ? "" : "s"} (${formatDate(c.fechaTermino)}) y no se renueva solo.`,
        });
      }
    }

    if (estadoContrato(c, now) === "VENCIDO") {
      specs.push({
        ...base,
        tipo: AlertType.CONTRATO_VENCIDO,
        severidad: AlertSeverity.ALTA,
        mensaje: `El contrato venció el ${formatDate(c.fechaTermino)} y no se renueva solo. Renuévalo o termínalo.`,
      });
    }

    const reajuste = vigente ? proximoReajuste(c) : null;
    if (reajuste && reajuste <= in30Days) {
      const dias = diasHasta(reajuste);
      const tipo =
        c.reajusteTipo === "NINGUNO" ? "" : ` ${adjustmentTypeLabels[c.reajusteTipo]}`;
      specs.push({
        ...base,
        tipo: AlertType.REAJUSTE_PENDIENTE,
        severidad: dias < 0 ? AlertSeverity.ALTA : AlertSeverity.MEDIA,
        mensaje:
          dias < 0
            ? `Reajuste${tipo} pendiente desde el ${formatDate(reajuste)}.`
            : `Toca reajustar${tipo} el ${formatDate(reajuste)} (${dias === 0 ? "es hoy" : `en ${dias} día${dias === 1 ? "" : "s"}`}).`,
      });
    }
  }

  // Regla 3: Cobros de arriendo atrasados (un alert por contrato)
  const cobrosAtrasados = await db.rentCharge.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { estado: "ATRASADO" },
        { estado: "PENDIENTE", fechaVencimiento: { lt: now } },
      ],
    },
    include: { contract: { select: { propertyId: true } } },
  });
  const porContrato = new Map<string, { propertyId: string; count: number }>();
  for (const ch of cobrosAtrasados) {
    const cur = porContrato.get(ch.contractId);
    if (cur) {
      cur.count++;
    } else {
      porContrato.set(ch.contractId, {
        propertyId: ch.contract.propertyId,
        count: 1,
      });
    }
  }
  for (const [contractId, { propertyId, count }] of porContrato) {
    specs.push({
      tipo: AlertType.ARRIENDO_ATRASADO,
      severidad: AlertSeverity.ALTA,
      mensaje: `${count} cobro${count === 1 ? "" : "s"} de arriendo atrasado${count === 1 ? "" : "s"}.`,
      propertyId,
      contractId,
    });
  }

  // Regla 4: Contribuciones impagas y vencidas (un alert por propiedad)
  const impagos = await db.propertyTax.findMany({
    where: {
      organizationId: orgId,
      estado: "PENDIENTE",
      fechaVencimiento: { lt: now },
    },
  });
  const porPropiedad = new Map<string, number>();
  for (const t of impagos) {
    porPropiedad.set(t.propertyId, (porPropiedad.get(t.propertyId) ?? 0) + 1);
  }
  for (const [propertyId, count] of porPropiedad) {
    specs.push({
      tipo: AlertType.CONTRIBUCION_IMPAGA,
      severidad: AlertSeverity.ALTA,
      mensaje: `${count} contribuci${count === 1 ? "ón" : "ones"} impaga${count === 1 ? "" : "s"} y vencida${count === 1 ? "" : "s"}.`,
      propertyId,
    });
  }

  // Regla 4b: Contribuciones por vencer en ≤30 días (un alert por propiedad).
  // Incluye cuotas sin monto registrado aún (placeholder generado automáticamente).
  const porVencerTaxes = await db.propertyTax.findMany({
    where: {
      organizationId: orgId,
      estado: "PENDIENTE",
      fechaVencimiento: { gte: now, lte: in30Days },
    },
  });
  const taxPorPropiedad = new Map<string, { sinMonto: number; conMonto: number }>();
  for (const t of porVencerTaxes) {
    const cur = taxPorPropiedad.get(t.propertyId) ?? { sinMonto: 0, conMonto: 0 };
    if (t.monto === null) cur.sinMonto++;
    else cur.conMonto++;
    taxPorPropiedad.set(t.propertyId, cur);
  }
  for (const [propertyId, { sinMonto, conMonto }] of taxPorPropiedad) {
    const total = sinMonto + conMonto;
    const partes: string[] = [];
    if (conMonto > 0) partes.push(`${conMonto} por vencer`);
    if (sinMonto > 0) partes.push(`${sinMonto} sin monto registrado`);
    specs.push({
      tipo: AlertType.CONTRIBUCION_POR_VENCER,
      severidad: sinMonto > 0 ? AlertSeverity.ALTA : AlertSeverity.MEDIA,
      mensaje: `${total} cuota${total === 1 ? "" : "s"} de contribución próxima${total === 1 ? "" : "s"} a vencer (${partes.join(", ")}).`,
      propertyId,
    });
  }

  // Regla 6: Cuentas por pagar vencidas sin pagar (un alert por propiedad)
  const cuentasVencidas = await db.propertyBill.findMany({
    where: {
      organizationId: orgId,
      estado: "PENDIENTE",
      fechaVencimiento: { lt: now },
    },
  });
  const vencidasPorPropiedad = new Map<string, number>();
  for (const b of cuentasVencidas) {
    vencidasPorPropiedad.set(b.propertyId, (vencidasPorPropiedad.get(b.propertyId) ?? 0) + 1);
  }
  for (const [propertyId, count] of vencidasPorPropiedad) {
    specs.push({
      tipo: AlertType.CUENTA_VENCIDA,
      severidad: AlertSeverity.ALTA,
      mensaje: `${count} cuenta${count === 1 ? "" : "s"} vencida${count === 1 ? "" : "s"} sin pagar.`,
      propertyId,
    });
  }

  // Regla 6b: Cuentas por pagar que vencen en los próximos 7 días (un alert por propiedad)
  const in7Days = sumarDias(now, 7);
  const cuentasPorVencer = await db.propertyBill.findMany({
    where: {
      organizationId: orgId,
      estado: "PENDIENTE",
      fechaVencimiento: { gte: now, lte: in7Days },
    },
  });
  const porVencerPorPropiedad = new Map<string, number>();
  for (const b of cuentasPorVencer) {
    porVencerPorPropiedad.set(b.propertyId, (porVencerPorPropiedad.get(b.propertyId) ?? 0) + 1);
  }
  for (const [propertyId, count] of porVencerPorPropiedad) {
    specs.push({
      tipo: AlertType.CUENTA_POR_VENCER,
      severidad: AlertSeverity.MEDIA,
      mensaje: `${count} cuenta${count === 1 ? "" : "s"} por vencer en los próximos 7 días.`,
      propertyId,
    });
  }

  // Regla 7: Contratos que deben tener cobro este mes y aún no lo tienen
  // (nadie apretó «Generar cobros del mes»). Una sola alerta para toda la cartera.
  const mes = mesActual();
  const sinCobro = await db.leaseContract.count({
    where: {
      ...whereCubreMes(mes),
      organizationId: orgId,
      charges: { none: { periodo: mes } },
    },
  });
  if (sinCobro > 0) {
    specs.push({
      tipo: AlertType.COBROS_SIN_GENERAR,
      severidad: AlertSeverity.ALTA,
      mensaje: `${formatPeriodo(mes)}: ${sinCobro} contrato${sinCobro === 1 ? "" : "s"} sin cobro generado. Genéralos en Cobranza.`,
    });
  }

  // Regla 5: Propiedad DESOCUPADA hace >3 meses
  const desocupadas = await db.property.findMany({
    where: {
      organizationId: orgId,
      estado: "DESOCUPADA",
      updatedAt: { lt: threeMonthsAgo },
    },
  });
  for (const p of desocupadas) {
    const meses = Math.floor(
      (now.getTime() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );
    specs.push({
      tipo: AlertType.DESOCUPADA_PROLONGADA,
      severidad: AlertSeverity.MEDIA,
      mensaje: `La propiedad lleva aproximadamente ${meses} mes${meses === 1 ? "" : "es"} desocupada.`,
      propertyId: p.id,
    });
  }

  // Sincronizar con DB
  const existing = await db.alert.findMany({
    where: { organizationId: orgId, estado: "ACTIVA" },
  });
  const existingMap = new Map(
    existing.map((a) => [specKey(a.tipo, a.propertyId, a.contractId), a]),
  );
  const specKeys = new Set(
    specs.map((s) => specKey(s.tipo, s.propertyId, s.contractId)),
  );

  let created = 0;
  let resolved = 0;

  for (const spec of specs) {
    const k = specKey(spec.tipo, spec.propertyId, spec.contractId);
    const ex = existingMap.get(k);
    if (ex) {
      if (ex.mensaje !== spec.mensaje || ex.severidad !== spec.severidad) {
        await db.alert.update({
          where: { id: ex.id },
          data: { mensaje: spec.mensaje, severidad: spec.severidad },
        });
      }
    } else {
      await db.alert.create({
        data: {
          organizationId: orgId,
          tipo: spec.tipo,
          severidad: spec.severidad,
          mensaje: spec.mensaje,
          propertyId: spec.propertyId ?? null,
          contractId: spec.contractId ?? null,
          estado: "ACTIVA",
        },
      });
      created++;
    }
  }

  for (const alert of existing) {
    if (!specKeys.has(specKey(alert.tipo, alert.propertyId, alert.contractId))) {
      await db.alert.update({
        where: { id: alert.id },
        data: { estado: "RESUELTA", resolvedAt: new Date() },
      });
      resolved++;
    }
  }

  return { created, resolved };
}

export async function getActiveAlertCount(orgId: string): Promise<number> {
  return db.alert.count({
    where: { organizationId: orgId, estado: "ACTIVA" },
  });
}
