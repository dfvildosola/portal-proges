// La bitácora del servicio: las notas del equipo, de la más nueva a la más antigua, con sus fotos.
// Cada nota dice quién la escribió y cuándo, y tiene la casilla «La ve el dueño». Las fotos pasan
// por la propia web (/archivos/foto/…), que las pide a la API con la sesión de quien mira: nunca
// hay un enlace público.
import Link from "next/link";
import { Plus } from "lucide-react";
import type { NotaEquipo } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { estiloBoton } from "@/componentes/ui/boton";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { urlDeArchivo } from "@/lib/archivos";
import { diaChile, horaChile } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { VisibilidadDeNota } from "./visibilidad-de-nota";

export function BitacoraDelServicio({
  servicioId,
  notas,
  puedeAnotar,
}: {
  servicioId: string;
  notas: NotaEquipo[];
  puedeAnotar: boolean;
}) {
  return (
    <Seccion titulo="Bitácora" derecha={<span className="text-xs text-soft">lo marcado lo ve el dueño</span>}>
      <Tarjeta>
        {puedeAnotar && (
          // «Anotar» es la pantalla de la pieza J (foto y texto en dos toques); aquí solo se llega a ella.
          <Link
            href={`/anotar?servicio=${encodeURIComponent(servicioId)}`}
            className={cn(estiloBoton({ variante: "suave" }), "w-full")}
          >
            <Plus aria-hidden /> Anotar con foto
          </Link>
        )}
        {notas.length === 0 ? (
          <Vacio texto="Todavía no hay notas en este servicio." className="border-0 py-4" />
        ) : (
          <ul className="flex flex-col gap-3">
            {notas.map((n) => (
              <li
                key={n.id}
                className={cn("flex flex-col gap-1.5 border-l-[3px] pl-3", n.paraDueno ? "border-ok" : "border-line")}
              >
                <p className="text-[13px] font-semibold break-words whitespace-pre-line">{n.texto}</p>
                <p className="text-xs text-soft">
                  {n.autor.nombre} · <Fecha valor={diaChile(n.creadaEl)} formato="conDia" /> {horaChile(n.creadaEl)}
                  {n.paraDueno ? " · la ve el dueño" : " · interna"}
                </p>
                {n.fotos.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {n.fotos.map((f) => (
                      <li key={f.id}>
                        <a href={urlDeArchivo("foto", f.id)} target="_blank" rel="noreferrer" aria-label={`Abrir la foto ${f.nombre}`}>
                          {/* <img> a propósito: la foto sale de una ruta con sesión, que el optimizador de next/image no puede pedir. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={urlDeArchivo("foto", f.id, { miniatura: true })}
                            alt={f.nombre}
                            loading="lazy"
                            className="size-20 rounded-lg border border-line bg-scr object-cover"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {puedeAnotar && <VisibilidadDeNota servicioId={servicioId} notaId={n.id} paraDueno={n.paraDueno} />}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </Seccion>
  );
}
