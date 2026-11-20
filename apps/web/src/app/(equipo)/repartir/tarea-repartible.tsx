"use client";
// Una tarea en el tablero de Repartir. En vez de arrastrarla (no sirve con el dedo, y en el celular
// el arrastre pelea con el scroll), se pasa a otra persona con el selector «Pasar a…».
import { useState, useTransition } from "react";
import Link from "next/link";
import type { EquipoPersona, TareaConServicio } from "@proges/contrato";
import { Insignia } from "@/componentes/ui/insignia";
import { Select } from "@/componentes/ui/select";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { fechaConDia } from "@/lib/formato";
import { pasarTarea } from "./acciones";
import { OpcionesDePersonas } from "./opciones-de-personas";

export function TareaRepartible({
  tarea,
  personas,
  hoy,
}: {
  tarea: TareaConServicio;
  personas: EquipoPersona[];
  hoy: string;
}) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const atrasada = tarea.vence !== null && tarea.vence < hoy;

  function pasarA(responsableId: string) {
    setError(null);
    empezar(async () => {
      const resultado = await pasarTarea(tarea.id, responsableId || null);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <Tarjeta tono="item" className="gap-1.5 bg-card">
      <Link href={`/servicios/${tarea.servicio.id}`} className="flex min-w-0 flex-col gap-0.5 hover:underline">
        <span className="text-[13px] leading-snug font-bold">{tarea.que}</span>
        <span className="text-xs text-soft">{tarea.propiedad.direccion}</span>
      </Link>
      {tarea.vence && (
        <Insignia tono={atrasada ? "bad" : "neutro"}>
          {atrasada ? "Atrasada · " : ""}
          {fechaConDia(tarea.vence)}
        </Insignia>
      )}
      <Select
        value={tarea.responsable?.id ?? ""}
        onChange={(e) => pasarA(e.target.value)}
        disabled={pendiente}
        aria-label={`Pasar la tarea «${tarea.que}» a otra persona`}
        className="h-9 text-[13px]"
      >
        <OpcionesDePersonas personas={personas} sinNadie="Sin responsable" />
      </Select>
      {error && (
        <p role="alert" className="text-xs font-semibold text-bad">
          {error}
        </p>
      )}
    </Tarjeta>
  );
}
