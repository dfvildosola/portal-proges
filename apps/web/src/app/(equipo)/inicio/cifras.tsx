// Las cuatro cifras de arriba del Inicio: lo primero que mira la jefatura cada mañana.
// El color dice si hay algo que atender: ámbar cuando hay servicios que llevan mucho esperando,
// rojo cuando hay tareas atrasadas; si todo está en cero, queda el color normal.
import type { InicioEquipo } from "@proges/contrato";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { cn } from "@/lib/utils";

type Tono = "normal" | "warn" | "bad";

function Cifra({ numero, texto, tono = "normal" }: { numero: number; texto: string; tono?: Tono }) {
  return (
    <Tarjeta className="gap-0.5">
      <div
        className={cn(
          "text-[28px] leading-none font-extrabold tracking-tight",
          tono === "warn" && numero > 0 && "text-warn",
          tono === "bad" && numero > 0 && "text-bad",
        )}
      >
        {numero}
      </div>
      <div className="text-[12.5px] text-soft">{texto}</div>
    </Tarjeta>
  );
}

export function Cifras({ cifras }: { cifras: InicioEquipo["cifras"] }) {
  const trabados = cifras.esperandoMasDe10Dias;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cifra numero={cifras.serviciosEnCurso} texto="servicios en curso" />
      <Cifra numero={cifras.nuevosSinRepartir} texto="entraron, sin repartir" />
      <Cifra
        numero={cifras.esperando}
        tono="warn"
        texto={
          trabados > 0
            ? `esperando a otro · ${trabados} hace más de 10 días`
            : "esperando a otro"
        }
      />
      <Cifra numero={cifras.tareasAtrasadas} tono="bad" texto="tareas atrasadas" />
    </div>
  );
}
