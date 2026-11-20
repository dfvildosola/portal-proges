// La lista desplegable. Es el <select> del navegador con el estilo de Proges, a propósito: en el
// celular abre el selector propio del teléfono (el más cómodo para el pulgar) y funciona sin
// código extra dentro de un formulario.
//
//   <Select name="responsable" defaultValue="">
//     <option value="">Sin responsable</option>
//     <option value="abc">Pía</option>
//   </Select>
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { estiloCampo } from "./campo-texto";

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(estiloCampo, "h-11 cursor-pointer appearance-none pr-9 lg:h-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-soft" aria-hidden />
    </div>
  );
}
