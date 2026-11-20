// Los dueños de la propiedad con su porcentaje (una persona o una sociedad puede ser dueña de varias).
import type { DuenoEntidad, PropiedadDueno } from "@proges/contrato";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { quitarDueno } from "./acciones";
import { BotonQuitar } from "./boton-quitar";
import { FormularioDueno } from "./formulario-dueno";

type Props = { propiedadId: string; duenos: PropiedadDueno[]; existentes: DuenoEntidad[]; puedeEditar: boolean };

export function BloqueDuenos({ propiedadId, duenos, existentes, puedeEditar }: Props) {
  // Los que ya figuran en esta propiedad no se ofrecen otra vez (la API respondería que ya está).
  const yaEstan = new Set(duenos.map((d) => d.dueno.id));
  return (
    <Tarjeta>
      <TarjetaTitulo>
        Dueños
        {puedeEditar && <FormularioDueno propiedadId={propiedadId} existentes={existentes.filter((e) => !yaEstan.has(e.id))} />}
      </TarjetaTitulo>
      {duenos.length === 0 ? (
        <p className="py-2 text-sm text-soft">Todavía no hay dueños anotados.</p>
      ) : (
        duenos.map((d) => (
          <Tarjeta tono="item" key={d.id} className="flex-row items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-bold break-words">{d.dueno.nombre}</span>
              <span className="text-xs text-soft">
                {d.dueno.rut} · {d.dueno.tipo === "SOCIEDAD" ? "sociedad" : "persona"}
                {d.dueno.grupoNombre ? ` · grupo ${d.dueno.grupoNombre}` : ""}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Insignia tono="ink">{d.porcentaje} %</Insignia>
              {puedeEditar && (
                <BotonQuitar
                  titulo={`Quitar a ${d.dueno.nombre}`}
                  descripcion="Se quita de esta propiedad; la persona o sociedad sigue existiendo."
                  etiqueta={`Quitar a ${d.dueno.nombre}`}
                  accion={quitarDueno.bind(null, propiedadId, d.id)}
                />
              )}
            </span>
          </Tarjeta>
        ))
      )}
    </Tarjeta>
  );
}
