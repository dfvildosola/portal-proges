"use client";

// Controles de recepción de una partida (solo equipo):
//  - RecibirConformeBoton: un toque, la partida queda conforme.
//  - ObservarBoton: diálogo para dejarla observada, con lo que hay que corregir, a quién le toca
//    (optativo) y fotos (optativas, se achican en el navegador antes de enviarse).

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, ImagePlus, TriangleAlert, X } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FOTOS_POR_NOTA } from "./bitacora-limites";
import { achicarFoto } from "./obra-fotos-cliente";
import { recibirPartida, type RecepcionFormState } from "./obra-recepcion-actions";

export function RecibirConformeBoton({ partidaId, texto }: { partidaId: string; texto: string }) {
  const [state, formProps, pending] = useFormAction(recibirPartida, {} as RecepcionFormState);
  return (
    <form {...formProps} className="flex flex-col gap-1">
      <input type="hidden" name="partidaId" value={partidaId} />
      <input type="hidden" name="resultado" value="CONFORME" />
      <Button type="submit" size="sm" disabled={pending}>
        <Check className="size-4" />
        {pending ? "Guardando…" : texto}
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export type ResponsableOpcion = { id: string; nombre: string };

type FotoLista = { clave: string; blob: Blob; vista: string };

function ObservarForm({
  partidaId,
  observacionActual,
  responsables,
  puedeSubirFotos,
  onListo,
}: {
  partidaId: string;
  observacionActual: string;
  responsables: ResponsableOpcion[];
  puedeSubirFotos: boolean;
  onListo: () => void;
}) {
  const [fotos, setFotos] = useState<FotoLista[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [errorFotos, setErrorFotos] = useState<string | null>(null);
  const [responsableId, setResponsableId] = useState("");
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  const [state, formProps, pending] = useFormAction(
    async (prev: RecepcionFormState, formData: FormData) => {
      // Las fotos achicadas salen del estado, no del campo de archivo.
      for (const f of fotos) formData.append("fotos", f.blob, `foto-${f.clave}.jpg`);
      return recibirPartida(prev, formData);
    },
    {} as RecepcionFormState,
  );

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  async function agregar(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setErrorFotos(null);
    const elegidas = Array.from(archivos).slice(0, Math.max(MAX_FOTOS_POR_NOTA - fotos.length, 0));
    if (archivos.length > elegidas.length) {
      setErrorFotos(`Máximo ${MAX_FOTOS_POR_NOTA} fotos: se agregaron solo las primeras.`);
    }
    setProcesando(true);
    const listas: FotoLista[] = [];
    try {
      for (const archivo of elegidas) {
        const blob = await achicarFoto(archivo);
        listas.push({ clave: `${Date.now()}-${listas.length}`, blob, vista: URL.createObjectURL(blob) });
      }
    } catch {
      setErrorFotos("No pude leer una de las fotos. Prueba con otra, o con la cámara del celular.");
    }
    setFotos((actuales) => [...actuales, ...listas]);
    setProcesando(false);
  }

  function sacar(clave: string) {
    const f = fotos.find((x) => x.clave === clave);
    if (f) URL.revokeObjectURL(f.vista);
    setFotos((actuales) => actuales.filter((x) => x.clave !== clave));
  }

  const items = Object.fromEntries(responsables.map((r) => [r.id, r.nombre]));
  const llena = fotos.length >= MAX_FOTOS_POR_NOTA;
  const ocupado = pending || procesando;

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="partidaId" value={partidaId} />
      <input type="hidden" name="resultado" value="OBSERVADA" />
      <input type="hidden" name="responsableId" value={responsableId} />

      <Field label="Qué hay que corregir" htmlFor={`obs-${partidaId}`} error={state?.fieldErrors?.observacion}>
        <Textarea
          id={`obs-${partidaId}`}
          name="observacion"
          rows={3}
          defaultValue={observacionActual}
          className="text-base"
          placeholder="«El porcelanato quedó con un desnivel junto a la puerta»"
        />
      </Field>

      <Field label="¿A quién le toca? (optativo)" error={state?.fieldErrors?.responsableId}>
        <Select items={items} value={responsableId || null} onValueChange={(v) => setResponsableId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sin responsable por ahora" />
          </SelectTrigger>
          <SelectContent>
            {responsables.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {puedeSubirFotos ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11" disabled={ocupado || llena} onClick={() => camara.current?.click()}>
              <Camera className="size-5" />
              Sacar foto
            </Button>
            <Button type="button" variant="outline" className="h-11" disabled={ocupado || llena} onClick={() => galeria.current?.click()}>
              <ImagePlus className="size-5" />
              Elegir fotos
            </Button>
          </div>
          {/* Estos campos solo sirven para elegir: no llevan `name`, así que no viajan en el envío. */}
          <input
            ref={camara}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void agregar(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={galeria}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void agregar(e.target.files);
              e.target.value = "";
            }}
          />
          {procesando && <p className="text-sm text-muted-foreground">Preparando las fotos…</p>}
          {errorFotos && <p className="text-sm text-destructive">{errorFotos}</p>}
          {state?.fieldErrors?.fotos && <p className="text-sm text-destructive">{state.fieldErrors.fotos}</p>}
          {fotos.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {fotos.map((f) => (
                <li key={f.clave} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <Image src={f.vista} alt="Foto por subir" fill unoptimized className="object-cover" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1 right-1 size-8 rounded-full"
                    aria-label="Quitar la foto"
                    onClick={() => sacar(f.clave)}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Para subir fotos, enlaza primero la carpeta del Drive de la propiedad (en la bitácora del proyecto).
        </p>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={ocupado}>
        {pending ? "Guardando…" : "Dejar observada"}
      </Button>
    </form>
  );
}

export function ObservarBoton(props: {
  partidaId: string;
  descripcion: string;
  observacionActual: string;
  responsables: ResponsableOpcion[];
  puedeSubirFotos: boolean;
  texto: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  const { descripcion, texto, ...resto } = props;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <TriangleAlert className="size-4" />
        {texto}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dejar observada la partida</DialogTitle>
          <DialogDescription>
            {descripcion}. Se abre una tarea «Corregir» para arreglarla; cuando quede bien, se recibe conforme.
          </DialogDescription>
        </DialogHeader>
        <ObservarForm {...resto} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}
