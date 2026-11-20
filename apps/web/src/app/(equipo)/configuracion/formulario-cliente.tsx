"use client";
// El formulario de un cliente de Proges, para crearlo o editarlo. El «modo» solo cambia la pantalla
// de inicio del dueño: atendido (Proges le hace los servicios y él ve el avance) o autónomo (lleva
// su propia cartera y le pide servicios a Proges cuando quiere).
import type { ClienteConfig } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { Select } from "@/componentes/ui/select";
import { useFormulario } from "@/lib/usar-formulario";
import { cambiarCliente, crearCliente } from "./acciones";
import { useCerrarDialogo } from "./dialogo-de-formulario";

export function FormularioCliente({ cliente }: { cliente?: ClienteConfig }) {
  const cerrar = useCerrarDialogo();
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(cliente ? cambiarCliente : crearCliente, { alExito: cerrar });

  return (
    <form {...formProps} className="flex flex-col gap-3">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <CampoFormulario etiqueta="Nombre" error={errorDe("nombre")}>
        <CampoTexto name="nombre" defaultValue={cliente?.nombre} autoComplete="off" />
      </CampoFormulario>
      <CampoFormulario
        etiqueta="Cómo trabaja con Proges"
        error={errorDe("modo")}
        ayuda="Atendido: Proges le hace los servicios y el cliente ve el avance. Autónomo: el dueño lleva su propia cartera y pide servicios cuando quiere."
      >
        <Select name="modo" defaultValue={cliente?.modo ?? "ATENDIDO"}>
          <option value="ATENDIDO">Atendido</option>
          <option value="AUTONOMO">Autónomo</option>
        </Select>
      </CampoFormulario>
      {cliente && (
        <Casilla name="activa" defaultChecked={cliente.activa}>
          Activo (si lo desmarcas, no se ofrece al equipo y sus llaves dejan de servir; sus datos quedan)
        </Casilla>
      )}
      <ErrorDeFormulario mensaje={errorGeneral} />
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : cliente ? "Guardar cambios" : "Crear cliente"}
      </Boton>
    </form>
  );
}
