// Las tareas del servicio: qué, quién y para cuándo. Usa la fila y el formulario de tarea de la
// pieza J (componentes/tareas/), los mismos que Hoy y Repartir, para que una tarea se marque igual
// en todas partes. Aquí solo se les da el marco: título, cuenta de hechas y el botón de agregar.
import type { EquipoPersona, Tarea } from "@proges/contrato";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { FilaDeTarea } from "@/componentes/tareas/fila-de-tarea";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { NuevaTarea } from "./nueva-tarea";

export function TareasDelServicio({
  servicioId,
  tareas,
  personas,
  puedeAgregar,
}: {
  servicioId: string;
  tareas: Tarea[];
  personas: EquipoPersona[];
  puedeAgregar: boolean;
}) {
  const hechas = tareas.filter((t) => t.hecha).length;
  return (
    <Seccion
      titulo="Tareas"
      derecha={tareas.length > 0 ? <span className="text-xs text-soft">{hechas} de {tareas.length} hechas</span> : undefined}
    >
      <Tarjeta>
        {tareas.length === 0 ? (
          <Vacio texto="Este servicio todavía no tiene tareas." className="border-0 py-4" />
        ) : (
          <ul className="flex flex-col gap-2">
            {tareas.map((t) => (
              <li key={t.id}>
                <FilaDeTarea tarea={t} servicioId={servicioId} mostrarFecha mostrarResponsable />
              </li>
            ))}
          </ul>
        )}
        {puedeAgregar && <NuevaTarea servicioId={servicioId} personas={personas} />}
      </Tarjeta>
    </Seccion>
  );
}
