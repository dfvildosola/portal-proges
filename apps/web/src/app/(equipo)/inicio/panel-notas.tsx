// «Lo último que se anotó»: las últimas notas con foto, para ver el avance sin abrir cada
// servicio. La foto es la primera de la nota (miniatura); cada una lleva a su servicio.
import Link from "next/link";
import type { InicioEquipo } from "@proges/contrato";

type InicioNota = InicioEquipo["ultimasNotasConFoto"][number];
import { Vacio } from "@/componentes/comunes/vacio";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { urlDeArchivo } from "@/lib/archivos";
import { diaChile, haceCuanto, horaChile } from "@/lib/formato";

// «12:20» si fue hoy; si no, «ayer», «hace 3 días».
function cuando(iso: string): string {
  const dia = haceCuanto(diaChile(iso));
  return dia === "hoy" ? horaChile(iso) : dia;
}

export function PanelNotas({ notas }: { notas: InicioNota[] }) {
  return (
    <Tarjeta>
      <TarjetaTitulo>Lo último que se anotó</TarjetaTitulo>
      {notas.length === 0 ? (
        <Vacio texto="Todavía no hay notas con foto." className="py-6" />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {notas.map((n) => (
            <li key={n.id}>
              <Link href={`/servicios/${n.servicio.id}`} className="flex gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
                {n.fotos[0] && (
                  // Una foto ya achicada de la API: un <img> normal basta (no pasa por el optimizador de Next).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlDeArchivo("foto", n.fotos[0].id, { miniatura: true })}
                    alt={`Foto de la nota en ${n.propiedad.direccion}`}
                    className="h-11 w-14 shrink-0 rounded-md bg-line object-cover"
                    loading="lazy"
                  />
                )}
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[13px] leading-snug font-bold">{n.texto || "Foto sin texto"}</span>
                  <span className="block text-xs text-soft">
                    {n.autor.nombre} · {n.propiedad.direccion} · {cuando(n.creadaEl)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
