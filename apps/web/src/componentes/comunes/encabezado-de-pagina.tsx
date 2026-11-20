// El encabezado de cada pantalla: el título grande, una línea de apoyo debajo y, a la derecha,
// los botones de la pantalla (en el celular bajan debajo del título).
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EncabezadoDePagina({
  titulo,
  subtitulo,
  children,
  className,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-extrabold tracking-tight text-balance">{titulo}</h1>
        {subtitulo && <p className="text-[12.5px] text-soft">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
