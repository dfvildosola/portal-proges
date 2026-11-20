// A quién espera Proges, escrito para el dueño: «Esperamos al maestro · 3 d», «Esperamos tu
// respuesta · 2 d» o «Lo estamos trabajando». Es el ChipEsperando del equipo (que dice «Esperando a
// dueño» y «Nos toca») dicho con palabras que el dueño usaría. Pasados 10 días se pone rojo.
import type { EsperandoA } from "@proges/contrato";
import { Insignia } from "@/componentes/ui/insignia";
import { DIAS_PARA_TRABADO } from "@/lib/etiquetas";
import { ESPERAMOS } from "./etiquetas-atendido";

export function ChipDeEspera({
  esperando,
  className,
}: {
  esperando: { a: EsperandoA; detalle?: string | null; dias: number } | null;
  className?: string;
}) {
  if (!esperando) {
    return (
      <Insignia tono="ink" className={className}>
        Lo estamos trabajando
      </Insignia>
    );
  }
  const a = esperando.a === "OTRO" && esperando.detalle ? esperando.detalle : ESPERAMOS[esperando.a];
  return (
    <Insignia tono={esperando.dias > DIAS_PARA_TRABADO ? "bad" : "warn"} className={className}>
      Esperamos {a} · {esperando.dias} d
    </Insignia>
  );
}
