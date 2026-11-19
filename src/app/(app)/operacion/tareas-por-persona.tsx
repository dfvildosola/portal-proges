// Las tareas abiertas de todos, por persona: para cada una, las atrasadas y las de esta semana
// a la vista, y las de más adelante plegadas. Al final, «Sin responsable» (las que nadie lleva).
// Es lo que la jefatura mira para saber quién va atrasado y qué falta repartir.

import { GrupoDeTareas } from "@/components/tarea-linea";
import { Card } from "@/components/ui/card";
import { agruparTareas, type TareaConProyecto } from "@/lib/tareas";

export type PersonaConTareas = {
  clave: string;
  nombre: string;
  tareas: TareaConProyecto[];
};

export function TareasPorPersona({
  personas,
  sinTareas,
  hoy,
  nombreDe,
}: {
  personas: PersonaConTareas[]; // solo las que tienen tareas abiertas, «Sin responsable» al final
  sinTareas: string[]; // nombres de quien no tiene ninguna abierta
  hoy: Date;
  nombreDe: Map<string, string>;
}) {
  if (personas.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay tareas abiertas con estos filtros.</p>;
  }
  return (
    <div className="space-y-4">
      {personas.map((p) => {
        const { atrasadas, estaSemana, despues } = agruparTareas(p.tareas, hoy);
        return (
          <Card key={p.clave} className="gap-4 px-4 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold">{p.nombre}</h3>
              <p className="text-xs text-muted-foreground">
                {p.tareas.length} {p.tareas.length === 1 ? "abierta" : "abiertas"}
                {atrasadas.length > 0 && (
                  <span className="font-medium text-destructive"> · {atrasadas.length} atrasadas</span>
                )}
              </p>
            </div>
            <GrupoDeTareas titulo="Atrasadas" tareas={atrasadas} hoy={hoy} nombreDe={nombreDe} rojo />
            <GrupoDeTareas titulo="Esta semana" tareas={estaSemana} hoy={hoy} nombreDe={nombreDe} />
            {despues.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Más adelante o sin fecha ({despues.length})
                </summary>
                <div className="mt-2">
                  <GrupoDeTareas tareas={despues} hoy={hoy} nombreDe={nombreDe} />
                </div>
              </details>
            )}
          </Card>
        );
      })}
      {sinTareas.length > 0 && (
        <p className="text-xs text-muted-foreground">Sin tareas abiertas: {sinTareas.join(", ")}.</p>
      )}
    </div>
  );
}
