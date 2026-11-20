// «Entró nuevo»: los servicios que falta confirmar o repartir (los mismos de la columna «Nuevo» del
// tablero y de la cifra «nuevos» de arriba). Con 30 o más a la vez la lista taparía todo el
// Inicio, así que se muestran los primeros y un enlace lleva al tablero con todos.
import Link from "next/link";
import type { ServicioTableroItem } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { estiloBoton } from "@/componentes/ui/boton";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { haceCuanto } from "@/lib/formato";
import { ItemDelInicio } from "./item-con-enlace";

const MAXIMO_VISIBLE = 6;

export function PanelNuevo({ servicios, total }: { servicios: ServicioTableroItem[]; total: number }) {
  const visibles = servicios.slice(0, MAXIMO_VISIBLE);
  return (
    <Tarjeta>
      <TarjetaTitulo>
        <span>Entró nuevo</span>
        <span>{total}</span>
      </TarjetaTitulo>
      {visibles.length === 0 ? (
        <Vacio texto="Nada nuevo por confirmar ni repartir." className="py-6" />
      ) : (
        visibles.map((s) => {
          const detalle = `${s.propiedad.direccion} · ${s.cliente.nombre} · entró ${haceCuanto(s.abiertoEl)}`;
          // Un pedido del dueño se acepta en Repartir; los demás se abren en su ficha, donde se
          // confirman o se les pone responsable.
          return s.porRevisar ? (
            <ItemDelInicio
              key={s.id}
              titulo={s.nombre}
              detalle={detalle}
              derecha={
                <Link href="/repartir" className={estiloBoton({ variante: "suave", tamano: "chico" })}>
                  Repartir
                </Link>
              }
            />
          ) : (
            <ItemDelInicio
              key={s.id}
              titulo={s.nombre}
              detalle={detalle}
              href={`/servicios/${s.id}`}
              derecha={<Insignia tono="warn">{s.porConfirmar ? "Por confirmar" : "Sin responsable"}</Insignia>}
            />
          );
        })
      )}
      {total > visibles.length ? (
        <Link href="/servicios" className="text-xs font-bold text-ink hover:underline">
          Ver los {total} en Servicios
        </Link>
      ) : null}
    </Tarjeta>
  );
}
