import { CircleCheck, TriangleAlert } from "lucide-react";
import { AgendaLinea } from "@/components/agenda-linea";
import type { ItemAgenda } from "@/lib/agenda";

// Franja «Requiere atención» de la ficha: los pendientes de la agenda que son
// de esta propiedad. No hay botón «Resolver»: la agenda se calcula al abrir la
// página, así que un pendiente se va solo cuando se resuelve su causa. Sin
// pendientes, un aviso corto de que todo está en orden.
export function AttentionStrip({ items }: { items: ItemAgenda[] }) {
  if (items.length === 0) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success-soft-foreground">
        <CircleCheck className="size-4 shrink-0" />
        Todo en orden
      </div>
    );
  }

  const hayAtrasado = items.some((i) => i.cuando === "ATRASADO");

  return (
    <section
      aria-label="Requiere atención"
      className={`mb-6 overflow-hidden rounded-xl border ${
        hayAtrasado
          ? "border-destructive/40 bg-destructive/5"
          : "border-warning/40 bg-warning-soft/40"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-inherit px-4 py-2.5">
        <TriangleAlert
          className={`size-4 shrink-0 ${hayAtrasado ? "text-destructive" : "text-warning"}`}
        />
        <h2 className="text-sm font-semibold">Requiere atención</h2>
        <span className="text-xs text-muted-foreground">
          ({items.length} {items.length === 1 ? "pendiente" : "pendientes"})
        </span>
      </div>
      <div className="divide-y divide-inherit">
        {items.map((i) => (
          <AgendaLinea key={i.clave} item={i} conPropiedad={false} />
        ))}
      </div>
      <p className="border-t border-inherit px-4 py-2 text-xs text-muted-foreground">
        Cada pendiente se quita solo cuando se resuelve su causa, por ejemplo al
        registrar el pago.
      </p>
    </section>
  );
}
