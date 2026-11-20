"use client";
// Una tarea en una lista: la casilla grande para marcarla hecha y, al lado, qué hay que hacer.
//
// Marcar es de un toque y NO recarga la pantalla: la casilla cambia al instante (se da por hecho
// que va a salir bien) y, si la API la rechaza, vuelve atrás y dice por qué. Otro toque la deshace,
// por si el dedo se equivocó. La usan Hoy, la ficha del servicio y Repartir.
//
// Con `tarea.servicio` (la tarea viene de Hoy o de Repartir) muestra la propiedad y el servicio, y
// toda la fila lleva a la ficha del servicio. Sin eso (dentro de la ficha) solo muestra la tarea.
import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Tarea, TareaConServicio } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Insignia } from "@/componentes/ui/insignia";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { haceCuanto, hoyChile } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { marcarTarea } from "./acciones";

export type PropsDeFilaDeTarea = {
  tarea: Tarea | TareaConServicio;
  /** El servicio donde vive la tarea. Hace falta si la tarea no trae `servicio` (dentro de la ficha). */
  servicioId?: string;
  /** Muestra su fecha de vencimiento (en Hoy no hace falta: el grupo ya dice «hoy» o «mañana»). */
  mostrarFecha?: boolean;
  /** Muestra quién la tiene (en Hoy no: son todas mías). */
  mostrarResponsable?: boolean;
};

export function FilaDeTarea({ tarea, servicioId, mostrarFecha = false, mostrarResponsable = false }: PropsDeFilaDeTarea) {
  const [hecha, setHecha] = useState(tarea.hecha);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  const conServicio = "servicio" in tarea ? tarea : null;
  const idDelServicio = conServicio?.servicio.id ?? servicioId;
  const atrasada = !hecha && tarea.vence !== null && tarea.vence < hoyChile();

  function alTocar() {
    const nueva = !hecha;
    setHecha(nueva);
    setError(null);
    empezar(async () => {
      const resultado = await marcarTarea(tarea.id, nueva, idDelServicio);
      if (!resultado.ok) {
        setHecha(!nueva);
        setError(resultado.error);
      }
    });
  }

  const cuerpo = (
    <>
      <span className={cn("text-[15px] leading-snug font-semibold", hecha && "text-soft line-through")}>{tarea.que}</span>
      {conServicio && (
        <span className="text-xs text-soft">
          {conServicio.propiedad.direccion} · {conServicio.servicio.nombre || ETIQUETA_TIPO_SERVICIO[conServicio.servicio.tipo]}
        </span>
      )}
      {(mostrarResponsable || (mostrarFecha && tarea.vence && !atrasada)) && (
        <span className="text-xs text-soft">
          {mostrarResponsable && (tarea.responsable?.nombre ?? "Sin responsable")}
          {mostrarResponsable && mostrarFecha && tarea.vence && !atrasada && " · "}
          {mostrarFecha && tarea.vence && !atrasada && <Fecha valor={tarea.vence} formato="conDia" />}
        </span>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-stretch gap-1 rounded-xl border border-line bg-card">
        {tarea.esRevision ? (
          // «Revisar y repartir» la abre un pedido y se resuelve en Repartir, no con una casilla.
          <Link href="/repartir" className="flex min-h-14 flex-1 items-center gap-3 px-3 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">{cuerpo}</span>
            <Insignia tono="warn">Revisar pedido</Insignia>
          </Link>
        ) : (
          <>
            <button
              type="button"
              role="checkbox"
              aria-checked={hecha}
              aria-label={hecha ? `Deshacer: ${tarea.que}` : `Marcar hecha: ${tarea.que}`}
              onClick={alTocar}
              disabled={pendiente}
              className="flex min-h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-l-xl disabled:opacity-60"
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 transition-colors",
                  hecha ? "border-ok bg-ok text-card" : "border-line bg-bg",
                )}
              >
                {hecha && <Check className="size-4" aria-hidden strokeWidth={3} />}
              </span>
            </button>
            {idDelServicio ? (
              <Link href={`/servicios/${idDelServicio}`} className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">{cuerpo}</span>
                {atrasada && tarea.vence && <Insignia tono="bad">{haceCuanto(tarea.vence)}</Insignia>}
                <ChevronRight className="size-4 shrink-0 text-soft" aria-hidden />
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">{cuerpo}</span>
                {atrasada && tarea.vence && <Insignia tono="bad">{haceCuanto(tarea.vence)}</Insignia>}
              </div>
            )}
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="px-1 text-xs font-semibold text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
