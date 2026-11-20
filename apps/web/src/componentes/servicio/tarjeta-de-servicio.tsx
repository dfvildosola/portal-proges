// Un servicio dentro del tablero: qué es, dónde, de quién y quién lo lleva. Toda la tarjeta es un
// enlace a la ficha. Según la columna cambia la última línea: en «Esperando a otro» va el chip con
// a quién y los días (rojo pasados 10); en las demás, cuántas tareas quedan.
import Link from "next/link";
import type { ServicioTableroItem } from "@proges/contrato";
import { ChipEsperando } from "@/componentes/comunes/chip-esperando";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";

export function TarjetaDeServicio({ servicio, mostrarEspera }: { servicio: ServicioTableroItem; mostrarEspera: boolean }) {
  const pendientes = servicio.tareasPendientes;
  return (
    <Link
      href={`/servicios/${servicio.id}`}
      className="block min-w-0 rounded-[10px] focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none"
    >
      <Tarjeta tono="item" className="gap-1 bg-card hover:border-ink">
        <span className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-bold break-words">
            {ETIQUETA_TIPO_SERVICIO[servicio.tipo]} · {servicio.propiedad.direccion}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-soft">{servicio.responsable?.nombre ?? "Sin responsable"}</span>
        </span>
        <span className="text-xs break-words text-soft">
          {servicio.nombre} · {servicio.cliente.nombre} · {servicio.propiedad.comuna}
        </span>
        {mostrarEspera && servicio.esperando ? (
          <ChipEsperando esperando={servicio.esperando} className="mt-1" />
        ) : (
          <span className="mt-1 text-xs font-semibold">
            {pendientes === 0 ? "Sin tareas pendientes" : pendientes === 1 ? "1 tarea pendiente" : `${pendientes} tareas pendientes`}
          </span>
        )}
      </Tarjeta>
    </Link>
  );
}
