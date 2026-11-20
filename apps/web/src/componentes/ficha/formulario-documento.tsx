"use client";
// El formulario para subir un PDF a la ficha: qué papel es, el archivo y sus fechas. El archivo va
// a la carpeta de Drive de la propiedad (la API lo guarda ahí).
import { Upload } from "lucide-react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { subirDocumento } from "./acciones";
import { DialogoDeFormulario } from "./dialogo-de-formulario";
import { ETIQUETA_PAPEL, ETIQUETA_TIPO_DOCUMENTO } from "./etiquetas-ficha";

type Props = {
  propiedadId: string;
  /** Si se sube para llenar un papel que falta, ya viene elegido. */
  papelInicial?: string;
  textoBoton?: string;
};

export function FormularioDocumento({ propiedadId, papelInicial, textoBoton = "Subir un PDF" }: Props) {
  return (
    <DialogoDeFormulario
      titulo="Subir un documento"
      descripcion="Sube el PDF (hasta 25 MB). Se guarda en la carpeta de Drive de la propiedad."
      textoBoton={
        <>
          <Upload />
          {textoBoton}
        </>
      }
      textoGuardar="Subir"
      accion={subirDocumento}
      campos={(errorDe) => (
        <>
          <input type="hidden" name="propiedadId" value={propiedadId} />
          <CampoFormulario etiqueta="Archivo (PDF)" error={errorDe("file")}>
            <CampoTexto type="file" name="file" accept="application/pdf" className="h-auto py-2" />
          </CampoFormulario>
          <CampoFormulario etiqueta="Qué papel es" error={errorDe("papel")}>
            <Select name="papel" defaultValue={papelInicial ?? ""} required>
              <option value="" disabled>
                Elige uno…
              </option>
              {Object.entries(ETIQUETA_PAPEL).map(([clave, nombre]) => (
                <option key={clave} value={clave}>
                  {nombre}
                </option>
              ))}
              <option value="OTRO">Otro papel (no está en la lista)</option>
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="En qué cajón se archiva" ayuda="Solo si elegiste «Otro papel»." error={errorDe("tipo")}>
            <Select name="tipo" defaultValue="">
              <option value="">—</option>
              {Object.entries(ETIQUETA_TIPO_DOCUMENTO).map(([clave, nombre]) => (
                <option key={clave} value={clave}>
                  {nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Nombre" ayuda="Si lo dejas vacío, se usa el nombre del archivo." error={errorDe("nombre")}>
            <CampoTexto name="nombre" />
          </CampoFormulario>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFormulario etiqueta="Fecha de emisión" error={errorDe("fechaEmision")}>
              <CampoTexto type="date" name="fechaEmision" />
            </CampoFormulario>
            <CampoFormulario etiqueta="Fecha de vencimiento" error={errorDe("fechaVencimiento")}>
              <CampoTexto type="date" name="fechaVencimiento" />
            </CampoFormulario>
          </div>
        </>
      )}
    />
  );
}
