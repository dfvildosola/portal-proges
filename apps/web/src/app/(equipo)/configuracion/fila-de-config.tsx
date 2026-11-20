// Una fila de cualquier lista de Configuración: lo principal y lo de apoyo a la izquierda, las
// etiquetas (activo, jefatura…) y los botones a la derecha. En el celular los botones bajan.
import type { ReactNode } from "react";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { cn } from "@/lib/utils";

export function FilaDeConfig({
  titulo,
  detalle,
  etiquetas,
  acciones,
  apagada,
}: {
  titulo: string;
  detalle?: ReactNode;
  etiquetas?: ReactNode;
  acciones?: ReactNode;
  /** Un registro desactivado se ve más tenue. */
  apagada?: boolean;
}) {
  return (
    <li>
      <Tarjeta tono="item" className="gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className={cn("flex min-w-0 flex-col gap-0.5", apagada && "opacity-60")}>
          <span className="truncate text-[13.5px] font-bold">{titulo}</span>
          {detalle && <span className="text-xs break-words text-soft">{detalle}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {etiquetas}
          {acciones}
        </div>
      </Tarjeta>
    </li>
  );
}
