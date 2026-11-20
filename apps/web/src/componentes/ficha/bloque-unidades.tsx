// Las unidades anexas de la propiedad (estacionamientos y bodegas que se administran con ella).
import type { PropiedadUnidad } from "@proges/contrato";
import { Monto } from "@/componentes/comunes/monto";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { quitarUnidad } from "./acciones";
import { BotonQuitar } from "./boton-quitar";
import { FormularioUnidad } from "./formulario-unidad";

export function BloqueUnidades({ propiedadId, unidades, puedeEditar }: { propiedadId: string; unidades: PropiedadUnidad[]; puedeEditar: boolean }) {
  return (
    <Tarjeta>
      <TarjetaTitulo>
        Estacionamientos y bodegas
        {puedeEditar && <FormularioUnidad propiedadId={propiedadId} />}
      </TarjetaTitulo>
      {unidades.length === 0 ? (
        <p className="py-2 text-sm text-soft">No tiene unidades anexas.</p>
      ) : (
        unidades.map((u) => (
          <Tarjeta tono="item" key={u.id} className="flex-row items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-bold">
                {u.tipo === "BODEGA" ? "Bodega" : "Estacionamiento"} {u.numero}
              </span>
              <span className="text-xs text-soft">
                {u.rolSII ? `Rol ${u.rolSII} · ` : ""}avalúo <Monto valor={u.avaluoFiscal} />
              </span>
            </div>
            {puedeEditar && (
              <BotonQuitar
                titulo={`Quitar ${u.tipo === "BODEGA" ? "la bodega" : "el estacionamiento"} ${u.numero}`}
                etiqueta={`Quitar ${u.tipo === "BODEGA" ? "bodega" : "estacionamiento"} ${u.numero}`}
                accion={quitarUnidad.bind(null, propiedadId, u.id)}
              />
            )}
          </Tarjeta>
        ))
      )}
    </Tarjeta>
  );
}
