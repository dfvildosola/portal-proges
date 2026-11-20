// Las miniaturas de las fotos de una recepción. Cada una abre la foto completa en otra pestaña.
// Las fotos viven en el Drive de la propiedad; la web las pide por /archivos/foto/<id>, que revisa
// quién pregunta (la API solo se las entrega al equipo).
import type { PartidaEquipo } from "@proges/contrato";
import { urlDeArchivo } from "@/lib/archivos";

export function FotosDePartida({ fotos }: { fotos: PartidaEquipo["fotos"] }) {
  if (fotos.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {fotos.map((f) => (
        <li key={f.id}>
          <a href={urlDeArchivo("foto", f.id)} target="_blank" rel="noreferrer" aria-label={`Abrir la foto ${f.nombre}`}>
            {/* <img> a propósito: la foto sale de una ruta con sesión, que el optimizador de next/image no puede pedir. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlDeArchivo("foto", f.id, { miniatura: true })}
              alt={f.nombre}
              loading="lazy"
              className="size-16 rounded-lg border border-line bg-scr object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
