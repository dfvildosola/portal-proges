// Las novedades del dueño: lo que el equipo marcó para él y los cambios de «a quién esperamos»,
// de lo más nuevo a lo más antiguo (GET /v1/novedades). Se carga solo: si falla, el aviso queda en
// este bloque y el resto del inicio se ve igual.
import Link from "next/link";
import type { Novedad, Novedades } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Fecha } from "@/componentes/comunes/fecha";
import { Vacio } from "@/componentes/comunes/vacio";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ErrorDeApi, pedir } from "@/lib/api";
import { urlDeArchivo } from "@/lib/archivos";
import { fraseDeEspera, nombreDelServicio } from "./etiquetas-atendido";

function Fila({ n }: { n: Novedad }) {
  const donde = `${nombreDelServicio(n.servicio.tipo)} · ${n.propiedad.direccion}`;
  return (
    <li>
      <Link href={`/mi/servicios/${encodeURIComponent(n.servicio.id)}`} className="block">
        <Tarjeta tono="item" className="gap-1 hover:bg-ink-soft">
          {n.tipo === "NOTA" ? (
            <>
              <span className="text-sm font-bold break-words">{n.nota.texto || "El equipo agregó fotos."}</span>
              {n.nota.fotos.length > 0 && (
                <span className="flex gap-1.5 py-1">
                  {n.nota.fotos.slice(0, 3).map((f) => (
                    // <img> a propósito: la foto sale de una ruta con sesión, que next/image no puede pedir.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={f.id}
                      src={urlDeArchivo("foto", f.id, { miniatura: true })}
                      alt={f.nombre}
                      loading="lazy"
                      className="size-14 rounded-lg object-cover"
                    />
                  ))}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-bold">{fraseDeEspera(n.a, n.detalle)}</span>
          )}
          <span className="text-xs text-soft">
            {donde} · <Fecha valor={n.fecha} formato="relativa" />
          </span>
        </Tarjeta>
      </Link>
    </li>
  );
}

export async function NovedadesDelDueno({ limite = 8 }: { limite?: number }) {
  let datos: Novedades;
  try {
    datos = await pedir<Novedades>("/v1/novedades", { consulta: { limite } });
  } catch (error) {
    if (error instanceof ErrorDeApi) return <ErrorDeCarga mensaje={error.mensaje} />;
    throw error;
  }
  if (datos.items.length === 0) {
    return <Vacio texto="Todavía no hay novedades. Cuando Proges avance en algo, lo verás aquí." />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {datos.items.map((n, i) => (
        <Fila key={`${n.tipo}-${n.fecha}-${i}`} n={n} />
      ))}
    </ul>
  );
}
