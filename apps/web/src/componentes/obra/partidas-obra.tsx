// Las partidas de la orden, agrupadas por recinto (baño, cocina…): cada una con su avance, su
// maestro y su recepción. Los recintos salen en el orden en que llegan de Odoo.
import type { ObraEquipo } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { AvanceRecinto } from "./avance-recinto";
import { FilaPartida, type PersonaParaElegir } from "./fila-partida";

type Partida = ObraEquipo["partidas"][number];

function agruparPorRecinto(partidas: Partida[]): { nombre: string | null; partidas: Partida[] }[] {
  const grupos = new Map<string | null, Partida[]>();
  for (const partida of partidas) {
    const grupo = grupos.get(partida.recinto);
    if (grupo) grupo.push(partida);
    else grupos.set(partida.recinto, [partida]);
  }
  return [...grupos].map(([nombre, lista]) => ({ nombre, partidas: lista }));
}

export function PartidasObra({
  servicioId,
  partidas,
  maestros,
  equipo,
  editable,
}: {
  servicioId: string;
  partidas: Partida[];
  maestros: PersonaParaElegir[];
  equipo: PersonaParaElegir[];
  editable: boolean;
}) {
  if (partidas.length === 0) {
    return <Vacio texto="Todavía no hay partidas: aparecen cuando se enlaza la orden de Odoo." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {agruparPorRecinto(partidas).map((grupo) => (
        <Tarjeta key={grupo.nombre ?? "sin-recinto"}>
          <div className="flex items-center justify-between gap-2">
            <TarjetaTitulo>{grupo.nombre ?? "Sin recinto"}</TarjetaTitulo>
            {editable && <AvanceRecinto servicioId={servicioId} recinto={grupo.nombre} />}
          </div>
          <ul className="flex flex-col gap-2">
            {grupo.partidas.map((partida) => (
              <li key={`${partida.id}:${partida.avance}:${partida.maestro?.id ?? ""}:${partida.recepcion}`}>
                <FilaPartida servicioId={servicioId} partida={partida} maestros={maestrosParaPartida(maestros, partida)} equipo={equipo} editable={editable} />
              </li>
            ))}
          </ul>
        </Tarjeta>
      ))}
    </div>
  );
}

// Un maestro desactivado no se ofrece, pero si ya tiene la partida tiene que seguir apareciendo.
function maestrosParaPartida(maestros: PersonaParaElegir[], partida: Partida): PersonaParaElegir[] {
  if (!partida.maestro || maestros.some((m) => m.id === partida.maestro?.id)) return maestros;
  return [...maestros, partida.maestro];
}
