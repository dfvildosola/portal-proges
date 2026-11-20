"use client";
// Marca el avance de todas las partidas de un recinto de una vez («el baño está al 100 %»), sin
// tener que ir una por una. El valor que se elige se aplica y la lista vuelve a «Marcar todo».
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Select } from "@/componentes/ui/select";
import { avanceDeRecinto } from "./acciones";
import { AVANCES } from "./etiquetas-obra";
import { useAccionDirecta } from "./usar-accion-directa";

export function AvanceRecinto({ servicioId, recinto }: { servicioId: string; recinto: string | null }) {
  const { pendiente, error, ejecutar } = useAccionDirecta();
  return (
    <div className="flex flex-col gap-1">
      <Select
        aria-label={`Marcar el avance de todo ${recinto ?? "lo que no tiene recinto"}`}
        value=""
        disabled={pendiente}
        className="w-auto"
        onChange={(e) => {
          const avance = Number(e.target.value);
          if (e.target.value !== "") ejecutar(() => avanceDeRecinto(servicioId, recinto, avance));
        }}
      >
        <option value="">{pendiente ? "Guardando…" : "Marcar todo el recinto…"}</option>
        {AVANCES.map((a) => (
          <option key={a} value={a}>
            Todo al {a} %
          </option>
        ))}
      </Select>
      <ErrorDeFormulario mensaje={error} />
    </div>
  );
}
