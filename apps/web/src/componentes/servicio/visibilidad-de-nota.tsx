"use client";
// La casilla «La ve el dueño» de una nota de la bitácora. Marcarla (o desmarcarla) se guarda al
// instante; si la API lo rechaza, la casilla vuelve a como estaba y se muestra el mensaje.
import { useState, useTransition } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Casilla } from "@/componentes/ui/casilla";
import { cambiarVisibilidadDeNota } from "@/app/(equipo)/servicios/[id]/acciones";

export function VisibilidadDeNota({
  servicioId,
  notaId,
  paraDueno,
}: {
  servicioId: string;
  notaId: string;
  paraDueno: boolean;
}) {
  const [marcada, setMarcada] = useState(paraDueno);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function alCambiar(nueva: boolean) {
    setMarcada(nueva);
    setError(null);
    empezar(async () => {
      const resultado = await cambiarVisibilidadDeNota(servicioId, notaId, nueva);
      if (!resultado.ok) {
        setMarcada(!nueva);
        setError(resultado.error);
      }
    });
  }

  return (
    <div>
      <Casilla
        checked={marcada}
        disabled={pendiente}
        onChange={(e) => alCambiar(e.target.checked)}
        className="text-xs font-semibold text-soft"
      >
        La ve el dueño
      </Casilla>
      <ErrorDeFormulario mensaje={error} />
    </div>
  );
}
