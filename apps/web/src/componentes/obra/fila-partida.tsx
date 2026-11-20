"use client";
// Una partida de la orden: qué se hace, cuánto avanzó, quién la hace y si ya se recibió. El avance
// y el maestro se guardan al tocar la lista (sin botón «guardar»), como marcar una casilla.
import { useState } from "react";
import type { PartidaEquipo } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Fecha } from "@/componentes/comunes/fecha";
import { Insignia } from "@/componentes/ui/insignia";
import { Select } from "@/componentes/ui/select";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { cambiarPartida } from "./acciones";
import { AVANCES, ETIQUETA_RECEPCION, TONO_RECEPCION } from "./etiquetas-obra";
import { FotosDePartida } from "./fotos-de-partida";
import { RecibirPartida } from "./recibir-partida";
import { useAccionDirecta } from "./usar-accion-directa";

export type PersonaParaElegir = { id: string; nombre: string };

export function FilaPartida({
  servicioId,
  partida,
  maestros,
  equipo,
  editable,
}: {
  servicioId: string;
  partida: PartidaEquipo;
  maestros: PersonaParaElegir[];
  equipo: PersonaParaElegir[];
  editable: boolean;
}) {
  const [avance, setAvance] = useState(partida.avance);
  const [maestroId, setMaestroId] = useState(partida.maestro?.id ?? "");
  const { pendiente, error, ejecutar } = useAccionDirecta();

  // Una partida que Odoo ya no trae no se toca: no cuenta para el avance ni para recibir la obra.
  const bloqueada = !editable || partida.quitadaEnOdoo;
  const detalle = [partida.codigo, partida.cantidad ? `${partida.cantidad} ${partida.unidad ?? ""}`.trim() : null]
    .filter(Boolean)
    .join(" · ");

  function cambiarAvance(nuevo: number) {
    const anterior = avance;
    setAvance(nuevo);
    ejecutar(() => cambiarPartida(servicioId, partida.id, { avance: nuevo }), undefined, () => setAvance(anterior));
  }

  function cambiarMaestro(nuevo: string) {
    const anterior = maestroId;
    setMaestroId(nuevo);
    ejecutar(() => cambiarPartida(servicioId, partida.id, { maestroId: nuevo || null }), undefined, () => setMaestroId(anterior));
  }

  return (
    <Tarjeta tono="item" className={partida.quitadaEnOdoo ? "gap-2 opacity-70" : "gap-2"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{partida.descripcion}</p>
          {detalle && <p className="text-xs text-soft">{detalle}</p>}
        </div>
        {partida.quitadaEnOdoo ? (
          <Insignia tono="neutro">Quitada en Odoo</Insignia>
        ) : (
          <Insignia tono={TONO_RECEPCION[partida.recepcion]}>{ETIQUETA_RECEPCION[partida.recepcion]}</Insignia>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CampoFormulario etiqueta="Avance">
          <Select value={avance} disabled={bloqueada || pendiente} onChange={(e) => cambiarAvance(Number(e.target.value))}>
            {/* Si la orden trae un avance que no es de los cuartos, igual se muestra. */}
            {!AVANCES.some((a) => a === avance) && <option value={avance}>{avance} %</option>}
            {AVANCES.map((a) => (
              <option key={a} value={a}>
                {a} %
              </option>
            ))}
          </Select>
        </CampoFormulario>
        <CampoFormulario etiqueta="Maestro">
          <Select value={maestroId} disabled={bloqueada || pendiente} onChange={(e) => cambiarMaestro(e.target.value)}>
            <option value="">Sin maestro</option>
            {maestros.map((maestro) => (
              <option key={maestro.id} value={maestro.id}>
                {maestro.nombre}
              </option>
            ))}
          </Select>
        </CampoFormulario>
      </div>

      {partida.observacion && (
        <p className="text-xs text-soft">
          <b>{partida.recepcion === "OBSERVADA" ? "Corregir: " : "Última observación: "}</b>
          {partida.observacion}
        </p>
      )}
      {partida.recibidaEl && (
        <p className="text-xs text-soft">
          Recibida {partida.recibidaPor ? `por ${partida.recibidaPor} ` : ""}
          <Fecha valor={partida.recibidaEl} formato="relativa" />
        </p>
      )}
      <FotosDePartida fotos={partida.fotos} />
      <ErrorDeFormulario mensaje={error} />
      {!bloqueada && (
        <div className="flex justify-end">
          <RecibirPartida servicioId={servicioId} partida={partida} equipo={equipo} />
        </div>
      )}
    </Tarjeta>
  );
}
