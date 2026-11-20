// «Esperando a: conservador · 13 d»: a quién espera Proges en un servicio y desde cuándo.
// Recibe el campo `esperando` del servicio tal como lo entrega la API. Sin espera (null) dice «Nos
// toca» (la pelota está de nuestro lado). Pasados 10 días se pone rojo (trabado); antes, ámbar.
import type { Esperando } from "@proges/contrato";
import { Insignia } from "@/componentes/ui/insignia";
import { DIAS_PARA_TRABADO, ETIQUETA_ESPERANDO_A } from "@/lib/etiquetas";

export function ChipEsperando({ esperando, className }: { esperando: Esperando | null; className?: string }) {
  if (!esperando) {
    return (
      <Insignia tono="ink" className={className}>
        Nos toca
      </Insignia>
    );
  }
  // «Otro» no dice nada solo: se muestra el detalle que escribió el equipo, tal cual.
  const a =
    esperando.a === "OTRO" && esperando.detalle ? esperando.detalle : ETIQUETA_ESPERANDO_A[esperando.a].toLowerCase();
  return (
    <Insignia tono={esperando.dias > DIAS_PARA_TRABADO ? "bad" : "warn"} className={className}>
      Esperando a {a} · {esperando.dias} d
    </Insignia>
  );
}
