// Una lista de hechos de la propiedad, de más nuevo a más antiguo, cada uno con su punto de color
// a la izquierda. La usan el resumen (los 4 últimos) y el historial (todos).
import type { HistorialItem } from "@proges/contrato";
import Link from "next/link";
import { Fecha } from "@/componentes/comunes/fecha";
import { cn } from "@/lib/utils";
import { ETIQUETA_HECHO, TONO_HECHO } from "./etiquetas-ficha";

const COLOR_PUNTO = {
  neutro: "bg-soft",
  ink: "bg-ink",
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
} as const;

export function LineaDeTiempo({ hechos }: { hechos: HistorialItem[] }) {
  return (
    <ol className="flex flex-col">
      {hechos.map((hecho) => (
        <li key={hecho.id} className="flex gap-3 border-b border-line py-2.5 last:border-b-0">
          <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", COLOR_PUNTO[TONO_HECHO[hecho.tipo]])} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="text-xs text-soft">
              <Fecha valor={hecho.fecha} formato="conAnio" /> · {ETIQUETA_HECHO[hecho.tipo]}
            </div>
            <div className="text-sm font-bold break-words">{hecho.titulo}</div>
            {hecho.detalle && <div className="text-[13px] break-words text-soft">{hecho.detalle}</div>}
            {hecho.servicioId && (
              <Link href={`/servicios/${encodeURIComponent(hecho.servicioId)}`} className="w-fit text-xs font-bold text-ink hover:underline">
                Abrir el servicio
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
