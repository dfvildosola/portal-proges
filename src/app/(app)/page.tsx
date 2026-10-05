import Link from "next/link";
import { Building2, Percent, Wallet, Bell } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  alertTypeLabels,
  alertSeverityLabels,
  alertSeverityVariant,
} from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import { mesActual, rangoDelMes } from "@/lib/fechas";
import { getLatestUf, toCLP } from "@/lib/currency";

const SEVERITY_ORDER = { ALTA: 0, MEDIA: 1, INFO: 2 } as const;

export default async function InicioPage() {
  const orgId = await getOrgId();
  const { inicio: startOfMonth, fin: endOfMonth } = rangoDelMes(mesActual());

  const [total, arrendadas, alertasActivas, cobrosMes, uf] = await Promise.all([
    db.property.count({ where: { organizationId: orgId } }),
    db.property.count({ where: { organizationId: orgId, estado: "ARRENDADA" } }),
    db.alert.count({ where: { organizationId: orgId, estado: "ACTIVA" } }),
    // Cualquier cobro con pago dentro del mes, también los parciales.
    db.rentCharge.findMany({
      where: {
        organizationId: orgId,
        montoPagado: { not: null },
        fechaPago: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { montoPagado: true, moneda: true },
    }),
    getLatestUf(),
  ]);

  // Lo cobrado en UF se convierte con la última UF registrada (ADR 0006).
  let ingresoMes = 0;
  let pagosUf = 0;
  let pagosUfSinConvertir = 0;
  for (const c of cobrosMes) {
    if (c.moneda === "UF") {
      pagosUf++;
      if (uf === null) pagosUfSinConvertir++;
    }
    ingresoMes += toCLP(c.montoPagado, c.moneda, uf) ?? 0;
  }
  const subIngreso =
    pagosUfSinConvertir > 0
      ? `${pagosUfSinConvertir} ${pagosUfSinConvertir === 1 ? "pago en UF sin convertir" : "pagos en UF sin convertir"}: falta el valor UF`
      : pagosUf > 0 && uf !== null
        ? `arriendos cobrados · UF a $${formatMoney(Math.round(uf))}`
        : "arriendos cobrados";

  const pct = total > 0 ? Math.round((arrendadas / total) * 100) : 0;

  const kpis = [
    { label: "Propiedades", value: String(total), icon: Building2 },
    {
      label: "Arrendadas",
      value: total > 0 ? `${arrendadas} / ${total}` : "—",
      sub: total > 0 ? `${pct}%` : undefined,
      icon: Percent,
    },
    {
      label: "Ingreso del mes",
      value: formatMoney(ingresoMes),
      sub: subIngreso,
      icon: Wallet,
    },
    {
      label: "Alertas activas",
      value: String(alertasActivas),
      icon: Bell,
      href: "/pendientes",
    },
  ];

  const alerts = await db.alert.findMany({
    where: { organizationId: orgId, estado: "ACTIVA" },
    include: {
      property: { select: { id: true, rolSII: true, direccion: true } },
      contract: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  alerts.sort(
    (a, b) => SEVERITY_ORDER[a.severidad] - SEVERITY_ORDER[b.severidad],
  );

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Resumen de la cartera y qué necesita tu atención hoy."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const card = (
            <Card
              key={kpi.label}
              className={kpi.href ? "transition-colors hover:bg-muted/50" : ""}
            >
              <CardHeader>
                <CardDescription className="flex items-center justify-between">
                  {kpi.label}
                  <Icon className="size-4" />
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {kpi.value}
                </CardTitle>
                {kpi.sub && (
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                )}
              </CardHeader>
            </Card>
          );
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={kpi.label}>{card}</div>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Alertas activas
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin alertas activas.{" "}
            <Link
              href="/pendientes"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Recalcular
            </Link>
          </p>
        ) : (
          <div className="divide-y rounded-xl border">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={alertSeverityVariant(alert.severidad)}>
                    {alertSeverityLabels[alert.severidad]}
                  </Badge>
                  <span className="text-sm font-medium">
                    {alertTypeLabels[alert.tipo]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {alert.mensaje}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {alert.property && (
                    <Link
                      href={`/propiedades/${alert.property.id}`}
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      {alert.property.rolSII}
                    </Link>
                  )}
                  {alert.contract && (
                    <Link
                      href={`/contratos/${alert.contract.id}`}
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Contrato →
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {alertasActivas > 8 && (
              <div className="px-4 py-3">
                <Link
                  href="/pendientes"
                  className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                >
                  Ver {alertasActivas - 8} más en Pendientes →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
