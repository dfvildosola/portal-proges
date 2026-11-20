"use client";
// «Agregar una propiedad»: lo mínimo para abrir su ficha (tipo y ubicación). Proges completa o
// corrige el resto de los datos.
import { Plus } from "lucide-react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoDeFormulario } from "@/componentes/ficha/dialogo-de-formulario";
import { ETIQUETA_TIPO_PROPIEDAD } from "@/componentes/ficha/etiquetas-ficha";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { agregarPropiedad } from "./acciones";

export function FormularioPropiedad() {
  return (
    <DialogoDeFormulario
      variante="contorno"
      tamano="normal"
      titulo="Agregar una propiedad"
      descripcion="Con esto abrimos su ficha. Los demás datos los completamos juntos."
      textoBoton={
        <>
          <Plus />
          Agregar una propiedad
        </>
      }
      textoGuardar="Agregar"
      accion={agregarPropiedad}
      campos={(errorDe) => (
        <>
          <CampoFormulario etiqueta="Qué es" error={errorDe("tipo")}>
            <Select name="tipo" defaultValue="DEPARTAMENTO">
              {Object.entries(ETIQUETA_TIPO_PROPIEDAD).map(([clave, nombre]) => (
                <option key={clave} value={clave}>
                  {nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Dirección" error={errorDe("direccion")}>
            <CampoTexto name="direccion" placeholder="Agustinas 715, oficina 706" required />
          </CampoFormulario>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFormulario etiqueta="Comuna" error={errorDe("comuna")}>
              <CampoTexto name="comuna" required />
            </CampoFormulario>
            <CampoFormulario etiqueta="Región" error={errorDe("region")}>
              <CampoTexto name="region" defaultValue="Metropolitana" required />
            </CampoFormulario>
          </div>
        </>
      )}
    />
  );
}
