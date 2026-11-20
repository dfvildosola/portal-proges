"use client";
// «Mostrar al dueño»: la oferta le aparece en su portal junto con lo que Proges recomienda hacer.
// Es un paso a propósito (no automático): el corredor decide cuándo y con qué recomendación.
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { mostrarOferta } from "./acciones";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";

export function BotonMostrarOferta({
  servicioId,
  ofertaId,
  recomendacionActual,
}: {
  servicioId: string;
  ofertaId: string;
  recomendacionActual: string | null;
}) {
  return (
    <DialogoFormulario
      boton="Mostrar al dueño"
      variante="suave"
      titulo="Mostrar la oferta al dueño"
      descripcion="El dueño la ve en su portal con tu recomendación y puede responder. Al corredor le llega una tarea cuando responda."
      accion={mostrarOferta}
      textoDeEnvio="Mostrar al dueño"
      ocultos={{ servicioId, ofertaId }}
    >
      {(errorDe) => (
        <CampoFormulario etiqueta="Lo que recomienda Proges" error={errorDe("recomendacion")} ayuda="Por ejemplo: contraofertar un monto y por qué.">
          <AreaTexto name="recomendacion" rows={4} defaultValue={recomendacionActual ?? ""} required />
        </CampoFormulario>
      )}
    </DialogoFormulario>
  );
}
