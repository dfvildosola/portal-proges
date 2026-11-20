// Las visitas a la propiedad, de la más reciente a la más antigua: fecha, interés del visitante
// (de 1 a 5) y comentario. El equipo ve además quién mostró y los datos del interesado; el dueño
// nunca los ve (la API ni se los manda, y aquí tampoco se dibujan).
import type { VentaVisita, VentaVisitaEquipo } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia, type TonoDeInsignia } from "@/componentes/ui/insignia";

function tonoDeInteres(evaluacion: number): TonoDeInsignia {
  if (evaluacion >= 4) return "ok";
  if (evaluacion === 3) return "warn";
  return "neutro";
}

export function VisitasVenta({ visitas }: { visitas: (VentaVisita | VentaVisitaEquipo)[] }) {
  if (visitas.length === 0) return <Vacio texto="Todavía no hay visitas anotadas." className="py-5" />;
  return (
    <ul className="flex flex-col gap-2">
      {visitas.map((v) => {
        const equipo = "interesadoNombre" in v ? v : null;
        const contacto = [equipo?.interesadoNombre, equipo?.interesadoContacto].filter(Boolean).join(" · ");
        return (
          <li key={v.id} className="flex flex-col gap-0.5 rounded-[10px] bg-scr px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Fecha valor={v.fecha} formato="conDia" className="font-bold" />
              {v.evaluacion !== null ? (
                <Insignia tono={tonoDeInteres(v.evaluacion)}>Interés {v.evaluacion} de 5</Insignia>
              ) : (
                <Insignia>Sin evaluar</Insignia>
              )}
            </div>
            {contacto && <span className="text-[13px]">{contacto}</span>}
            {v.comentario && <span className="text-[13px] text-soft">«{v.comentario}»</span>}
            {equipo?.realizadaPor && <span className="text-xs text-soft">Mostró {equipo.realizadaPor.nombre}</span>}
          </li>
        );
      })}
    </ul>
  );
}
