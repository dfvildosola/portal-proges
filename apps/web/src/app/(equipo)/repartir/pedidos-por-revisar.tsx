// «Pedidos de clientes»: la bandeja con lo que los clientes pidieron y el equipo aún no revisa,
// los más antiguos primero. Aquí se aceptan (y se reparten) o se rechazan. Sin pedidos, no se dibuja.
import type { CatalogoServicio, EquipoPersona, PedidoEquipo } from "@proges/contrato";
import { Seccion } from "@/componentes/comunes/seccion";
import { PedidoPorRevisar } from "./pedido-por-revisar";

export function PedidosPorRevisar({
  pedidos,
  catalogo,
  personas,
}: {
  pedidos: PedidoEquipo[];
  catalogo: CatalogoServicio[];
  personas: EquipoPersona[];
}) {
  if (pedidos.length === 0) return null;
  return (
    <Seccion titulo="Pedidos de clientes por revisar" derecha={<span className="text-xs font-bold text-soft">{pedidos.length}</span>}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.map((p) => (
          <PedidoPorRevisar key={p.id} pedido={p} catalogo={catalogo} personas={personas} />
        ))}
      </div>
    </Seccion>
  );
}
