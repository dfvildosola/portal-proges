import Link from "next/link";
import { Building2, Percent, Wallet, Bell } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { AgendaLinea } from "@/components/agenda-linea";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { agenda, resumenAgenda } from "@/lib/agenda";
import { formatMoney } from "@/lib/format";
import { mesActual, rangoDelMes } from "@/lib/fechas";
import { getLatestUf, toCLP } from "@/lib/currency";

export default async function InicioPage() {
  const orgId = await getOrgId();
  const { inicio: startOfMonth, fin: endOfMonth } = rangoDelMes(mesActual());

  const [total, arrendadas, items, cobrosMes, uf] = await Promise.all([
    db.property.count({ where: { organizationId: orgId } }),
    db.property.count({ where: { organizationId: orgId, estado: "ARRENDADA" } }),
    agenda(orgId),
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

  const { urgentes, atrasadoCLP } = resumenAgenda(items);
  // Primero todo lo atrasado y después lo de esta semana (como en Pendientes);
  // dentro de cada grupo se respeta el orden de la agenda.
  const paraSemana = [
    ...items.filter((i) => i.cuando === "ATRASADO"),
    ...items.filter((i) => i.cuando === "SEMANA"),
  ];

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
      label: "Pendientes",
      value: String(urgentes),
      sub:
        atrasadoCLP > 0
          ? `$${formatMoney(atrasadoCLP)} atrasado`
          : "atrasados y de esta semana",
      icon: Bell,
      href: "/pendientes",
    },
  ];

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
          Para esta semana
        </h2>
        {paraSemana.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada atrasado ni para esta semana.
          </p>
        ) : (
          <div className="divide-y rounded-xl border">
            {paraSemana.slice(0, 8).map((item) => (
              <AgendaLinea key={item.clave} item={item} />
            ))}
            {paraSemana.length > 8 && (
              <div className="px-4 py-3">
                <Link
                  href="/pendientes"
                  className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                >
                  Ver {paraSemana.length - 8} más en Pendientes →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
