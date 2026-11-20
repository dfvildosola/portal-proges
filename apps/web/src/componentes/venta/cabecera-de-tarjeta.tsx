// El título de una tarjeta del panel de venta con, a la derecha, el botón de anotar algo. Va aparte
// del `TarjetaTitulo` para que el botón no herede las mayúsculas ni el espaciado del título.
import type { ReactNode } from "react";
import { TarjetaTitulo } from "@/componentes/ui/tarjeta";

export function CabeceraDeTarjeta({ titulo, accion }: { titulo: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2">
      <TarjetaTitulo>{titulo}</TarjetaTitulo>
      {accion}
    </div>
  );
}
