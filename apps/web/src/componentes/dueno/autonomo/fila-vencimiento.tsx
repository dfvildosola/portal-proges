// Un vencimiento: qué hay que hacer, de qué propiedad, cuándo, y su botón «Que Proges lo haga»,
// que lleva a pedir el servicio ya con la propiedad y el tipo elegidos (esa pantalla es de /mi/pedir).
import Link from "next/link";
import type { VencimientoItem } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { estiloBoton } from "@/componentes/ui/boton";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ETIQUETA_GRAVEDAD } from "./etiquetas";

/** La dirección de «Pedir a Proges» con la propiedad y el tipo de servicio ya elegidos. */
export function enlaceParaPedir(item: VencimientoItem): string | null {
  if (!item.servicioSugerido) return null;
  const consulta = new URLSearchParams();
  if (item.propiedad) consulta.set("propiedad", item.propiedad.id);
  consulta.set("tipo", item.servicioSugerido.tipo);
  return `/mi/pedir?${consulta.toString()}`;
}

export function FilaVencimiento({ item }: { item: VencimientoItem }) {
  const gravedad = ETIQUETA_GRAVEDAD[item.gravedad];
  const pedir = enlaceParaPedir(item);
  const donde = item.propiedad ? `${item.propiedad.direccion}, ${item.propiedad.comuna}` : "Toda tu cartera";

  return (
    <Tarjeta tono="item" className="gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-bold text-balance">{item.texto}</span>
        <span className="text-xs text-soft">
          {donde}
          {item.contrato && <> · {item.contrato.arrendatario}</>}
          {item.monto && (
            <>
              {" · "}
              <Monto valor={item.monto} />
            </>
          )}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Insignia tono={gravedad.tono}>{gravedad.texto}</Insignia>
        <span className="text-xs font-semibold text-soft">
          <Fecha valor={item.fecha} formato={item.gravedad === "alta" ? "relativa" : "conDia"} />
        </span>
        {pedir && (
          <Link href={pedir} className={estiloBoton({ variante: "suave", tamano: "chico" })}>
            Que Proges lo haga
          </Link>
        )}
      </div>
    </Tarjeta>
  );
}
