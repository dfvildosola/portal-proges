"use client";
// El formulario de tarea nueva: qué hay que hacer, quién y para cuándo. Lo usan la ficha del
// servicio y Repartir. La lista de personas (`personas`) la pide quien lo usa a GET /v1/equipo y
// se la pasa: así el formulario no depende de cómo cada pantalla carga sus datos.
import type { EquipoPersona } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { useFormulario } from "@/lib/usar-formulario";
import { crearTarea } from "./acciones";

export function FormularioDeTarea({
  servicioId,
  personas,
  responsablePorDefecto = "",
  alExito,
}: {
  servicioId: string;
  personas: EquipoPersona[];
  /** El id de quien aparece elegido al abrir (por ejemplo, quien está conectado). Vacío: nadie. */
  responsablePorDefecto?: string;
  /** Se llama una vez cuando la tarea quedó guardada (por ejemplo, para cerrar un diálogo). */
  alExito?: () => void;
}) {
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(crearTarea, { alExito });
  return (
    <form {...formProps} className="flex flex-col gap-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <CampoFormulario etiqueta="Qué hay que hacer" error={errorDe("que")}>
        <CampoTexto name="que" required maxLength={300} placeholder="Ej.: pedir copia de la inscripción" />
      </CampoFormulario>
      <CampoFormulario etiqueta="Quién" error={errorDe("responsableId")}>
        <Select name="responsableId" defaultValue={responsablePorDefecto}>
          <option value="">Sin responsable</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.nombre}
            </option>
          ))}
        </Select>
      </CampoFormulario>
      <CampoFormulario etiqueta="Para cuándo" error={errorDe("vence")} ayuda="Si no pones fecha, queda sin plazo.">
        <CampoTexto name="vence" type="date" />
      </CampoFormulario>
      <ErrorDeFormulario mensaje={errorGeneral} />
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Agregar tarea"}
      </Boton>
    </form>
  );
}
