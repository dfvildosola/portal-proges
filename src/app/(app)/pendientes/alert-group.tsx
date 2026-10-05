"use client";

import Link from "next/link";
import { Building, Wallet, Landmark, Receipt, ChevronDown } from "lucide-react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  alertTypeLabels,
  alertTypeCategory,
  alertCategoryLabels,
  alertSeverityLabels,
  alertSeverityVariant,
  type AlertCategory,
} from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { resolveAlert, resolvePropertyAlerts } from "./actions";

const categoryIcon: Record<AlertCategory, React.ReactNode> = {
  cobranza: <Wallet className="size-4 shrink-0 text-info" />,
  contribuciones: <Landmark className="size-4 shrink-0 text-warning" />,
  propiedad: <Building className="size-4 shrink-0 text-muted-foreground" />,
  cuentas: <Receipt className="size-4 shrink-0 text-warning" />,
};

type Alert = {
  id: string;
  tipo: keyof typeof alertTypeLabels;
  severidad: "ALTA" | "MEDIA" | "INFO";
  mensaje: string;
  createdAt: Date;
  propertyId: string | null;
  property: { id: string; rolSII: string; direccion: string; comuna: string } | null;
  contract: { id: string } | null;
};

export function AlertGroup({
  propertyId,
  alerts,
  defaultOpen,
}: {
  propertyId: string | null;
  alerts: Alert[];
  defaultOpen: boolean;
}) {
  const property = alerts[0]?.property ?? null;

  return (
    <Collapsible.Root defaultOpen={defaultOpen} className="rounded-xl border">
      {/* Header / trigger */}
      <Collapsible.Trigger className="flex w-full items-center justify-between gap-4 rounded-t-xl border-b bg-muted/40 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 data-[panel-open]:rounded-b-none">
        <div className="flex items-center gap-2">
          <Building className="size-4 shrink-0 text-muted-foreground" />
          {property ? (
            <span
              className="text-sm font-medium underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/propiedades/${property.id}`}>
                {property.rolSII} · {property.direccion}, {property.comuna}
              </Link>
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              Sin propiedad
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            ({alerts.length} {alerts.length === 1 ? "alerta" : "alertas"})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {propertyId && (
            <form
              action={resolvePropertyAlerts}
              onClick={(e) => e.stopPropagation()}
            >
              <input type="hidden" name="propertyId" value={propertyId} />
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="h-7 text-xs"
              >
                Resolver propiedad
              </Button>
            </form>
          )}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 data-[panel-open]:rotate-180" />
        </div>
      </Collapsible.Trigger>

      {/* Panel colapsable */}
      <Collapsible.Panel className="overflow-hidden data-[ending-style]:animate-none data-[starting-style]:animate-none">
        <div className="divide-y">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {categoryIcon[alertTypeCategory[alert.tipo]]}
                  <Badge variant="outline" className="text-xs font-normal">
                    {alertCategoryLabels[alertTypeCategory[alert.tipo]]}
                  </Badge>
                  <Badge variant={alertSeverityVariant(alert.severidad)}>
                    {alertSeverityLabels[alert.severidad]}
                  </Badge>
                  <span className="text-sm font-medium">
                    {alertTypeLabels[alert.tipo]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.mensaje}</p>
                {alert.contract && (
                  <Link
                    href={`/contratos/${alert.contract.id}`}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Ver contrato →
                  </Link>
                )}
                {alert.tipo === "COBROS_SIN_GENERAR" && (
                  <Link
                    href="/cobranza"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Ir a Cobranza →
                  </Link>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDate(alert.createdAt)}
                </p>
              </div>
              <form action={resolveAlert}>
                <input type="hidden" name="alertId" value={alert.id} />
                <input
                  type="hidden"
                  name="propertyId"
                  value={alert.propertyId ?? ""}
                />
                <Button variant="outline" size="sm" type="submit" className="shrink-0">
                  Resolver
                </Button>
              </form>
            </div>
          ))}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
