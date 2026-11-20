"use client";
// Un servicio que nadie lleva, con su selector para asignarlo ahí mismo. Es un formulario chico:
// si la API rechaza, el mensaje aparece bajo el selector y lo elegido se queda.
import Link from "next/link";
import type { EquipoPersona, ServicioTableroItem } from "@proges/contrato";
import { ChipEsperando } from "@/componentes/comunes/chip-esperando";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { Insignia } from "@/componentes/ui/insignia";
import { Select } from "@/componentes/ui/select";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { useFormulario } from "@/lib/usar-formulario";
import { asignarResponsableDeServicio } from "./acciones";
import { OpcionesDePersonas } from "./opciones-de-personas";

export function FilaServicioSinResponsable({
  servicio,
  personas,
}: {
  servicio: ServicioTableroItem;
  personas: EquipoPersona[];
}) {
  const { formProps, pendiente, errorGeneral } = useFormulario(asignarResponsableDeServicio, { vaciarAlExito: false });
  return (
    <Tarjeta tono="item" className="gap-2">
      <Link href={`/servicios/${servicio.id}`} className="flex min-w-0 flex-col gap-0.5 hover:underline">
        <span className="text-[13px] leading-snug font-bold">{servicio.nombre}</span>
        <span className="text-xs text-soft">
          {servicio.propiedad.direccion} · {servicio.cliente.nombre}
        </span>
      </Link>
      {servicio.porConfirmar ? <Insignia tono="warn">Por confirmar</Insignia> : null}
      {servicio.esperando ? <ChipEsperando esperando={servicio.esperando} /> : null}
      <form {...formProps} className="flex items-center gap-2">
        <input type="hidden" name="servicioId" value={servicio.id} />
        <div className="min-w-0 flex-1">
          <Select name="responsableId" defaultValue="" aria-label={`Responsable de ${servicio.nombre}`}>
            <OpcionesDePersonas personas={personas} sinNadie="Elige responsable…" />
          </Select>
        </div>
        <Boton type="submit" tamano="chico" disabled={pendiente}>
          {pendiente ? "Asignando…" : "Asignar"}
        </Boton>
      </form>
      <ErrorDeFormulario mensaje={errorGeneral} />
    </Tarjeta>
  );
}
