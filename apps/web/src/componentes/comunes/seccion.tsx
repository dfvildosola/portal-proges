// Una sección de una pantalla: un título chico en mayúsculas (como los de la maqueta), a la derecha
// lo que quieras poner (un contador, un botón) y debajo el contenido.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Seccion({
  titulo,
  derecha,
  children,
  className,
}: {
  titulo: string;
  derecha?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold tracking-[0.07em] text-soft uppercase">{titulo}</h2>
        {derecha}
      </div>
      {children}
    </section>
  );
}
