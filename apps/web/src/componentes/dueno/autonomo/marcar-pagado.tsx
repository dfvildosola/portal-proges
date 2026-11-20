"use client";
// El atajo para dejar una cuenta o una cuota como pagada: solo pide el día en que se pagó.
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { marcarPagada } from "./acciones";

export function MarcarPagado({
  recurso,
  id,
  descripcion,
  hoy,
}: {
  recurso: "gastos" | "contribuciones";
  id: string;
  /** Qué se está pagando, para que la persona confirme que es esa («Luz de nov 2026»). */
  descripcion: string;
  hoy: string;
}) {
  return (
    <DialogoFormulario
      boton="Marcar pagada"
      variante="suave"
      titulo="Marcar como pagada"
      descripcion={descripcion}
      accion={marcarPagada}
      textoDeEnvio="Marcar pagada"
      ocultos={{ recurso, id }}
    >
      {(errorDe) => (
        <CampoFormulario etiqueta="Día en que se pagó" error={errorDe("fechaPago")}>
          <CampoTexto name="fechaPago" type="date" defaultValue={hoy} required />
        </CampoFormulario>
      )}
    </DialogoFormulario>
  );
}
