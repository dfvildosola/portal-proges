"use client";
// Anotar el avalúo fiscal de un año (en pesos). Cada año tiene uno solo.
import { Plus } from "lucide-react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { agregarAvaluo } from "./acciones";
import { DialogoDeFormulario } from "./dialogo-de-formulario";

export function FormularioAvaluo({ propiedadId }: { propiedadId: string }) {
  return (
    <DialogoDeFormulario
      titulo="Anotar un avalúo fiscal"
      textoBoton={
        <>
          <Plus />
          Agregar
        </>
      }
      accion={agregarAvaluo}
      campos={(errorDe) => (
        <>
          <input type="hidden" name="propiedadId" value={propiedadId} />
          <CampoFormulario etiqueta="Año" error={errorDe("anio")}>
            <CampoTexto name="anio" inputMode="numeric" placeholder="2026" required />
          </CampoFormulario>
          <CampoFormulario etiqueta="Avalúo fiscal (pesos)" error={errorDe("valor")}>
            <CampoTexto name="valor" inputMode="numeric" required />
          </CampoFormulario>
        </>
      )}
    />
  );
}
