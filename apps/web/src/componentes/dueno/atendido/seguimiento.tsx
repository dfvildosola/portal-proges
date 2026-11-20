// El seguimiento de un servicio, contado como una línea de tiempo: las notas que el equipo marcó
// para el dueño (con sus fotos) y cada cambio de «a quién esperamos». Es lo que en la maqueta se
// ve como «Seguimiento». De lo más nuevo a lo más antiguo.
import type { NotaDueno, Novedades } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Fecha } from "@/componentes/comunes/fecha";
import { Vacio } from "@/componentes/comunes/vacio";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { ErrorDeApi, pedir } from "@/lib/api";
import { urlDeArchivo } from "@/lib/archivos";
import { cn } from "@/lib/utils";
import { fraseDeEspera } from "./etiquetas-atendido";

type Hito =
  | { tipo: "nota"; fecha: string; nota: NotaDueno }
  | { tipo: "espera"; fecha: string; texto: string };

// Los cambios de espera de este servicio salen de las novedades del dueño, filtradas por su id
// para que un servicio antiguo no pierda sus cambios entre los de otros.
async function cambiosDeEspera(servicioId: string): Promise<{ hitos: Hito[]; error: string | null }> {
  try {
    const { items } = await pedir<Novedades>("/v1/novedades", { consulta: { limite: 100, servicioId } });
    const hitos: Hito[] = [];
    for (const n of items) {
      if (n.tipo === "ESPERA" && n.servicio.id === servicioId) {
        hitos.push({ tipo: "espera", fecha: n.fecha, texto: fraseDeEspera(n.a, n.detalle) });
      }
    }
    return { hitos, error: null };
  } catch (error) {
    if (error instanceof ErrorDeApi) return { hitos: [], error: error.mensaje };
    throw error;
  }
}

export async function SeguimientoDelServicio({ servicioId, notas }: { servicioId: string; notas: NotaDueno[] }) {
  const { hitos: esperas, error } = await cambiosDeEspera(servicioId);
  const hitos: Hito[] = [...notas.map((nota): Hito => ({ tipo: "nota", fecha: nota.creadaEl, nota })), ...esperas];
  // Las fechas son momentos exactos en ISO: ordenadas como texto quedan en orden cronológico.
  hitos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  return (
    <Tarjeta>
      <TarjetaTitulo>Seguimiento</TarjetaTitulo>
      {error && <ErrorDeCarga mensaje={error} />}
      {hitos.length === 0 ? (
        <Vacio texto="Todavía no hay novedades de este servicio." className="border-0 py-4" />
      ) : (
        <ol className="flex flex-col">
          {hitos.map((h, i) => (
            <li key={`${h.tipo}-${h.fecha}-${i}`} className="flex gap-3 border-b border-line py-2.5 last:border-b-0">
              <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", h.tipo === "nota" ? "bg-ok" : "bg-warn")} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-soft">
                  <Fecha valor={h.fecha} formato="conAnio" /> · <Fecha valor={h.fecha} formato="hora" />
                </span>
                {h.tipo === "espera" ? (
                  <span className="text-sm font-bold">{h.texto}</span>
                ) : (
                  <>
                    {h.nota.texto && <span className="text-sm font-bold break-words">{h.nota.texto}</span>}
                    {h.nota.fotos.length > 0 && (
                      <span className="flex flex-wrap gap-1.5">
                        {h.nota.fotos.map((f) => (
                          <a key={f.id} href={urlDeArchivo("foto", f.id)} target="_blank" rel="noreferrer" aria-label={`Abrir la foto ${f.nombre}`}>
                            {/* <img> a propósito: la foto sale de una ruta con sesión, que next/image no puede pedir. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={urlDeArchivo("foto", f.id, { miniatura: true })} alt={f.nombre} loading="lazy" className="size-20 rounded-lg object-cover" />
                          </a>
                        ))}
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  );
}
