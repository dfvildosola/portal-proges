// Una casilla de verificación. Marcada se envía como «on»; sin marcar no se envía nada (usa
// `casillaDe(datos, "campo")` de lib/acciones.ts para leerla). El área tocable es grande a propósito.
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Casilla({
  className,
  children,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { children?: ReactNode }) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 text-sm lg:min-h-8", className)}>
      <input type="checkbox" className="size-5 shrink-0 cursor-pointer accent-ink lg:size-4" {...props} />
      {children}
    </label>
  );
}
