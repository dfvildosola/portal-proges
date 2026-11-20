"use client";
// Agregar un dueño a la propiedad con su porcentaje: o una persona o sociedad que ya existe (así no
// se duplica entre propiedades), o una nueva con su nombre y RUT.
import { Plus } from "lucide-react";
import type { DuenoEntidad } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { agregarDueno } from "./acciones";
import { DialogoDeFormulario } from "./dialogo-de-formulario";

export function FormularioDueno({ propiedadId, existentes }: { propiedadId: string; existentes: DuenoEntidad[] }) {
  return (
    <DialogoDeFormulario
      titulo="Agregar un dueño"
      textoBoton={
        <>
          <Plus />
          Agregar
        </>
      }
      accion={agregarDueno}
      campos={(errorDe) => (
        <>
          <input type="hidden" name="propiedadId" value={propiedadId} />
          {existentes.length > 0 && (
            <CampoFormulario etiqueta="Uno que ya existe" ayuda="O deja «Nuevo» y escribe sus datos abajo." error={errorDe("duenoId")}>
              <Select name="duenoId" defaultValue="">
                <option value="">Nuevo</option>
                {existentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} · {d.rut}
                  </option>
                ))}
              </Select>
            </CampoFormulario>
          )}
          <CampoFormulario etiqueta="Nombre (si es nuevo)" error={errorDe("nombre")}>
            <CampoTexto name="nombre" />
          </CampoFormulario>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFormulario etiqueta="RUT (si es nuevo)" error={errorDe("rut")}>
              <CampoTexto name="rut" />
            </CampoFormulario>
            <CampoFormulario etiqueta="Es una… (si es nuevo)" error={errorDe("tipo")}>
              <Select name="tipoDueno" defaultValue="PERSONA">
                <option value="PERSONA">Persona</option>
                <option value="SOCIEDAD">Sociedad</option>
              </Select>
            </CampoFormulario>
          </div>
          <CampoFormulario etiqueta="Qué parte es suya (%)" ayuda="De 1 a 100." error={errorDe("porcentaje")}>
            <CampoTexto name="porcentaje" inputMode="decimal" defaultValue="100" required />
          </CampoFormulario>
        </>
      )}
    />
  );
}
