"use client";
// Crea de una vez las cuatro cuotas de contribuciones de un año para una propiedad, sin monto, para
// ir completándolas después. Las que ya estaban anotadas no se tocan.
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { generarCuotas } from "./acciones";

export function FormularioCuotasDelAnio({
  propiedades,
  hoy,
}: {
  propiedades: { id: string; nombre: string }[];
  hoy: string;
}) {
  return (
    <DialogoFormulario
      boton="Crear las 4 cuotas del año"
      variante="fantasma"
      titulo="Las cuatro cuotas del año"
      descripcion="Se crean las cuatro cuotas con su vencimiento, sin monto. Después anotas cuánto es cada una."
      accion={generarCuotas}
      textoDeEnvio="Crear cuotas"
      ocultos={{}}
    >
      {(errorDe) => (
        <>
          <CampoFormulario etiqueta="Propiedad" error={errorDe("propiedadId")}>
            <Select name="propiedadId" defaultValue="" required>
              <option value="" disabled>
                Elige una propiedad
              </option>
              {propiedades.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Año" error={errorDe("anio")}>
            <CampoTexto name="anio" type="number" min={2000} max={2100} defaultValue={hoy.slice(0, 4)} required />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}
