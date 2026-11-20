// Servicios que entran y que se cierran, por semana: barras dibujadas con SVG a mano (sin librería
// de gráficos). Azul = entran, verde = se cierran. Cada barra lleva su número en el globito del
// navegador, y debajo del gráfico va el total para quien no pueda ver los colores.
import type { ResultadosSemana } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { fechaCorta } from "@/lib/formato";

const ANCHO = 380;
const ALTO = 170;
const IZQUIERDA = 28;
const ARRIBA = 8;
const ABAJO = 22;

export function GraficoSemanas({ semanas }: { semanas: ResultadosSemana[] }) {
  if (semanas.length === 0) return <Vacio texto="No hay semanas en este período." />;

  const maximo = Math.max(4, ...semanas.flatMap((s) => [s.entran, s.cierran]));
  const alto = ALTO - ARRIBA - ABAJO;
  const y = (valor: number) => ALTO - ABAJO - (valor / maximo) * alto;
  const paso = (ANCHO - IZQUIERDA) / semanas.length;
  const barra = Math.max(1.2, Math.min(12, paso * 0.4));
  // Con muchas semanas no caben todas las etiquetas: se escribe una cada tantas.
  const cadaCuantas = Math.ceil(semanas.length / 8);
  const marcas = [0, Math.round(maximo / 2), maximo];
  const entraron = semanas.reduce((suma, s) => suma + s.entran, 0);
  const cerraron = semanas.reduce((suma, s) => suma + s.cierran, 0);

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" role="img" aria-label={`Servicios por semana: ${entraron} entraron y ${cerraron} se cerraron.`}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={IZQUIERDA} x2={ANCHO} y1={y(m)} y2={y(m)} className="stroke-line" />
            <text x={IZQUIERDA - 5} y={y(m) + 3} textAnchor="end" className="fill-soft text-[9px]">
              {m}
            </text>
          </g>
        ))}
        {semanas.map((s, i) => {
          const x = IZQUIERDA + i * paso + (paso - 2 * barra - 1) / 2;
          return (
            <g key={s.semana}>
              <rect x={x} y={y(s.entran)} width={barra} height={ALTO - ABAJO - y(s.entran)} rx={1.5} className="fill-ink">
                <title>{`Semana del ${fechaCorta(s.semana)}: entraron ${s.entran}`}</title>
              </rect>
              <rect x={x + barra + 1} y={y(s.cierran)} width={barra} height={ALTO - ABAJO - y(s.cierran)} rx={1.5} className="fill-ok">
                <title>{`Semana del ${fechaCorta(s.semana)}: se cerraron ${s.cierran}`}</title>
              </rect>
              {i % cadaCuantas === 0 && (
                <text x={x + barra} y={ALTO - 6} textAnchor="middle" className="fill-soft text-[8px]">
                  {fechaCorta(s.semana)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-soft">
        <span>
          <span className="font-bold text-ink">■</span> Entraron: <b className="text-fg">{entraron}</b>
        </span>
        <span>
          <span className="font-bold text-ok">■</span> Se cerraron: <b className="text-fg">{cerraron}</b>
        </span>
        <span>Cada grupo de barras es una semana (se muestra el lunes).</span>
      </p>
    </div>
  );
}
