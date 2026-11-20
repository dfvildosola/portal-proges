// Un grupo de tareas con su título y su cuenta («Atrasadas 2», «Hoy 3», «Mañana 1»). Si no hay
// ninguna, no dibuja nada (la pantalla decide qué decir cuando todo está vacío).
import type { Tarea, TareaConServicio } from "@proges/contrato";
import { Seccion } from "@/componentes/comunes/seccion";
import { cn } from "@/lib/utils";
import { FilaDeTarea, type PropsDeFilaDeTarea } from "./fila-de-tarea";

export function GrupoDeTareas({
  titulo,
  tareas,
  urgente = false,
  ...propsDeFila
}: {
  titulo: string;
  tareas: (Tarea | TareaConServicio)[];
  /** Pinta la cuenta en rojo (las atrasadas). */
  urgente?: boolean;
} & Omit<PropsDeFilaDeTarea, "tarea">) {
  if (tareas.length === 0) return null;
  return (
    <Seccion
      titulo={titulo}
      derecha={<span className={cn("text-xs font-bold", urgente ? "text-bad" : "text-soft")}>{tareas.length}</span>}
    >
      <ul className="flex flex-col gap-2">
        {tareas.map((tarea) => (
          <li key={tarea.id}>
            <FilaDeTarea tarea={tarea} {...propsDeFila} />
          </li>
        ))}
      </ul>
    </Seccion>
  );
}
