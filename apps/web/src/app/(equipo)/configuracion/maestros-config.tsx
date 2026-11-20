// La pestaña «Maestros»: la gente que hace los trabajos de las obras. Un maestro es un proveedor
// de Odoo; aquí solo se le agrega lo que Odoo no sabe (su especialidad).
import type { Maestro } from "@proges/contrato";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { DialogoDeFormulario } from "./dialogo-de-formulario";
import { FilaDeConfig } from "./fila-de-config";
import { FormularioMaestro } from "./formulario-maestro";
import { FormularioMaestroNuevo } from "./formulario-maestro-nuevo";

export function MaestrosConfig({ maestros }: { maestros: Maestro[] }) {
  return (
    <Seccion
      titulo={`Maestros (${maestros.length})`}
      derecha={
        <DialogoDeFormulario
          etiqueta="Agregar maestro"
          titulo="Agregar un maestro"
          descripcion="Se busca entre los proveedores que ya están en Odoo."
          variante="principal"
        >
          <FormularioMaestroNuevo />
        </DialogoDeFormulario>
      }
    >
      {maestros.length === 0 ? (
        <Vacio texto="Todavía no hay maestros. Agrega el primero buscándolo en Odoo." />
      ) : (
        <ul className="flex flex-col gap-2">
          {maestros.map((m) => (
            <FilaDeConfig
              key={m.id}
              titulo={m.nombre}
              apagada={!m.activo}
              detalle={[m.especialidad ?? "Sin especialidad", m.telefono].filter(Boolean).join(" · ")}
              etiquetas={!m.activo && <Insignia tono="neutro">Desactivado</Insignia>}
              acciones={
                <DialogoDeFormulario etiqueta="Editar" titulo={`Editar a ${m.nombre}`}>
                  <FormularioMaestro maestro={m} />
                </DialogoDeFormulario>
              }
            />
          ))}
        </ul>
      )}
    </Seccion>
  );
}
