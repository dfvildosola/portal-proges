"use client";
// Las dos fechas de la obra: cuándo empezó el trabajo y cuándo se le prometió al dueño que
// terminaba. Dejar un campo vacío borra esa fecha.
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { useFormulario } from "@/lib/usar-formulario";
import { guardarFechas } from "./acciones";

export function FormularioFechas({
  servicioId,
  inicioObra,
  fechaComprometida,
}: {
  servicioId: string;
  inicioObra: string | null;
  fechaComprometida: string | null;
}) {
  // No se vacía al guardar: las fechas quedan escritas en los campos.
  const { formProps, pendiente, estado, errorGeneral, errorDe } = useFormulario(guardarFechas, { vaciarAlExito: false });
  return (
    <form {...formProps} className="flex flex-col gap-2">
      <input type="hidden" name="servicioId" value={servicioId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoFormulario etiqueta="Empezó el" error={errorDe("inicioObra")}>
          <CampoTexto type="date" name="inicioObra" defaultValue={inicioObra ?? ""} />
        </CampoFormulario>
        <CampoFormulario etiqueta="Se prometió terminar el" error={errorDe("fechaComprometida")}>
          <CampoTexto type="date" name="fechaComprometida" defaultValue={fechaComprometida ?? ""} />
        </CampoFormulario>
      </div>
      <ErrorDeFormulario mensaje={errorGeneral} />
      <div className="flex items-center gap-3">
        <Boton type="submit" variante="contorno" tamano="chico" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar fechas"}
        </Boton>
        {estado?.ok && <span className="text-xs text-ok">Fechas guardadas.</span>}
      </div>
    </form>
  );
}
