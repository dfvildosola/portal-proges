"use client";
// El menú desplegable: un botón que abre una lista corta de acciones («Editar», «Cancelar servicio»).
//
//   <Menu>
//     <MenuDisparador render={<Boton variante="fantasma" tamano="icono" aria-label="Más" />}>…</MenuDisparador>
//     <MenuContenido>
//       <MenuItem onClick={…}>Editar</MenuItem>
//       <MenuSeparador />
//       <MenuItem peligro onClick={…}>Cancelar</MenuItem>
//     </MenuContenido>
//   </Menu>
import { Menu as Primitivo } from "@base-ui/react/menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Menu = Primitivo.Root;
export const MenuDisparador = Primitivo.Trigger;

export function MenuContenido({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof Primitivo.Popup> & { align?: "start" | "center" | "end"; sideOffset?: number }) {
  return (
    <Primitivo.Portal>
      <Primitivo.Positioner align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <Primitivo.Popup
          className={cn(
            "min-w-44 rounded-xl border border-line bg-card p-1 text-fg shadow-ventana outline-none transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </Primitivo.Positioner>
    </Primitivo.Portal>
  );
}

export function MenuItem({
  className,
  peligro,
  ...props
}: ComponentProps<typeof Primitivo.Item> & { peligro?: boolean }) {
  return (
    <Primitivo.Item
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-ink-soft lg:min-h-8",
        peligro && "text-bad data-highlighted:bg-bad-soft",
        className,
      )}
      {...props}
    />
  );
}

export function MenuEtiqueta({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-3 py-1.5 text-[11px] font-bold tracking-[0.07em] text-soft uppercase", className)} {...props} />;
}

export function MenuSeparador({ className, ...props }: ComponentProps<typeof Primitivo.Separator>) {
  return <Primitivo.Separator className={cn("my-1 h-px bg-line", className)} {...props} />;
}
