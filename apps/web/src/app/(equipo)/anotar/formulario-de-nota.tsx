"use client";
// El formulario de Anotar: junta los dos pasos y, cuando la nota se guarda, muestra la
// confirmación. «Anotar otra» arma los pasos de cero (cambiando su `key`, React los vuelve a
// montar limpios: sin texto, sin fotos).
import { useState } from "react";
import { NotaGuardada } from "./nota-guardada";
import { PasosDeNota } from "./pasos-de-nota";
import type { OpcionDeServicio } from "./tipos";

type Guardada = { donde: string; servicioId: string; aviso: string | null };

export function FormularioDeNota(props: {
  opciones: OpcionDeServicio[];
  elegidoAlInicio: string | null;
  servicioFijo: OpcionDeServicio | null;
  errorDeBusqueda: string | null;
}) {
  const [ronda, setRonda] = useState(0);
  const [guardada, setGuardada] = useState<Guardada | null>(null);

  if (guardada) {
    return (
      <NotaGuardada
        {...guardada}
        alAnotarOtra={() => {
          setGuardada(null);
          setRonda((n) => n + 1);
        }}
      />
    );
  }
  return <PasosDeNota key={ronda} {...props} alGuardar={setGuardada} />;
}
