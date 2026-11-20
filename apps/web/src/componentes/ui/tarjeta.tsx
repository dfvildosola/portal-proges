// La tarjeta: el cuadro blanco con borde donde vive cada bloque de una pantalla.
// - `Tarjeta` (por defecto, «panel»): un bloque grande de la pantalla.
// - `Tarjeta tono="item"`: un elemento dentro de un panel o de una columna (una tarea, un servicio).
//   Con `onClick` o dentro de un enlace se ve «tocable».
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const estiloTarjeta = cva("min-w-0 border border-line text-fg", {
  variants: {
    tono: {
      panel: "flex flex-col gap-2 rounded-xl bg-card p-3.5",
      item: "flex flex-col gap-0.5 rounded-[10px] bg-scr px-3 py-2.5",
    },
  },
  defaultVariants: { tono: "panel" },
});

export function Tarjeta({ className, tono, ...props }: ComponentProps<"div"> & VariantProps<typeof estiloTarjeta>) {
  return <div className={cn(estiloTarjeta({ tono }), className)} {...props} />;
}

/** El título chico en mayúsculas de un panel («Entró nuevo», «Trabado»), con un dato a la derecha. */
export function TarjetaTitulo({ className, children, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn("flex items-center justify-between gap-2 text-xs font-bold tracking-[0.07em] text-soft uppercase", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
