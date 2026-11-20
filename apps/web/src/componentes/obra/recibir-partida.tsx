"use client";
// Recibir una partida: cuando el maestro dice que terminó, alguien del equipo la revisa y la
// recibe CONFORME u OBSERVADA. Una observada pide qué hay que corregir, puede llevar fotos y deja
// una tarea «Corregir…» (para la persona que se elija, o sin repartir).
import { useState } from "react";
import type { PartidaEquipo } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Select } from "@/componentes/ui/select";
import { recibirPartida } from "./acciones";
import { CampoFotos } from "./campo-fotos";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";

export function RecibirPartida({
  servicioId,
  partida,
  equipo,
}: {
  servicioId: string;
  partida: PartidaEquipo;
  equipo: { id: string; nombre: string }[];
}) {
  const [preparando, setPreparando] = useState(false);
  const yaRecibida = partida.recepcion !== "PENDIENTE";

  return (
    <DialogoFormulario
      boton={yaRecibida ? "Cambiar recepción" : "Recibir"}
      variante={yaRecibida ? "fantasma" : "suave"}
      titulo="Recibir la partida"
      descripcion={partida.descripcion}
      accion={recibirPartida}
      textoDeEnvio="Guardar recepción"
      ocultos={{ servicioId, partidaId: partida.id }}
      bloqueado={preparando}
    >
      {(errorDe) => <CamposDeRecepcion partida={partida} equipo={equipo} errorDe={errorDe} alPreparar={setPreparando} />}
    </DialogoFormulario>
  );
}

// Los campos van aparte para que su estado («¿conforme u observada?») nazca de cero cada vez que
// se abre el diálogo: el diálogo desmonta su contenido al cerrarse.
function CamposDeRecepcion({
  partida,
  equipo,
  errorDe,
  alPreparar,
}: {
  partida: PartidaEquipo;
  equipo: { id: string; nombre: string }[];
  errorDe: (campo: string) => string | undefined;
  alPreparar: (preparando: boolean) => void;
}) {
  const [resultado, setResultado] = useState<"CONFORME" | "OBSERVADA">(partida.recepcion === "OBSERVADA" ? "OBSERVADA" : "CONFORME");
  const observada = resultado === "OBSERVADA";

  return (
    <>
      <CampoFormulario etiqueta="Cómo quedó" error={errorDe("resultado")}>
        <Select name="resultado" value={resultado} onChange={(e) => setResultado(e.target.value as "CONFORME" | "OBSERVADA")}>
          <option value="CONFORME">Conforme: está bien</option>
          <option value="OBSERVADA">Observada: hay algo que corregir</option>
        </Select>
      </CampoFormulario>
      <CampoFormulario
        etiqueta={observada ? "Qué hay que corregir" : "Nota (optativo)"}
        error={errorDe("observacion")}
      >
        <AreaTexto name="observacion" required={observada} maxLength={500} defaultValue={partida.observacion ?? ""} />
      </CampoFormulario>
      {observada && (
        <CampoFormulario etiqueta="Quién lo corrige" error={errorDe("responsableId")} ayuda="Si no eliges a nadie, la tarea queda sin repartir.">
          <Select name="responsableId" defaultValue="">
            <option value="">Sin asignar</option>
            {equipo.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.nombre}
              </option>
            ))}
          </Select>
        </CampoFormulario>
      )}
      <CampoFotos error={errorDe("fotos")} alPreparar={alPreparar} />
    </>
  );
}
