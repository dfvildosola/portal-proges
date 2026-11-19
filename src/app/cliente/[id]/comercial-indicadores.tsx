// Los cuatro indicadores de un servicio de venta o arriendo. Vienen ya calculados
// por src/lib/servicios.ts: son los mismos números que ve el equipo en la ficha.
import type { IndicadoresComerciales } from "@/lib/servicios";

function Indicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{valor}</p>
    </div>
  );
}

const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export function ComercialIndicadores({ indicadores }: { indicadores: IndicadoresComerciales }) {
  const { diasPublicada, visitasUltimaSemana, visitasPorSemana, diasDesdeUltimaRebaja } = indicadores;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Indicador titulo="Días publicada" valor={dias(diasPublicada)} />
      <Indicador titulo="Visitas, última semana" valor={String(visitasUltimaSemana)} />
      <Indicador
        titulo="Visitas por semana"
        valor={visitasPorSemana.toLocaleString("es-CL", { maximumFractionDigits: 1 })}
      />
      <Indicador
        titulo="Desde la última rebaja"
        valor={diasDesdeUltimaRebaja === null ? "Sin rebajas" : dias(diasDesdeUltimaRebaja)}
      />
    </div>
  );
}
