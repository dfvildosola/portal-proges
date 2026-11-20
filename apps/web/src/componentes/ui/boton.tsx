// El botón. Cuatro variantes: `principal` (la acción de la pantalla), `contorno` (acción
// secundaria), `suave` y `fantasma` (acciones discretas), y `peligro` (borrar, rechazar).
// Para que un enlace (<Link>) se vea como botón, usa `estiloBoton({...})` en su className.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const estiloBoton = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[9px] font-bold transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variante: {
        principal: "bg-ink text-card hover:opacity-90",
        contorno: "border-[1.5px] border-ink bg-transparent text-ink hover:bg-ink-soft",
        suave: "bg-ink-soft text-ink hover:opacity-80",
        fantasma: "bg-transparent text-fg hover:bg-ink-soft",
        peligro: "bg-bad-soft text-bad hover:opacity-80",
      },
      // En el celular los botones son más altos (un dedo necesita al menos ~44 px para acertar).
      tamano: {
        normal: "h-11 px-4 text-sm lg:h-9 lg:px-3.5 lg:text-[13px]",
        chico: "h-9 px-3 text-[13px] lg:h-8 lg:text-xs",
        // Para botones dentro de una tarjeta: chico en el computador, pero de dedo en el celular.
        compacto: "h-11 px-3 text-sm lg:h-8 lg:text-xs",
        icono: "size-11 lg:size-9",
      },
    },
    defaultVariants: { variante: "principal", tamano: "normal" },
  },
);

export type PropsDeBoton = ComponentProps<"button"> & VariantProps<typeof estiloBoton>;

export function Boton({ className, variante, tamano, type = "button", ...props }: PropsDeBoton) {
  return <button type={type} className={cn(estiloBoton({ variante, tamano }), className)} {...props} />;
}
