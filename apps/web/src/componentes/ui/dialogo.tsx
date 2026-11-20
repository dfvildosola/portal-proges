"use client";
// El diálogo: una ventana en el centro que pide confirmar o llenar algo corto, y tapa lo demás.
//
//   <Dialogo>
//     <DialogoDisparador render={<Boton />}>Rechazar</DialogoDisparador>
//     <DialogoContenido>
//       <DialogoTitulo>¿Rechazar el presupuesto?</DialogoTitulo>
//       …
//       <DialogoPie><DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar></DialogoPie>
//     </DialogoContenido>
//   </Dialogo>
//
// Se cierra con Escape o tocando fuera. Para controlarlo desde código: `open` y `onOpenChange`.
import { Dialog as Primitivo } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialogo = Primitivo.Root;
export const DialogoDisparador = Primitivo.Trigger;
export const DialogoCerrar = Primitivo.Close;

export function DialogoContenido({ className, children, ...props }: ComponentProps<typeof Primitivo.Popup>) {
  return (
    <Primitivo.Portal>
      <Primitivo.Backdrop className="fixed inset-0 z-50 bg-velo transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <Primitivo.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-card p-5 text-fg shadow-ventana transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0",
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

export function DialogoTitulo({ className, ...props }: ComponentProps<typeof Primitivo.Title>) {
  return <Primitivo.Title className={cn("pr-8 text-lg font-extrabold tracking-tight", className)} {...props} />;
}

export function DialogoDescripcion({ className, ...props }: ComponentProps<typeof Primitivo.Description>) {
  return <Primitivo.Description className={cn("text-sm text-soft", className)} {...props} />;
}

export function DialogoPie({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
