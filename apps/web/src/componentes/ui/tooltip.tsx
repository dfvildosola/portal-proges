"use client";
// El globito que explica un botón o un dato al pasar el mouse o enfocar con el teclado. Solo
// sirve para aclarar: nada importante puede vivir únicamente aquí, porque en el celular no hay
// «pasar el mouse». `ProveedorDeTooltips` va una vez en el layout raíz.
import { Tooltip as Primitivo } from "@base-ui/react/tooltip";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const ProveedorDeTooltips = Primitivo.Provider;
export const Tooltip = Primitivo.Root;
export const TooltipDisparador = Primitivo.Trigger;

export function TooltipContenido({
  className,
  sideOffset = 6,
  side = "top",
  ...props
}: ComponentProps<typeof Primitivo.Popup> & { sideOffset?: number; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Primitivo.Portal>
      <Primitivo.Positioner side={side} sideOffset={sideOffset} className="z-50">
        <Primitivo.Popup
          className={cn(
            "max-w-xs rounded-md bg-fg px-2.5 py-1.5 text-xs text-bg transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </Primitivo.Positioner>
    </Primitivo.Portal>
  );
}
