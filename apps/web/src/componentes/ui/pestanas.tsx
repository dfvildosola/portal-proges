"use client";
// Las pestañas: cambian lo que se ve en un bloque sin salir de la página (por ejemplo «Resumen» y
// «Documentos» en la ficha de una propiedad). En el celular la fila de pestañas se desliza de lado.
//
//   <Pestanas defaultValue="resumen">
//     <PestanasLista>
//       <Pestana value="resumen">Resumen</Pestana>
//       <Pestana value="docs">Documentos</Pestana>
//     </PestanasLista>
//     <PestanaPanel value="resumen">…</PestanaPanel>
//     <PestanaPanel value="docs">…</PestanaPanel>
//   </Pestanas>
import { Tabs as Primitivo } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Pestanas({ className, ...props }: ComponentProps<typeof Primitivo.Root>) {
  return <Primitivo.Root className={cn("flex flex-col gap-3", className)} {...props} />;
}

export function PestanasLista({ className, ...props }: ComponentProps<typeof Primitivo.List>) {
  return (
    <Primitivo.List
      className={cn("flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]", className)}
      {...props}
    />
  );
}

export function Pestana({ className, ...props }: ComponentProps<typeof Primitivo.Tab>) {
  return (
    <Primitivo.Tab
      className={cn(
        "-mb-px min-h-11 shrink-0 cursor-pointer border-b-2 border-transparent px-3 text-sm font-bold whitespace-nowrap text-soft transition-colors hover:text-fg data-active:border-ink data-active:text-ink lg:min-h-9",
        className,
      )}
      {...props}
    />
  );
}

export function PestanaPanel({ className, ...props }: ComponentProps<typeof Primitivo.Panel>) {
  return <Primitivo.Panel className={cn("outline-none", className)} {...props} />;
}
