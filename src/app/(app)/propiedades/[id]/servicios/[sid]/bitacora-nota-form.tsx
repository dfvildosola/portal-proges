"use client";

// Formulario de la bitácora, pensado para el celular: un campo de texto como un WhatsApp, botones
// grandes para las fotos, y dos controles chicos (la ve el dueño, tarea). Nada más.
//
// Las fotos del celular pesan 4 a 10 MB y Vercel solo deja pasar unos 4,5 MB por envío. Por eso
// el navegador las achica antes (1600 px de lado mayor, JPEG calidad 0,8): es como reducir la foto
// antes de adjuntarla a un correo. Las fotos achicadas se guardan en el estado y se agregan al
// envío en el momento de enviar; el campo de archivo del navegador solo sirve para elegirlas.

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Send, X } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { crearNota } from "./bitacora-actions";
import type { BitacoraFormState } from "./bitacora-actions";
import { CALIDAD_JPEG, LADO_MAYOR_PX, MAX_FOTOS_POR_NOTA } from "./bitacora-limites";

export type TareaAbierta = { id: string; que: string };

type FotoLista = { clave: string; blob: Blob; vista: string };

// Achica una foto: la dibuja en un lienzo (canvas) más chico y la guarda como JPEG.
// `imageOrientation: "from-image"` respeta la rotación con que el celular la sacó.
async function achicar(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  try {
    const escala = Math.min(1, LADO_MAYOR_PX / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    const contexto = lienzo.getContext("2d");
    if (!contexto) throw new Error("El navegador no pudo preparar la foto.");
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    return await new Promise<Blob>((resolver, rechazar) =>
      lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("El navegador no pudo preparar la foto."))), "image/jpeg", CALIDAD_JPEG),
    );
  } finally {
    imagen.close();
  }
}

export function BitacoraNotaForm({
  servicioEnCursoId,
  tareas,
  puedeSubirFotos,
}: {
  servicioEnCursoId: string;
  // Las tareas abiertas del proyecto, para enlazar la nota a una.
  tareas: TareaAbierta[];
  // false si la propiedad no tiene carpeta del Drive: no se ofrecen fotos hasta enlazarla.
  puedeSubirFotos: boolean;
}) {
  const [fotos, setFotos] = useState<FotoLista[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [errorFotos, setErrorFotos] = useState<string | null>(null);
  const [paraDueno, setParaDueno] = useState(false);
  const [tareaId, setTareaId] = useState("");
  const entradaCamara = useRef<HTMLInputElement>(null);
  const entradaGaleria = useRef<HTMLInputElement>(null);

  function vaciarFotos() {
    for (const f of fotos) URL.revokeObjectURL(f.vista);
    setFotos([]);
  }

  const [state, formProps, pending] = useFormAction(
    async (prev: BitacoraFormState, formData: FormData) => {
      // Las fotos achicadas salen del estado, no del campo de archivo.
      for (const f of fotos) formData.append("fotos", f.blob, `foto-${f.clave}.jpg`);
      const resultado = await crearNota(prev, formData);
      if (!resultado.error && !resultado.fieldErrors) {
        // Se guardó: el formulario se vacía (el texto lo vacía useFormAction; lo demás, acá).
        vaciarFotos();
        setParaDueno(false);
        setTareaId("");
        setErrorFotos(null);
      }
      return resultado;
    },
    {} as BitacoraFormState,
  );

  async function agregarFotos(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setErrorFotos(null);
    const lugar = MAX_FOTOS_POR_NOTA - fotos.length;
    const elegidas = Array.from(archivos).slice(0, Math.max(lugar, 0));
    if (archivos.length > elegidas.length) {
      setErrorFotos(`Máximo ${MAX_FOTOS_POR_NOTA} fotos por nota: se agregaron solo las primeras.`);
    }
    setProcesando(true);
    const listas: FotoLista[] = [];
    try {
      for (const archivo of elegidas) {
        const blob = await achicar(archivo);
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

  const itemsTarea = Object.fromEntries(tareas.map((t) => [t.id, t.que]));
  const llena = fotos.length >= MAX_FOTOS_POR_NOTA;
  const ocupado = pending || procesando;

  return (
    <form {...formProps} className="flex flex-col gap-3">
      <input type="hidden" name="servicioId" value={servicioEnCursoId} />
      <input type="hidden" name="paraDueno" value={paraDueno ? "1" : ""} />
      <input type="hidden" name="tareaId" value={tareaId} />

      <Field label="Nota" htmlFor="bitacora-texto" error={state?.fieldErrors?.texto}>
        <Textarea
          id="bitacora-texto"
          name="texto"
          rows={3}
          placeholder="Qué pasó: «fui, faltaba la llave del medidor»"
          className="min-h-24 text-base"
        />
      </Field>

      {puedeSubirFotos && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 text-base"
              disabled={ocupado || llena}
              onClick={() => entradaCamara.current?.click()}
            >
              <Camera className="size-5" />
              Sacar foto
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 text-base"
              disabled={ocupado || llena}
              onClick={() => entradaGaleria.current?.click()}
            >
              <ImagePlus className="size-5" />
              Elegir fotos
            </Button>
          </div>
          {/* Estos campos solo sirven para elegir: no llevan `name`, así que no viajan en el envío. */}
          <input
            ref={entradaCamara}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void agregarFotos(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={entradaGaleria}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void agregarFotos(e.target.files);
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
      )}

      <div className="flex items-center gap-3">
        <Checkbox id="bitacora-dueno" checked={paraDueno} onCheckedChange={setParaDueno} className="size-5" />
        <Label htmlFor="bitacora-dueno" className="flex-col items-start gap-0.5 py-1">
          La ve el dueño
          <span className="text-xs font-normal text-muted-foreground">Sin marcar, la nota es solo del equipo.</span>
        </Label>
      </div>

      {tareas.length > 0 && (
        <Field label="Tarea (opcional)" error={state?.fieldErrors?.tareaId}>
          <Select
            items={itemsTarea}
            value={tareaId || null}
            onValueChange={(v) => setTareaId(v ?? "")}
          >
            <SelectTrigger className="h-11 w-full text-base">
              <SelectValue placeholder="Sin tarea" />
            </SelectTrigger>
            <SelectContent>
              {tareas.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.que}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.aviso && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">{state.aviso}</p>
      )}

      <Button type="submit" disabled={ocupado} className="h-11 text-base">
        <Send className="size-5" />
        {pending ? "Guardando…" : "Anotar"}
      </Button>
    </form>
  );
}
