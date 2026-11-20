// «Entró nuevo»: los servicios que llegaron (de un pedido del cliente) y nadie ha repartido.
// Cada uno lleva a Repartir, donde se acepta y se le pone responsable.
import Link from "next/link";
import type { ServicioTableroItem } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { estiloBoton } from "@/componentes/ui/boton";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { haceCuanto } from "@/lib/formato";
import { ItemDelInicio } from "./item-con-enlace";

export function PanelNuevo({ servicios }: { servicios: ServicioTableroItem[] }) {
  return (
    <Tarjeta>
      <TarjetaTitulo>
        <span>Entró nuevo</span>
        <span>{servicios.length}</span>
      </TarjetaTitulo>
      {servicios.length === 0 ? (
        <Vacio texto="Nada nuevo sin repartir." className="py-6" />
      ) : (
        servicios.map((s) => (
          <ItemDelInicio
            key={s.id}
            titulo={s.nombre}
            detalle={`${s.propiedad.direccion} · ${s.cliente.nombre} · entró ${haceCuanto(s.abiertoEl)}`}
            derecha={
              <Link href="/repartir" className={estiloBoton({ variante: "suave", tamano: "chico" })}>
                Repartir
              </Link>
            }
          />
        ))
      )}
    </Tarjeta>
  );
}
