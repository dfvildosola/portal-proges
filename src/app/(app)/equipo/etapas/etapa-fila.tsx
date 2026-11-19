"use client";

// Una etapa en la lista de su tipo: su nombre, sus marcas, cuántos servicios abiertos
// tiene, y los botones para subirla, bajarla, editarla, desactivarla o borrarla.
// Los errores de las acciones (por ejemplo «no se puede borrar») salen debajo de la fila.

import { useState } from "react";
import { ArrowDown, ArrowUp, Power, PowerOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { BotonEtapa } from "./boton-etapa";
import { EtapaDialogo } from "./etapa-dialogo";
import {
  borrarEtapa,
  cambiarActivaEtapa,
  moverEtapa,
  type EtapaFormState,
} from "./etapas-actions";

export type EtapaFilaDatos = {
  id: string;
  nombre: string;
  cierraServicio: boolean;
  propiedadPublicada: boolean;
  activa: boolean;
  abiertos: number; // servicios ABIERTOS que están hoy en esta etapa
};

export function EtapaFila({
  etapa,
  tipo,
  nombreTipo,
  esComercial,
  esPrimera,
  esUltima,
}: {
  etapa: EtapaFilaDatos;
  tipo: ServicioTipo;
  nombreTipo: string;
  esComercial: boolean;
  esPrimera: boolean;
  esUltima: boolean;
}) {
  const [aviso, setAviso] = useState<EtapaFormState | null>(null);

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={etapa.activa ? "font-medium" : "font-medium text-muted-foreground line-through"}>
          {etapa.nombre}
        </span>
        {!etapa.activa && <Badge variant="outline">Desactivada</Badge>}
        {etapa.cierraServicio && <Badge variant="success">Cierra el servicio</Badge>}
        {etapa.propiedadPublicada && <Badge variant="info">Propiedad publicada</Badge>}
        <span className="text-xs text-muted-foreground">
          {etapa.abiertos === 0
            ? "Sin servicios abiertos"
            : etapa.abiertos === 1
              ? "1 servicio abierto"
              : `${etapa.abiertos} servicios abiertos`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BotonEtapa
          accion={moverEtapa}
          campos={{ id: etapa.id, direccion: "subir" }}
          etiqueta={`Subir «${etapa.nombre}»`}
          tamano="icon-sm"
          deshabilitado={esPrimera}
          onError={setAviso}
        >
          <ArrowUp />
        </BotonEtapa>
        <BotonEtapa
          accion={moverEtapa}
          campos={{ id: etapa.id, direccion: "bajar" }}
          etiqueta={`Bajar «${etapa.nombre}»`}
          tamano="icon-sm"
          deshabilitado={esUltima}
          onError={setAviso}
        >
          <ArrowDown />
        </BotonEtapa>

        <EtapaDialogo
          tipo={tipo}
          nombreTipo={nombreTipo}
          etapa={{
            id: etapa.id,
            nombre: etapa.nombre,
            cierraServicio: etapa.cierraServicio,
            propiedadPublicada: etapa.propiedadPublicada,
          }}
          esComercial={esComercial}
        />

        <BotonEtapa
          accion={cambiarActivaEtapa}
          campos={{ id: etapa.id, activa: etapa.activa ? "no" : "si" }}
          etiqueta={etapa.activa ? `Desactivar «${etapa.nombre}»` : `Reactivar «${etapa.nombre}»`}
          onError={setAviso}
        >
          {etapa.activa ? <PowerOff /> : <Power />}
          {etapa.activa ? "Desactivar" : "Reactivar"}
        </BotonEtapa>

        <BotonEtapa
          accion={borrarEtapa}
          campos={{ id: etapa.id }}
          etiqueta={`Borrar «${etapa.nombre}»`}
          variante="ghost"
          onError={setAviso}
        >
          <Trash2 />
          Borrar
        </BotonEtapa>
      </div>

      {aviso?.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warning/40 bg-warning-soft/40 px-3 py-2 text-sm text-warning-soft-foreground"
        >
          <span>{aviso.error}</span>
          {aviso.sugerirDesactivar && etapa.activa && (
            <BotonEtapa
              accion={cambiarActivaEtapa}
              campos={{ id: etapa.id, activa: "no" }}
              etiqueta={`Desactivar «${etapa.nombre}»`}
              onError={setAviso}
            >
              <PowerOff />
              Desactivar
            </BotonEtapa>
          )}
        </div>
      )}
    </li>
  );
}
