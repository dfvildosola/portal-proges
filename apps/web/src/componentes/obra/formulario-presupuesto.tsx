"use client";
// Cargar el presupuesto de un maestro tal como llegó: quién, cuánto cobra, en cuántos días, el PDF
// y qué partidas de la orden cubre. No se copia línea por línea: el maestro ya mandó su PDF.
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { cargarPresupuesto } from "./acciones";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";

export function FormularioPresupuesto({
  servicioId,
  maestros,
  partidas,
}: {
  servicioId: string;
  maestros: { id: string; nombre: string }[];
  partidas: { id: string; recinto: string | null; descripcion: string }[];
}) {
  return (
    <DialogoFormulario
      boton="Cargar presupuesto"
      titulo="Cargar el presupuesto de un maestro"
      descripcion="Queda por aprobar: la jefatura lo aprueba o lo rechaza."
      accion={cargarPresupuesto}
      textoDeEnvio="Cargar"
      ocultos={{ servicioId }}
    >
      {(errorDe) => (
        <>
          <CampoFormulario
            etiqueta="Maestro"
            error={errorDe("maestroId")}
            ayuda={maestros.length === 0 ? "Todavía no hay maestros registrados: agrégalos en Configuración, pestaña Maestros." : undefined}
          >
            <Select name="maestroId" required defaultValue="">
              <option value="" disabled>
                Elige un maestro
              </option>
              {maestros.map((maestro) => (
                <option key={maestro.id} value={maestro.id}>
                  {maestro.nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Qué es" error={errorDe("tipo")}>
            <Select name="tipo" defaultValue="ORIGINAL">
              <option value="ORIGINAL">Original: lo acordado al inicio</option>
              <option value="ADICIONAL">Adicional: un cambio de alcance</option>
            </Select>
          </CampoFormulario>
          <div className="grid grid-cols-2 gap-2">
            <CampoFormulario etiqueta="Total en pesos" error={errorDe("total")}>
              <CampoTexto name="total" inputMode="numeric" placeholder="1.500.000" required />
            </CampoFormulario>
            <CampoFormulario etiqueta="Plazo en días" error={errorDe("plazoDias")}>
              <CampoTexto name="plazoDias" type="number" inputMode="numeric" min={1} max={1000} />
            </CampoFormulario>
          </div>
          {partidas.length > 0 && (
            <fieldset className="flex flex-col gap-0.5">
              <legend className="mb-1 text-[13px] font-bold">Partidas que cubre</legend>
              <div className="max-h-48 overflow-y-auto rounded-[10px] border border-line px-3 py-1">
                {partidas.map((partida) => (
                  <Casilla key={partida.id} name="partidaIds" value={partida.id}>
                    <span>
                      {partida.descripcion}
                      {partida.recinto && <span className="text-soft"> · {partida.recinto}</span>}
                    </span>
                  </Casilla>
                ))}
              </div>
              {errorDe("partidaIds") && <span role="alert" className="text-xs font-semibold text-bad">{errorDe("partidaIds")}</span>}
            </fieldset>
          )}
          <CampoFormulario etiqueta="PDF del presupuesto (optativo, hasta 4 MB)" error={errorDe("pdf")}>
            <input
              type="file"
              name="pdf"
              accept="application/pdf"
              className="w-full text-sm file:mr-3 file:h-9 file:cursor-pointer file:rounded-[9px] file:border-0 file:bg-ink-soft file:px-3 file:font-bold file:text-ink"
            />
          </CampoFormulario>
          <CampoFormulario etiqueta="Nota (optativo)" error={errorDe("nota")}>
            <AreaTexto name="nota" maxLength={1000} />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}
