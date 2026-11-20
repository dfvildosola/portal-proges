// Las cuatro cifras grandes de arriba de Resultados.
import type { ResultadosCifras } from "@proges/contrato";
import { Monto } from "@/componentes/comunes/monto";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { cn } from "@/lib/utils";
import { decimal } from "./periodo";

function Cifra({ numero, etiqueta, apoyo, tono }: { numero: React.ReactNode; etiqueta: string; apoyo?: React.ReactNode; tono?: "warn" }) {
  return (
    <Tarjeta>
      <p className={cn("text-[26px] leading-none font-extrabold tracking-tight", tono === "warn" && "text-warn")}>{numero}</p>
      <p className="text-[12.5px] text-soft">{etiqueta}</p>
      {apoyo && <p className="text-xs text-soft">{apoyo}</p>}
    </Tarjeta>
  );
}

export function Cifras({ cifras }: { cifras: ResultadosCifras }) {
  const { serviciosCerrados, duracionPromedioDias, porcentajeEsperando, margenObras, margenObrasPorcentaje } = cifras;
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <Cifra numero={serviciosCerrados} etiqueta="servicios cerrados" />
      <Cifra numero={duracionPromedioDias === null ? "—" : `${decimal(duracionPromedioDias)} d`} etiqueta="duración promedio" apoyo={duracionPromedioDias === null ? "Todavía no se cerró ninguno." : undefined} />
      <Cifra numero={porcentajeEsperando === null ? "—" : `${decimal(porcentajeEsperando)} %`} etiqueta="del tiempo esperando a otros" tono="warn" />
      <Cifra
        numero={margenObrasPorcentaje === null ? "—" : `${decimal(margenObrasPorcentaje)} %`}
        etiqueta="margen de las obras"
        apoyo={margenObras ? <Monto valor={margenObras} /> : "Ninguna obra tiene orden de venta en pesos."}
      />
    </div>
  );
}
