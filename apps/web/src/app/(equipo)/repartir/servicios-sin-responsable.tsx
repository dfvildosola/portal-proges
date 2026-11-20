// «Servicios sin responsable»: servicios abiertos que ya se aceptaron pero nadie lleva. (Los que
// recién entraron de un pedido se reparten arriba, al aceptar el pedido.) Si no hay ninguno, la
// sección no se dibuja: no hay nada que repartir.
import type { EquipoPersona, ServicioTableroItem } from "@proges/contrato";
import { Seccion } from "@/componentes/comunes/seccion";
import { FilaServicioSinResponsable } from "./fila-servicio-sin-responsable";

export function ServiciosSinResponsable({
  servicios,
  personas,
}: {
  servicios: ServicioTableroItem[];
  personas: EquipoPersona[];
}) {
  if (servicios.length === 0) return null;
  return (
    <Seccion titulo="Servicios sin responsable" derecha={<span className="text-xs font-bold text-soft">{servicios.length}</span>}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {servicios.map((s) => (
          <FilaServicioSinResponsable key={s.id} servicio={s} personas={personas} />
        ))}
      </div>
    </Seccion>
  );
}
