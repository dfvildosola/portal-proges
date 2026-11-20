"use client";
// Enlazar la carpeta de Drive de la propiedad. Se pega el enlace de la carpeta (o su id) y la API
// comprueba que la cuenta de servicio de Proges la pueda abrir; si no puede, dice que hay que
// compartírsela. Sin carpeta enlazada no se pueden subir PDF.
import { FolderOpen } from "lucide-react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { enlazarCarpeta } from "./acciones";
import { DialogoDeFormulario } from "./dialogo-de-formulario";

export function FormularioCarpeta({ propiedadId, yaEnlazada }: { propiedadId: string; yaEnlazada: boolean }) {
  return (
    <DialogoDeFormulario
      titulo={yaEnlazada ? "Cambiar la carpeta de Drive" : "Enlazar la carpeta de Drive"}
      descripcion="Pega el enlace de la carpeta de Drive de esta propiedad. La carpeta tiene que estar compartida con la cuenta de servicio de Proges; si no lo está, te lo dirá."
      textoBoton={
        <>
          <FolderOpen />
          {yaEnlazada ? "Cambiar carpeta" : "Enlazar carpeta"}
        </>
      }
      textoGuardar="Enlazar"
      accion={enlazarCarpeta}
      campos={(errorDe) => (
        <>
          <input type="hidden" name="propiedadId" value={propiedadId} />
          <CampoFormulario etiqueta="Enlace de la carpeta" error={errorDe("driveCarpetaId")}>
            <CampoTexto name="driveCarpetaId" placeholder="https://drive.google.com/drive/folders/…" />
          </CampoFormulario>
        </>
      )}
    />
  );
}
