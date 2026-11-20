"use client";
// Elegir dónde se guarda la nota. Arriba, los servicios donde tengo tareas hoy (los propone la
// API: es casi siempre donde se está parado); abajo, un buscador por si la nota es de otro.
import { Check, Search } from "lucide-react";
import { useState } from "react";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { cn } from "@/lib/utils";
import type { OpcionDeServicio } from "./tipos";

// «Peña» y «pena» se buscan igual: se compara sin tildes ni mayúsculas.
function simplificar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const MAX_RESULTADOS = 12;

function Opcion({ opcion, elegida, alElegir }: { opcion: OpcionDeServicio; elegida: boolean; alElegir: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      onClick={alElegir}
      className={cn(
        "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left",
        elegida ? "border-ink bg-ink-soft" : "border-line bg-card",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold">{opcion.titulo}</span>
        <span className="truncate text-xs text-soft">{opcion.detalle}</span>
      </span>
      {elegida && <Check className="size-5 shrink-0 text-ink" aria-hidden />}
    </button>
  );
}

export function ElegirServicio({
  opciones,
  elegidoId,
  alElegir,
  errorDeBusqueda,
}: {
  opciones: OpcionDeServicio[];
  elegidoId: string | null;
  alElegir: (id: string) => void;
  /** Por qué no se puede buscar otro servicio (si la lista no cargó). */
  errorDeBusqueda: string | null;
}) {
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState("");

  const sugeridas = opciones.filter((o) => o.sugerido);
  const elegida = opciones.find((o) => o.id === elegidoId);
  // Si se eligió uno de la búsqueda, queda a la vista junto a los sugeridos.
  const elegidaAparte = elegida && !elegida.sugerido ? elegida : null;

  const buscada = simplificar(consulta.trim());
  const resultados = opciones
    .filter((o) => !o.sugerido && o.id !== elegidoId)
    .filter((o) => buscada === "" || simplificar(`${o.titulo} ${o.detalle}`).includes(buscada));

  return (
    <div className="flex flex-col gap-3">
      {sugeridas.length > 0 && (
        <p className="text-xs text-soft">Sugeridos: son los servicios donde tienes tareas hoy.</p>
      )}
      <div role="radiogroup" aria-label="Servicio donde se guarda la nota" className="flex flex-col gap-2">
        {elegidaAparte && <Opcion opcion={elegidaAparte} elegida alElegir={() => alElegir(elegidaAparte.id)} />}
        {sugeridas.map((o) => (
          <Opcion key={o.id} opcion={o} elegida={o.id === elegidoId} alElegir={() => alElegir(o.id)} />
        ))}
      </div>

      {errorDeBusqueda ? (
        <p className="text-xs text-soft">No se pudo cargar la lista para buscar otro servicio: {errorDeBusqueda}</p>
      ) : !buscando ? (
        <Boton variante="contorno" onClick={() => setBuscando(true)}>
          <Search aria-hidden /> {sugeridas.length > 0 ? "Buscar otro servicio" : "Buscar el servicio"}
        </Boton>
      ) : (
        <div className="flex flex-col gap-2">
          <CampoTexto
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Dirección, comuna o cliente"
            aria-label="Buscar servicio"
            autoFocus
          />
          <div role="radiogroup" aria-label="Resultados de la búsqueda" className="flex flex-col gap-2">
            {resultados.slice(0, MAX_RESULTADOS).map((o) => (
              <Opcion key={o.id} opcion={o} elegida={false} alElegir={() => alElegir(o.id)} />
            ))}
          </div>
          {resultados.length === 0 && <p className="text-sm text-soft">No hay servicios abiertos que calcen con eso.</p>}
          {resultados.length > MAX_RESULTADOS && (
            <p className="text-xs text-soft">Hay más: escribe un poco más para acotar.</p>
          )}
        </div>
      )}
    </div>
  );
}
