"use client";
// Agregar un estacionamiento o una bodega que se administra junto a la propiedad.
import { Plus } from "lucide-react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { agregarUnidad } from "./acciones";
import { DialogoDeFormulario } from "./dialogo-de-formulario";

export function FormularioUnidad({ propiedadId }: { propiedadId: string }) {
  return (
    <DialogoDeFormulario
      titulo="Agregar una unidad"
      textoBoton={
        <>
          <Plus />
          Agregar
        </>
      }
      accion={agregarUnidad}
      campos={(errorDe) => (
        <>
          <input type="hidden" name="propiedadId" value={propiedadId} />
          <CampoFormulario etiqueta="Qué es" error={errorDe("tipo")}>
            <Select name="tipo" defaultValue="ESTACIONAMIENTO">
              <option value="ESTACIONAMIENTO">Estacionamiento</option>
              <option value="BODEGA">Bodega</option>
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Número" error={errorDe("numero")}>
            <CampoTexto name="numero" required />
          </CampoFormulario>
          <CampoFormulario etiqueta="ROL del SII" ayuda="Opcional." error={errorDe("rolSII")}>
            <CampoTexto name="rolSII" />
          </CampoFormulario>
          <CampoFormulario etiqueta="Avalúo fiscal (pesos)" ayuda="Opcional." error={errorDe("avaluoFiscal")}>
            <CampoTexto name="avaluoFiscal" inputMode="numeric" />
          </CampoFormulario>
        </>
      )}
    />
  );
}
