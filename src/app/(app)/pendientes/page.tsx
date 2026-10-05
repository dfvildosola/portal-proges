import { Bell } from "lucide-react";
import { getOrgId } from "@/lib/org";
import {
  agenda,
  cuandoLabels,
  resumenAgenda,
  type Cuando,
} from "@/lib/agenda";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AgendaLinea } from "@/components/agenda-linea";

const SECCIONES: Cuando[] = ["ATRASADO", "SEMANA", "MES", "TRIMESTRE"];

// Acento sutil por sección: peligro para lo atrasado, advertencia para esta semana.
const ACENTO: Record<Cuando, { caja: string; titulo: string }> = {
  ATRASADO: {
    caja: "border-destructive/40 bg-destructive/5",
    titulo: "text-destructive",
  },
  SEMANA: {
    caja: "border-warning/40 bg-warning-soft/40",
    titulo: "text-warning-soft-foreground",
  },
  MES: { caja: "", titulo: "" },
  TRIMESTRE: { caja: "", titulo: "" },
};

// Pendientes: la agenda calculada, ordenada por cuándo hay que actuar.
export default async function PendientesPage() {
  const orgId = await getOrgId();
  const items = await agenda(orgId);
  const resumen = resumenAgenda(items);

  return (
    <>
      <PageHeader
        title="Pendientes"
        description="Lo que hay que hacer, ordenado por cuándo. Cada línea se quita sola al resolverla."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nada pendiente"
          description="No hay nada atrasado ni por vencer en los próximos meses."
        />
      ) : (
        <div className="mt-2 space-y-8">
          {SECCIONES.map((cuando) => {
            const delGrupo = items.filter((i) => i.cuando === cuando);
            if (delGrupo.length === 0) return null;
            const acento = ACENTO[cuando];
            return (
              <section key={cuando} aria-label={cuandoLabels[cuando]}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className={`text-base font-semibold ${acento.titulo}`}>
                    {cuandoLabels[cuando]}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {delGrupo.length}{" "}
                    {delGrupo.length === 1 ? "pendiente" : "pendientes"}
                  </span>
                  {cuando === "ATRASADO" && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      · ${formatMoney(resumen.atrasadoCLP)}
                      {resumen.atrasadoSinMonto > 0 &&
                        ` + ${resumen.atrasadoSinMonto} sin monto`}
                    </span>
                  )}
                </div>
                <div
                  className={`divide-y divide-inherit rounded-xl border ${acento.caja}`}
                >
                  {delGrupo.map((item) => (
                    <AgendaLinea key={item.clave} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
