// El bloque «Para decidir» del seguimiento de una venta o un arriendo: las ofertas que Proges le
// mostró al dueño y esperan su respuesta. Va encima del reporte (PanelVenta), que ya lista todas las
// ofertas; aquí solo están las que necesitan una decisión, para no repetir la lista.
import type { ServicioTipo, TrabajoPropiedad } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Seccion } from "@/componentes/comunes/seccion";
import { ofertasPorResponder } from "./ofertas-pendientes";
import { TarjetaPorResponder } from "./tarjeta-por-responder";

type Servicio = { id: string; tipo: ServicioTipo; nombre: string; propiedad: TrabajoPropiedad };

export async function OfertasPorResponder({ servicio }: { servicio: Servicio }) {
  const { pendientes, error } = await ofertasPorResponder([servicio]);
  if (error) return <ErrorDeCarga mensaje={error} />;
  if (pendientes.length === 0) return null;
  return (
    <Seccion titulo={`Para decidir · ${pendientes.length}`}>
      <div className="flex flex-col gap-3">
        {pendientes.map((p) => (
          <TarjetaPorResponder key={p.oferta.id} item={p} conEnlace={false} />
        ))}
      </div>
    </Seccion>
  );
}
