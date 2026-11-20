"use client";
// La hoja lateral: un panel que se desliza desde un borde para mostrar un detalle o un formulario
// más largo que un diálogo, sin salir de la pantalla. En el celular conviene `lado="abajo"`
// (sube desde abajo, al alcance del pulgar); en el computador, `lado="derecha"` (el valor por defecto).
// Se usa igual que el diálogo: HojaDisparador, HojaContenido, HojaTitulo, HojaCerrar.
import { Dialog as Primitivo } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Hoja = Primitivo.Root;
export const HojaDisparador = Primitivo.Trigger;
export const HojaCerrar = Primitivo.Close;

const LADOS = {
  derecha:
    "inset-y-0 right-0 w-full max-w-md border-l data-ending-style:translate-x-8 data-starting-style:translate-x-8",
  abajo:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t data-ending-style:translate-y-8 data-starting-style:translate-y-8",
} as const;

export function HojaContenido({
  className,
  children,
  lado = "derecha",
  ...props
}: ComponentProps<typeof Primitivo.Popup> & { lado?: keyof typeof LADOS }) {
  return (
    <Primitivo.Portal>
      <Primitivo.Backdrop className="fixed inset-0 z-50 bg-velo transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <Primitivo.Popup
        className={cn(
          "fixed z-50 flex flex-col gap-4 overflow-y-auto border-line bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-fg shadow-ventana transition-[opacity,translate] duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
          LADOS[lado],
          className,
        )}
        {...props}
      >
        {children}
        <Primitivo.Close
          aria-label="Cerrar"
          className="absolute top-3 right-3 inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-soft hover:bg-ink-soft"
        >
          <X className="size-4" />
        </Primitivo.Close>
      </Primitivo.Popup>
    </Primitivo.Portal>
  );
}

export function HojaTitulo({ className, ...props }: ComponentProps<typeof Primitivo.Title>) {
  return <Primitivo.Title className={cn("pr-8 text-lg font-extrabold tracking-tight", className)} {...props} />;
}

export function HojaDescripcion({ className, ...props }: ComponentProps<typeof Primitivo.Description>) {
  return <Primitivo.Description className={cn("text-sm text-soft", className)} {...props} />;
}
