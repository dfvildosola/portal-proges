// Las <option> de una lista de personas del equipo, para los selectores de responsable. Se usa
// dentro de un <Select>; `sinNadie` pone arriba la opción de dejarlo sin responsable.
import type { EquipoPersona } from "@proges/contrato";

export function OpcionesDePersonas({ personas, sinNadie }: { personas: EquipoPersona[]; sinNadie?: string }) {
  return (
    <>
      {sinNadie && <option value="">{sinNadie}</option>}
      {personas.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nombre}
        </option>
      ))}
    </>
  );
}
