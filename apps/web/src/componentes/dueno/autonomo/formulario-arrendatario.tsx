"use client";
// Agregar o corregir a la persona que arrienda una propiedad. Se necesita antes de hacer su contrato.
import type { Arrendatario } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { cambiarArrendatario, crearArrendatario } from "./acciones";

export function FormularioArrendatario({ arrendatario }: { arrendatario?: Arrendatario }) {
  return (
    <DialogoFormulario
      boton={arrendatario ? "Editar" : "Agregar arrendatario"}
      variante={arrendatario ? "fantasma" : "contorno"}
      titulo={arrendatario ? "Corregir arrendatario" : "Nuevo arrendatario"}
      descripcion="Quien arrienda la propiedad: la persona o empresa que firma el contrato."
      accion={arrendatario ? cambiarArrendatario : crearArrendatario}
      textoDeEnvio={arrendatario ? "Guardar cambios" : "Agregar"}
      ocultos={arrendatario ? { id: arrendatario.id } : {}}
    >
      {(errorDe) => (
        <>
          <CampoFormulario etiqueta="Nombre" error={errorDe("nombre")}>
            <CampoTexto name="nombre" defaultValue={arrendatario?.nombre} autoComplete="off" required />
          </CampoFormulario>
          <CampoFormulario etiqueta="RUT" error={errorDe("rut")} ayuda="Por ejemplo 12.345.678-9.">
            <CampoTexto name="rut" defaultValue={arrendatario?.rut} autoComplete="off" required />
          </CampoFormulario>
          <CampoFormulario etiqueta="Correo (opcional)" error={errorDe("email")}>
            <CampoTexto name="email" type="email" defaultValue={arrendatario?.email ?? ""} autoComplete="off" />
          </CampoFormulario>
          <CampoFormulario etiqueta="Teléfono (opcional)" error={errorDe("telefono")}>
            <CampoTexto name="telefono" type="tel" defaultValue={arrendatario?.telefono ?? ""} autoComplete="off" />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}
