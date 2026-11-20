// El tablero de la semana: una columna «Sin repartir» con las tareas que nadie tiene y una columna
// por persona con sus tareas atrasadas y las de esta semana (hoy a 7 días). En el computador las
// columnas van lado a lado; en el celular, una bajo la otra.
import type { EquipoPersona, TareasRespuesta } from "@proges/contrato";

type TareasSemana = Extract<TareasRespuesta, { vista: "semana" }>;
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { TareaRepartible } from "./tarea-repartible";

type Props = { semana: TareasSemana; personas: EquipoPersona[]; hoy: string };

function Columna({
  titulo,
  cantidad,
  destacada,
  children,
}: {
  titulo: string;
  cantidad: number;
  destacada?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-xl border border-line p-2.5 ${destacada ? "bg-warn-soft" : "bg-bg"}`}>
      <h3 className="flex items-center justify-between gap-2 text-xs font-bold tracking-[0.07em] text-soft uppercase">
        <span className="truncate">{titulo}</span>
        <Insignia tono={destacada && cantidad > 0 ? "warn" : "neutro"}>{cantidad}</Insignia>
      </h3>
      {children}
    </div>
  );
}

export function TableroDeTareas({ semana, personas, hoy }: Props) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Columna titulo="Sin repartir" cantidad={semana.sinResponsable.length} destacada>
        {semana.sinResponsable.length === 0 ? (
          <Vacio texto="Todas las tareas tienen responsable." className="py-5" />
        ) : (
          semana.sinResponsable.map((t) => <TareaRepartible key={t.id} tarea={t} personas={personas} hoy={hoy} />)
        )}
      </Columna>
      {semana.personas.map(({ persona, atrasadas, estaSemana }) => (
        <Columna key={persona.id} titulo={persona.nombre} cantidad={atrasadas.length + estaSemana.length}>
          {atrasadas.length + estaSemana.length === 0 ? (
            <Vacio texto="Sin tareas esta semana." className="py-5" />
          ) : (
            [...atrasadas, ...estaSemana].map((t) => <TareaRepartible key={t.id} tarea={t} personas={personas} hoy={hoy} />)
          )}
        </Columna>
      ))}
    </div>
  );
}
