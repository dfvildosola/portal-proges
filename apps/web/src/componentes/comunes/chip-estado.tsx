// El estado de un servicio como insignia: «En curso», «Terminado», «Cancelado»; y, mientras el
// servicio está abierto, «Nuevo · sin repartir» (viene de un pedido y nadie lo reparte todavía) o
// «Por confirmar» (se dedujo de la carga inicial y falta que el equipo lo confirme).
import type { ServicioEstado } from "@proges/contrato";
import { Insignia, type TonoDeInsignia } from "@/componentes/ui/insignia";
import { ETIQUETA_ESTADO_SERVICIO } from "@/lib/etiquetas";

const TONO: Record<ServicioEstado, TonoDeInsignia> = {
  ABIERTO: "ink",
  TERMINADO: "ok",
  CANCELADO: "neutro",
};

export function ChipEstado({
  estado,
  porRevisar,
  porConfirmar,
  className,
}: {
  estado: ServicioEstado;
  porRevisar?: boolean;
  porConfirmar?: boolean;
  className?: string;
}) {
  if (estado === "ABIERTO" && porRevisar) {
    return (
      <Insignia tono="neutro" className={className}>
        Nuevo · sin repartir
      </Insignia>
    );
  }
  if (estado === "ABIERTO" && porConfirmar) {
    return (
      <Insignia tono="warn" className={className}>
        Por confirmar
      </Insignia>
    );
  }
  return (
    <Insignia tono={TONO[estado]} className={className}>
      {ETIQUETA_ESTADO_SERVICIO[estado]}
    </Insignia>
  );
}
