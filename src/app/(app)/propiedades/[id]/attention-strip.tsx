import Link from "next/link";
import { CircleCheck, TriangleAlert } from "lucide-react";
import type { Alert } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  alertTypeLabels,
  alertSeverityLabels,
  alertSeverityVariant,
} from "@/lib/domain";

export type AlertaFicha = Pick<
  Alert,
  "id" | "tipo" | "severidad" | "mensaje" | "contractId"
>;

// De más grave a menos grave.
const ORDEN = { ALTA: 0, MEDIA: 1, INFO: 2 } as const;

// Franja «Requiere atención» de la ficha: las alertas activas de la propiedad.
// No hay botón «Resolver»: la página recalcula las alertas al cargar
// (syncAlerts), así que una alerta resuelta a mano vuelve mientras siga su
// causa. Sin alertas, un aviso corto de que todo está en orden.
export function AttentionStrip({ alerts }: { alerts: AlertaFicha[] }) {
  if (alerts.length === 0) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success-soft-foreground">
        <CircleCheck className="size-4 shrink-0" />
        Todo en orden
      </div>
    );
  }

  const ordenadas = [...alerts].sort(
    (a, b) => ORDEN[a.severidad] - ORDEN[b.severidad],
  );
  const hayAlta = ordenadas[0].severidad === "ALTA";

  return (
    <section
      aria-label="Requiere atención"
      className={`mb-6 overflow-hidden rounded-xl border ${
        hayAlta
          ? "border-destructive/40 bg-destructive/5"
          : "border-warning/40 bg-warning-soft/40"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-inherit px-4 py-2.5">
        <TriangleAlert
          className={`size-4 shrink-0 ${hayAlta ? "text-destructive" : "text-warning"}`}
        />
        <h2 className="text-sm font-semibold">Requiere atención</h2>
        <span className="text-xs text-muted-foreground">
          ({alerts.length} {alerts.length === 1 ? "alerta" : "alertas"})
        </span>
      </div>
      <div className="divide-y divide-inherit">
        {ordenadas.map((alert) => (
          <div
            key={alert.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={alertSeverityVariant(alert.severidad)}>
                  {alertSeverityLabels[alert.severidad]}
                </Badge>
                <span className="text-sm font-medium">
                  {alertTypeLabels[alert.tipo]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{alert.mensaje}</p>
              {alert.contractId && (
                <Link
                  href={`/contratos/${alert.contractId}`}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Ver contrato →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-inherit px-4 py-2 text-xs text-muted-foreground">
        Cada alerta se quita sola cuando se arregla su causa, por ejemplo al
        registrar el pago.
      </p>
    </section>
  );
}
