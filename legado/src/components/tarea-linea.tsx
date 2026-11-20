// Una línea de tarea, igual en «Mi trabajo», en «Trabajo del equipo» y en la sección del proyecto
// que quiera mostrar el contexto: qué hay que hacer, para cuándo (en rojo si ya pasó), de qué
// propiedad, de qué cliente y de qué proyecto, y el botón para marcarla hecha.
// Es un componente de servidor; el botón es el único trozo de cliente.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { diasHasta } from "@/lib/fechas";
import { formatDate } from "@/lib/format";
import { TIPOS_SERVICIO } from "@/lib/servicios";
import type { TareaConProyecto } from "@/lib/tareas";
import { TareaMarcarBoton } from "@/app/(app)/propiedades/[id]/servicios/[sid]/tarea-form";

function Vence({ vence, hoy }: { vence: Date | null; hoy: Date }) {
  if (!vence) return <Badge variant="outline">Sin fecha</Badge>;
  const dias = diasHasta(vence, hoy);
  if (dias < 0) return <Badge variant="destructive">Atrasada · {formatDate(vence)}</Badge>;
  if (dias === 0) return <Badge variant="warning">Hoy</Badge>;
  return <Badge variant="outline">{formatDate(vence)}</Badge>;
}

export function TareaLinea({
  tarea,
  hoy,
  cliente,
  conResponsable = false,
  conBoton = true,
}: {
  tarea: TareaConProyecto;
  hoy: Date; // hoyChile()
  cliente?: string; // el nombre del cliente dueño de la propiedad (solo el equipo ve varios)
  conResponsable?: boolean; // en «Trabajo del equipo» ya viene agrupada por persona: no hace falta
  conBoton?: boolean;
}) {
  const hecha = tarea.hechaEl !== null;
  const { servicioEnCurso: proyecto } = tarea;
  const { property } = proyecto;
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className={`text-sm font-medium break-words ${hecha ? "text-muted-foreground line-through" : ""}`}>
          {tarea.que}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {hecha ? (
            <Badge variant="success">Hecha el {formatDate(tarea.hechaEl)}</Badge>
          ) : (
            <Vence vence={tarea.vence} hoy={hoy} />
          )}
          <Link href={`/propiedades/${property.id}`} className="hover:underline">
            {property.direccion} · {property.comuna}
          </Link>
          {cliente && <Badge variant="arena">{cliente}</Badge>}
          <Link
            href={`/propiedades/${property.id}/servicios/${proyecto.id}`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {TIPOS_SERVICIO[proyecto.tipo].nombre} · {proyecto.servicio.nombre}
          </Link>
          {conResponsable && <span>{tarea.responsable ? `Responsable: ${tarea.responsable.nombre}` : "Sin responsable"}</span>}
        </p>
      </div>
      {conBoton && !hecha && (
        <div className="shrink-0">
          <TareaMarcarBoton tareaId={tarea.id} hecha={false} />
        </div>
      )}
    </div>
  );
}

// Un grupo de tareas con su título y su cuenta (las atrasadas, las de esta semana…). Si no hay
// ninguna, no muestra nada. `rojo` pinta el título con el token de peligro (para las atrasadas).
export function GrupoDeTareas({
  titulo,
  tareas,
  hoy,
  nombreDe,
  rojo = false,
  conResponsable = false,
}: {
  titulo?: string; // sin título, solo la lista (cuando el encabezado ya lo pone quien la envuelve)
  tareas: TareaConProyecto[];
  hoy: Date;
  nombreDe?: Map<string, string>; // id de cliente → nombre
  rojo?: boolean;
  conResponsable?: boolean;
}) {
  if (tareas.length === 0) return null;
  return (
    <div>
      {titulo && (
        <h3 className={`mb-2 text-sm font-medium ${rojo ? "text-destructive" : "text-muted-foreground"}`}>
          {titulo} ({tareas.length})
        </h3>
      )}
      <div className="divide-y rounded-xl border">
        {tareas.map((t) => (
          <TareaLinea
            key={t.id}
            tarea={t}
            hoy={hoy}
            cliente={nombreDe?.get(t.organizationId)}
            conResponsable={conResponsable}
          />
        ))}
      </div>
    </div>
  );
}
