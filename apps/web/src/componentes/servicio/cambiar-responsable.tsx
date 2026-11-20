"use client";
// El responsable del servicio, cambiable con un toque: elegir otra persona lo guarda al instante.
// Si la API lo rechaza, el mensaje queda debajo y la lista vuelve a la persona de antes.
import { useState, useTransition } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Select } from "@/componentes/ui/select";
import { cambiarResponsable } from "@/app/(equipo)/servicios/[id]/acciones";
import type { Persona } from "./tipos";

export function CambiarResponsable({
  servicioId,
  responsableId,
  personas,
  deshabilitado,
}: {
  servicioId: string;
  responsableId: string | null;
  personas: Persona[];
  deshabilitado: boolean;
}) {
  const [elegido, setElegido] = useState(responsableId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function alElegir(valor: string) {
    const anterior = elegido;
    setElegido(valor);
    setError(null);
    empezar(async () => {
      const resultado = await cambiarResponsable(servicioId, valor === "" ? null : valor);
      if (!resultado.ok) {
        setElegido(anterior);
        setError(resultado.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        aria-label="Responsable del servicio"
        value={elegido}
        disabled={deshabilitado || pendiente}
        onChange={(e) => alElegir(e.target.value)}
      >
        <option value="">Sin responsable</option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Select>
      <ErrorDeFormulario mensaje={error} />
    </div>
  );
}
