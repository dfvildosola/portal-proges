// La sección «Tareas» de un proyecto, para el EQUIPO: lo que hay que hacer, quién y para cuándo.
// Arriba el formulario para anotar una tarea; debajo las abiertas (con sus botones) y, plegadas,
// las hechas. Un cliente nunca la ve: si quien mira no es del equipo, no muestra nada.
//
// Uso (lo arma la página del proyecto): <TareasSeccion servicioEnCursoId={s.id} />

import { ListChecks } from "lucide-react";
import { db } from "@/lib/db";
import { espaciosQueLee, puedeLeerEn } from "@/lib/org";
import { usuarioActual } from "@/lib/sesion";
import { equipoActivo } from "@/lib/operacion";
import { hoyChile, diasHasta } from "@/lib/fechas";
import { formatDate } from "@/lib/format";
import { tareasDelProyecto, type TareaConProyecto } from "@/lib/tareas";
import { Badge } from "@/components/ui/badge";
import { TareaAgregarForm, TareaBorrarBoton, TareaEditarDialogo, TareaMarcarBoton } from "./tarea-form";

type Responsables = { id: string; nombre: string }[];

function FilaAbierta({
  tarea,
  hoy,
  responsables,
}: {
  tarea: TareaConProyecto;
  hoy: Date;
  responsables: Responsables;
}) {
  const atrasada = tarea.vence !== null && diasHasta(tarea.vence, hoy) < 0;
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium break-words">{tarea.que}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {tarea.vence ? (
            <Badge variant={atrasada ? "destructive" : "outline"}>
              {atrasada ? "Atrasada · " : ""}
              {formatDate(tarea.vence)}
            </Badge>
          ) : (
            <Badge variant="outline">Sin fecha</Badge>
          )}
          <span>{tarea.responsable ? tarea.responsable.nombre : "Sin responsable"}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <TareaMarcarBoton tareaId={tarea.id} hecha={false} />
        <TareaEditarDialogo
          tarea={{
            id: tarea.id,
            que: tarea.que,
            responsableId: tarea.responsable?.id ?? null,
            vence: tarea.vence,
          }}
          responsables={responsables}
        />
        <TareaBorrarBoton tareaId={tarea.id} />
      </div>
    </li>
  );
}

function FilaHecha({ tarea }: { tarea: TareaConProyecto }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground line-through break-words">{tarea.que}</p>
        <p className="text-xs text-muted-foreground">
          Hecha el {formatDate(tarea.hechaEl)}
          {tarea.hechaPor ? ` por ${tarea.hechaPor.nombre}` : ""}
          {tarea.responsable ? ` · Responsable: ${tarea.responsable.nombre}` : ""}
        </p>
      </div>
      <div className="shrink-0">
        <TareaMarcarBoton tareaId={tarea.id} hecha />
      </div>
    </li>
  );
}

export async function TareasSeccion({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "EQUIPO") return null;

  // El proyecto se comprueba contra los espacios que se pueden leer: un id ajeno no muestra nada.
  const proyecto = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { organizationId: true, estado: true },
  });
  if (!proyecto || !(await puedeLeerEn(proyecto.organizationId))) return null;

  const [{ abiertas, hechas }, responsables] = await Promise.all([
    tareasDelProyecto(servicioEnCursoId, await espaciosQueLee()),
    equipoActivo(),
  ]);
  const hoy = hoyChile();

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <ListChecks className="size-5 text-muted-foreground" />
        Tareas
      </h2>

      {proyecto.estado === "ABIERTO" ? (
        <TareaAgregarForm servicioEnCursoId={servicioEnCursoId} responsables={responsables} />
      ) : (
        <p className="text-sm text-muted-foreground">Este proyecto está cerrado: ya no se anotan tareas.</p>
      )}

      {abiertas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay tareas abiertas.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {abiertas.map((t) => (
            <FilaAbierta key={t.id} tarea={t} hoy={hoy} responsables={responsables} />
          ))}
        </ul>
      )}

      {hechas.length > 0 && (
        <details className="rounded-xl border">
          <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground">
            Hechas ({hechas.length})
          </summary>
          <ul className="divide-y border-t">
            {hechas.map((t) => (
              <FilaHecha key={t.id} tarea={t} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
