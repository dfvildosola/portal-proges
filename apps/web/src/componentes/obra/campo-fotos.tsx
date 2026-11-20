"use client";
// El campo para elegir fotos. En cuanto la persona las elige, se achican en el teléfono (una foto
// de cámara pesa 4 a 10 MB y la API acepta 4 MB por foto) y se dejan en el mismo campo, así el
// formulario las envía ya livianas. Mientras se achican avisa al formulario, que espera a que
// terminen antes de dejar enviar.
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFoto, achicarFoto } from "@/lib/foto-achicada";

/** Lo máximo que acepta la API por recepción. */
const MAXIMO_DE_FOTOS = 6;

export function CampoFotos({ error, alPreparar }: { error?: string; alPreparar: (preparando: boolean) => void }) {
  const campo = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);

  // Si el diálogo se cierra a medio achicar, el botón de enviar no se queda bloqueado.
  useEffect(() => () => alPreparar(false), [alPreparar]);

  async function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(evento.target.files ?? []);
    setAviso(null);
    if (elegidas.length === 0) return;
    if (elegidas.length > MAXIMO_DE_FOTOS) {
      setAviso(`Máximo ${MAXIMO_DE_FOTOS} fotos por recepción.`);
      evento.target.value = "";
      return;
    }
    setPreparando(true);
    alPreparar(true);
    try {
      const livianas = await Promise.all(elegidas.map(achicarFoto));
      // Un campo de archivos solo se puede rellenar con una lista armada así.
      const lista = new DataTransfer();
      for (const foto of livianas) lista.items.add(foto);
      if (campo.current) campo.current.files = lista.files;
    } catch (causa) {
      if (!(causa instanceof ErrorDeFoto)) throw causa;
      setAviso(causa.message);
      if (campo.current) campo.current.value = "";
    } finally {
      setPreparando(false);
      alPreparar(false);
    }
  }

  return (
    <CampoFormulario etiqueta="Fotos (optativo)" error={error ?? aviso ?? undefined} ayuda={preparando ? "Preparando las fotos…" : `Hasta ${MAXIMO_DE_FOTOS}.`}>
      <input
        ref={campo}
        type="file"
        name="fotos"
        accept="image/*"
        multiple
        onChange={alElegir}
        className="w-full text-sm file:mr-3 file:h-9 file:cursor-pointer file:rounded-[9px] file:border-0 file:bg-ink-soft file:px-3 file:font-bold file:text-ink"
      />
    </CampoFormulario>
  );
}
