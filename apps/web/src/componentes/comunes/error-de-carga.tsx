"use client";
// Lo que se ve cuando no se pudo cargar algo: el mensaje que escribió la API (ya viene para una
// persona) y, si se le pasa `reintentar`, un botón «Intentar de nuevo». Lo usa el `error.tsx` de la
// web, y cualquier bloque que quiera avisar que falló sin tumbar toda la pantalla.
import { TriangleAlert } from "lucide-react";
import { Boton } from "@/componentes/ui/boton";
import { cn } from "@/lib/utils";

export function ErrorDeCarga({
  mensaje,
  reintentar,
  className,
}: {
  mensaje: string;
  reintentar?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-3 rounded-xl bg-bad-soft p-4 text-sm text-bad", className)}>
      <p className="flex items-start gap-2 font-semibold">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        {mensaje}
      </p>
      {reintentar && (
        <Boton variante="contorno" tamano="chico" onClick={reintentar}>
          Intentar de nuevo
        </Boton>
      )}
    </div>
  );
}
