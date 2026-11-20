// El campo de una línea. Va dentro de un `CampoFormulario` (que pone la etiqueta y el error); si el
// campo está en error, el borde se pone rojo solo (ver CampoFormulario).
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const estiloCampo =
  "w-full min-w-0 rounded-[10px] border border-line bg-card px-3 text-fg outline-none transition-colors placeholder:text-soft focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:cursor-not-allowed disabled:opacity-50 group-data-invalido/campo:border-bad";

export function CampoTexto({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} className={cn(estiloCampo, "h-11 lg:h-9", className)} {...props} />;
}
