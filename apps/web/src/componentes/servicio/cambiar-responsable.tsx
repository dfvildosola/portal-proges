"use client";
// El responsable del servicio, cambiable con un toque: elegir otra persona lo guarda al instante.
// Si la API lo rechaza, el mensaje queda debajo y la lista vuelve a la persona de antes.
// Las props `compacto`, `vacio` y `etiqueta` son para la tarjeta del tablero (lista más baja y otro
// texto en la opción vacía); sin ellas se ve como en la ficha.
import { useState, useTransition } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Select } from "@/componentes/ui/select";
import { cn } from "@/lib/utils";
import { cambiarResponsable } from "@/app/(equipo)/servicios/[id]/acciones";
import type { Persona } from "./tipos";

export function CambiarResponsable({
  servicioId,
  responsableId,
  personas,
  deshabilitado,
  compacto = false,
  vacio = "Sin responsable",
  etiqueta = "Responsable del servicio",
  className,
}: {
  servicioId: string;
  responsableId: string | null;
  personas: Persona[];
  deshabilitado: boolean;
  compacto?: boolean;
  vacio?: string;
  etiqueta?: string;
  className?: string;
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
    <div className={cn("flex flex-col gap-1", className)}>
      <Select
        aria-label={etiqueta}
        className={compacto ? "text-sm lg:h-8 lg:text-xs" : undefined}
        value={elegido}
        disabled={deshabilitado || pendiente}
        onChange={(e) => alElegir(e.target.value)}
      >
        <option value="">{vacio}</option>
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
