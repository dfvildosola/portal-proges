// El estado vacío: lo que se ve cuando una lista no tiene nada («No hay tareas para hoy»). Siempre
// con un texto que diga qué pasa; nunca un cuadro en blanco.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Vacio({ texto, children, className }: { texto: string; children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-soft",
        className,
      )}
    >
      <p>{texto}</p>
      {children}
    </div>
  );
}
