// Una sección de la obra que todavía no tiene nada: en vez de un cuadro grande punteado, una sola
// línea con el nombre, un texto gris que explica qué falta y, al lado, el botón que la llena.
// En el celular el botón baja debajo del texto, para que ambos quepan.
import type { ReactNode } from "react";
import { Tarjeta } from "@/componentes/ui/tarjeta";

export function LineaVacia({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <Tarjeta className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2.5">
      <p className="min-w-0 text-sm text-soft">
        <span className="font-bold text-fg">{titulo}</span> · {texto}
      </p>
      {children && <div className="flex gap-2">{children}</div>}
    </Tarjeta>
  );
}
