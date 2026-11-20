// La pestaña «Clientes»: las empresas y personas a las que Proges les presta servicios. Un cliente
// desactivado no se ofrece al equipo y sus llaves dejan de servir, pero sus datos quedan intactos.
import type { ClienteConfig } from "@proges/contrato";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { DialogoDeFormulario } from "./dialogo-de-formulario";
import { FilaDeConfig } from "./fila-de-config";
import { FormularioCliente } from "./formulario-cliente";

const MODO: Record<ClienteConfig["modo"], string> = {
  ATENDIDO: "Atendido: Proges le hace los servicios y él ve el avance",
  AUTONOMO: "Autónomo: lleva su propia cartera y pide servicios cuando quiere",
};

export function ClientesConfig({ clientes }: { clientes: ClienteConfig[] }) {
  return (
    <Seccion
      titulo={`Clientes (${clientes.length})`}
      derecha={
        <DialogoDeFormulario etiqueta="Crear cliente" titulo="Crear un cliente" variante="principal">
          <FormularioCliente />
        </DialogoDeFormulario>
      }
    >
      {clientes.length === 0 ? (
        <Vacio texto="Todavía no hay clientes." />
      ) : (
        <ul className="flex flex-col gap-2">
          {clientes.map((c) => (
            <FilaDeConfig
              key={c.id}
              titulo={c.nombre}
              apagada={!c.activa}
              detalle={MODO[c.modo]}
              etiquetas={!c.activa && <Insignia tono="neutro">Desactivado</Insignia>}
              acciones={
                <DialogoDeFormulario etiqueta="Editar" titulo={`Editar a ${c.nombre}`}>
                  <FormularioCliente cliente={c} />
                </DialogoDeFormulario>
              }
            />
          ))}
        </ul>
      )}
    </Seccion>
  );
}
