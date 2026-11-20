// El campo de varias líneas (notas, comentarios).
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { estiloCampo } from "./campo-texto";

export function AreaTexto({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(estiloCampo, "min-h-20 resize-y py-2.5", className)} {...props} />;
}
