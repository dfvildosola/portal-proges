// Pestaña «Historial»: todo lo que ha pasado en la propiedad en una línea de tiempo, con un filtro
// por tipo y páginas. El filtro y la página viajan en la dirección (`?tipo=papeles&pagina=2`).
import Link from "next/link";
import type { HistorialCategoria, HistorialPagina } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { cn } from "@/lib/utils";
import { LineaDeTiempo } from "./linea-de-tiempo";
import type { ModoFicha } from "./modo";
import { hrefDePestana } from "./pestanas-ficha";

const FILTROS: { clave: HistorialCategoria | undefined; nombre: string }[] = [
  { clave: undefined, nombre: "Todo" },
  { clave: "reparaciones", nombre: "Reparaciones" },
  { clave: "papeles", nombre: "Papeles" },
  { clave: "visitas", nombre: "Visitas" },
  { clave: "venta-arriendo", nombre: "Arriendo y venta" },
];

type Props = { propiedadId: string; historial: HistorialPagina; filtro: HistorialCategoria | undefined; modo: ModoFicha };

export function PestanaHistorial({ propiedadId, historial, filtro, modo }: Props) {
  const { pagina, porPagina, total } = historial.paginacion;
  const ultimaPagina = Math.max(1, Math.ceil(total / porPagina));
  const enlace = (pag: number) => hrefDePestana(propiedadId, "historial", { tipo: filtro, pagina: pag > 1 ? String(pag) : undefined });

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Filtrar el historial" className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.nombre}
            href={hrefDePestana(propiedadId, "historial", { tipo: f.clave })}
            aria-current={f.clave === filtro ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[13px] font-bold text-soft hover:text-fg",
              f.clave === filtro && "border-fg bg-fg text-bg hover:text-bg",
            )}
          >
            {f.nombre}
          </Link>
        ))}
      </nav>

      <Tarjeta>
        {historial.items.length === 0 ? (
          <Vacio texto="No hay nada de este tipo todavía." className="border-0" />
        ) : (
          <LineaDeTiempo hechos={historial.items} />
        )}
      </Tarjeta>

      {ultimaPagina > 1 && (
        <div className="flex items-center justify-between gap-2 text-[13px] text-soft">
          {pagina > 1 ? (
            <Link href={enlace(pagina - 1)} className="font-bold text-ink hover:underline">
              Más nuevos
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {pagina} de {ultimaPagina}
          </span>
          {pagina < ultimaPagina ? (
            <Link href={enlace(pagina + 1)} className="font-bold text-ink hover:underline">
              Más antiguos
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      <p className="text-xs text-soft">
        Todo lo que Proges hizo en la propiedad, de más nuevo a más antiguo.{" "}
        {modo === "equipo" ? "Las notas internas no las ve el dueño." : "Aquí salen solo los hechos marcados para el dueño."}
      </p>
    </div>
  );
}
