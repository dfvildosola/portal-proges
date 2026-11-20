// El historial de avalúos fiscales de la propiedad, uno por año, del más nuevo al más antiguo.
import type { PropiedadAvaluo } from "@proges/contrato";
import { Monto } from "@/componentes/comunes/monto";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { quitarAvaluo } from "./acciones";
import { BotonQuitar } from "./boton-quitar";
import { FormularioAvaluo } from "./formulario-avaluo";

export function BloqueAvaluos({ propiedadId, avaluos, puedeEditar }: { propiedadId: string; avaluos: PropiedadAvaluo[]; puedeEditar: boolean }) {
  return (
    <Tarjeta>
      <TarjetaTitulo>
        Avalúo fiscal por año
        {puedeEditar && <FormularioAvaluo propiedadId={propiedadId} />}
      </TarjetaTitulo>
      {avaluos.length === 0 ? (
        <p className="py-2 text-sm text-soft">Todavía no hay avalúos anotados.</p>
      ) : (
        avaluos.map((a) => (
          <Tarjeta tono="item" key={a.id} className="flex-row items-center justify-between gap-2">
            <span className="text-sm font-bold">{a.anio}</span>
            <span className="flex items-center gap-1">
              <Monto valor={a.valor} className="text-sm" />
              {puedeEditar && (
                <BotonQuitar titulo={`Quitar el avalúo de ${a.anio}`} etiqueta={`Quitar avalúo ${a.anio}`} accion={quitarAvaluo.bind(null, propiedadId, a.id)} />
              )}
            </span>
          </Tarjeta>
        ))
      )}
    </Tarjeta>
  );
}
