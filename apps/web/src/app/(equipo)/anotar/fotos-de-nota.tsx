"use client";
// Las fotos de la nota: los botones para sacar una con la cámara (o elegir una de la galería) y las
// miniaturas con su «quitar». Cada foto se ACHICA AQUÍ, en el teléfono, antes de guardarla
// (lib/foto-achicada.ts): así sube rápido aunque haya mala señal.
import { Camera, Image as IconoGaleria, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Boton } from "@/componentes/ui/boton";
import { achicarFoto, ErrorDeFoto } from "@/lib/foto-achicada";

/** Lo mismo que acepta la API por nota. */
export const MAX_FOTOS = 6;

export type FotoElegida = { id: string; archivo: File; vista: string };

export function FotosDeNota({ fotos, alCambiar }: { fotos: FotoElegida[]; alCambiar: (fotos: FotoElegida[]) => void }) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [preparando, setPreparando] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  // Las fotos y su versión más reciente, para soltar las miniaturas al salir sin tropezar con el
  // estado viejo de un efecto.
  const ultimas = useRef(fotos);
  useEffect(() => {
    ultimas.current = fotos;
  }, [fotos]);
  useEffect(() => () => ultimas.current.forEach((f) => URL.revokeObjectURL(f.vista)), []);

  async function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(evento.target.files ?? []);
    evento.target.value = ""; // para poder volver a elegir la misma foto
    if (elegidas.length === 0) return;
    setAviso(null);

    const lugar = MAX_FOTOS - ultimas.current.length;
    if (elegidas.length > lugar) setAviso(`Máximo ${MAX_FOTOS} fotos por nota.`);
    setPreparando((n) => n + Math.min(elegidas.length, lugar));
    for (const original of elegidas.slice(0, Math.max(0, lugar))) {
      try {
        const archivo = await achicarFoto(original);
        const nueva = { id: crypto.randomUUID(), archivo, vista: URL.createObjectURL(archivo) };
        ultimas.current = [...ultimas.current, nueva];
        alCambiar(ultimas.current);
      } catch (error) {
        if (!(error instanceof ErrorDeFoto)) throw error;
        setAviso(error.message);
      } finally {
        setPreparando((n) => n - 1);
      }
    }
  }

  function quitar(id: string) {
    const quitada = ultimas.current.find((f) => f.id === id);
    if (quitada) URL.revokeObjectURL(quitada.vista);
    ultimas.current = ultimas.current.filter((f) => f.id !== id);
    alCambiar(ultimas.current);
    setAviso(null);
  }

  const lleno = fotos.length + preparando >= MAX_FOTOS;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Boton onClick={() => camara.current?.click()} disabled={lleno} className="h-14 text-base">
          <Camera aria-hidden className="size-5!" /> Sacar foto
        </Boton>
        <Boton variante="contorno" onClick={() => galeria.current?.click()} disabled={lleno} className="h-14 text-base">
          <IconoGaleria aria-hidden className="size-5!" /> Galería
        </Boton>
      </div>
      {/* capture="environment" abre directo la cámara trasera del teléfono. */}
      <input ref={camara} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={alElegir} />
      <input ref={galeria} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={alElegir} />

      {aviso && (
        <p role="alert" className="text-xs font-semibold text-bad">
          {aviso}
        </p>
      )}

      {(fotos.length > 0 || preparando > 0) && (
        <ul className="grid grid-cols-3 gap-2">
          {fotos.map((foto) => (
            <li key={foto.id} className="relative aspect-square overflow-hidden rounded-[10px] border border-line bg-scr">
              {/* eslint-disable-next-line @next/next/no-img-element -- es una foto local del teléfono (blob:), no hay nada que optimizar */}
              <img src={foto.vista} alt="Foto para la nota" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => quitar(foto.id)}
                aria-label="Quitar esta foto"
                className="absolute top-1 right-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-fg/70 text-card"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
          {Array.from({ length: preparando }, (_, i) => (
            <li
              key={`preparando-${i}`}
              className="flex aspect-square items-center justify-center rounded-[10px] border border-dashed border-line px-1 text-center text-[11px] text-soft"
            >
              Preparando…
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-soft">
        {fotos.length === 0 ? "Hasta 6 fotos. Se achican solas para subir rápido." : `${fotos.length} de ${MAX_FOTOS} fotos.`}
      </p>
    </div>
  );
}
