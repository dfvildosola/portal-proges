// «Mi trabajo»: el inicio del equipo. Lo que le toca a la persona que entró: sus tareas
// abiertas (las atrasadas arriba, en rojo; después las de esta semana y las de más adelante) y,
// al final, lo que terminó en los últimos 7 días. Pensado para el celular: una columna, cada
// tarea con su propiedad, su cliente y su proyecto enlazados, y el botón «Hecha» a mano.

import { CircleCheck } from "lucide-react";
import { clientesParaElegir, espaciosQueLee, nombresPorId } from "@/lib/org";
import { exigirEquipo } from "@/lib/sesion";
import { hoyChile } from "@/lib/fechas";
import { agruparTareas, tareasAbiertas, tareasHechasDe } from "@/lib/tareas";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { GrupoDeTareas, TareaLinea } from "@/components/tarea-linea";

export default async function MiTrabajoPage() {
  const usuario = await exigirEquipo();
  const hoy = hoyChile();
  const orgIds = await espaciosQueLee();
  const nombreDe = nombresPorId(await clientesParaElegir());

  const [abiertas, hechas] = await Promise.all([
    tareasAbiertas(orgIds, { responsableId: usuario.id }),
    tareasHechasDe(usuario.id, orgIds),
  ]);
  const { atrasadas, estaSemana, despues } = agruparTareas(abiertas, hoy);

  return (
    <>
      <PageHeader
        title="Mi trabajo"
        description={`Hola, ${usuario.nombre.split(" ")[0]}. Esto es lo que te toca.`}
      />

      <div className="space-y-6">
        {abiertas.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="No tienes tareas abiertas"
            description="Cuando la jefatura te asigne una, aparece acá. Las tareas se anotan dentro de cada proyecto."
          />
        ) : (
          <>
            <GrupoDeTareas titulo="Atrasadas" tareas={atrasadas} hoy={hoy} nombreDe={nombreDe} rojo />
            <GrupoDeTareas titulo="Esta semana" tareas={estaSemana} hoy={hoy} nombreDe={nombreDe} />
            <GrupoDeTareas titulo="Más adelante o sin fecha" tareas={despues} hoy={hoy} nombreDe={nombreDe} />
          </>
        )}

        {hechas.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Hechas en los últimos 7 días ({hechas.length})
            </h2>
            <div className="divide-y rounded-xl border">
              {hechas.map((t) => (
                <TareaLinea
                  key={t.id}
                  tarea={t}
                  hoy={hoy}
                  cliente={nombreDe.get(t.organizationId)}
                  conBoton={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
