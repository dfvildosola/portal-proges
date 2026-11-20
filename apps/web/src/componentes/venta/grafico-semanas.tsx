// Consultas y visitas semana a semana, como barras hechas con cajas (sin librerías de gráficos).
// Cada semana tiene dos barras: consultas (color de marca) y visitas (verde). La altura de cada una
// es proporcional a la semana con más movimiento. Nada depende solo del color: cada barra lleva su
// número encima y el gráfico entero tiene una descripción para lectores de pantalla.
import type { VentaSemana } from "@proges/contrato";
import { fechaCorta } from "@/lib/formato";

const MAXIMO_DE_SEMANAS = 12;

export function GraficoSemanas({ semanas }: { semanas: VentaSemana[] }) {
  const mostradas = semanas.slice(-MAXIMO_DE_SEMANAS);
  if (mostradas.length === 0) {
    return <p className="py-6 text-center text-sm text-soft">Todavía no hay semanas con cifras anotadas.</p>;
  }
  const tope = Math.max(1, ...mostradas.flatMap((s) => [s.consultas, s.visitas]));
  const resumen = mostradas
    .map((s) => `semana del ${fechaCorta(s.semana)}: ${s.consultas} consultas y ${s.visitas} visitas`)
    .join("; ");

  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label={`Consultas y visitas por semana. ${resumen}.`} className="flex h-36 items-end gap-1.5">
        {mostradas.map((s) => (
          <div key={s.semana} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1" title={`Semana del ${fechaCorta(s.semana)}`}>
            <div className="flex flex-1 items-end justify-center gap-0.5">
              <Barra cantidad={s.consultas} tope={tope} color="bg-ink" />
              <Barra cantidad={s.visitas} tope={tope} color="bg-ok" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-soft">
        <span>{fechaCorta(mostradas[0]!.semana)}</span>
        <span>{fechaCorta(mostradas[mostradas.length - 1]!.semana)}</span>
      </div>
      <div className="flex gap-4 text-xs text-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-ink" aria-hidden /> consultas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-ok" aria-hidden /> visitas
        </span>
      </div>
    </div>
  );
}

function Barra({ cantidad, tope, color }: { cantidad: number; tope: number; color: string }) {
  return (
    <div className="flex h-full w-full max-w-4 flex-col justify-end items-center gap-0.5">
      <span className="text-[10px] leading-none font-bold tabular-nums">{cantidad > 0 ? cantidad : ""}</span>
      <div className={`w-full rounded-t-sm ${color}`} style={{ height: `${(cantidad / tope) * 85}%`, minHeight: cantidad > 0 ? 2 : 0 }} />
    </div>
  );
}
