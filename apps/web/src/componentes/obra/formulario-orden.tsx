"use client";
// Enlazar la orden de Odoo a este servicio, en dos pasos (como pedirle al banco que te muestre el
// cheque antes de cobrarlo):
//   1. Se escribe el número («S00047») y se REVISA: la web trae la orden de Odoo y dice qué se
//      enlazaría y si la cuenta analítica calza con esta propiedad. No se guarda nada.
//   2. Si el equipo confirma que es de esta unidad, se ENLAZA: se guarda y se crean las partidas.
import { useState } from "react";
import type { OrdenRevision } from "@proges/contrato";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Monto } from "@/componentes/comunes/monto";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Insignia, type TonoDeInsignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { enlazarOrden, revisarOrden } from "./acciones";
import { useAccionDirecta } from "./usar-accion-directa";

const VEREDICTO: Record<OrdenRevision["veredicto"], { tono: TonoDeInsignia; texto: string }> = {
  calza: { tono: "ok", texto: "Calza con esta propiedad" },
  otra: { tono: "warn", texto: "Parece de otra propiedad del cliente" },
  ninguna: { tono: "warn", texto: "No calza con ninguna propiedad" },
  "sin-cuenta": { tono: "neutro", texto: "La orden no trae cuenta analítica" },
};

export function FormularioOrden({ servicioId }: { servicioId: string }) {
  const [numero, setNumero] = useState("");
  const [revision, setRevision] = useState<OrdenRevision | null>(null);
  const { pendiente, error, ejecutar } = useAccionDirecta();

  function revisar() {
    ejecutar(
      () => revisarOrden(servicioId, numero.trim()),
      (respuesta) => setRevision(respuesta?.revision ?? null),
    );
  }

  // Al enlazar bien, la ficha se refresca y este formulario desaparece (ya hay orden).
  function enlazar() {
    ejecutar(() => enlazarOrden(servicioId, numero.trim()));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-bold">Número de la orden en Odoo</span>
          <CampoTexto
            value={numero}
            onChange={(e) => {
              setNumero(e.target.value);
              setRevision(null);
            }}
            placeholder="S00047"
            autoCapitalize="characters"
          />
        </label>
        <Boton variante="contorno" disabled={pendiente || numero.trim() === ""} onClick={revisar}>
          {pendiente && !revision ? "Buscando…" : "Revisar orden"}
        </Boton>
      </div>

      {revision && (
        <Tarjeta tono="item" className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm">Orden {revision.numero}</b>
            <Insignia tono="neutro">{revision.estadoOdoo}</Insignia>
            <Insignia tono={VEREDICTO[revision.veredicto].tono}>{VEREDICTO[revision.veredicto].texto}</Insignia>
          </div>
          <p className="text-xs text-soft">{revision.mensajeCuenta}</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-soft">Cliente en Odoo</dt>
            <dd>{revision.clienteOdoo ?? "—"}</dd>
            <dt className="text-soft">Propiedad de este servicio</dt>
            <dd>{revision.propiedad}</dd>
            <dt className="text-soft">Total de la orden</dt>
            <dd><Monto valor={revision.total} /></dd>
            <dt className="text-soft">Ya facturado al dueño</dt>
            <dd><Monto valor={revision.facturadoAlDueno} /></dd>
            <dt className="text-soft">Qué se trae</dt>
            <dd>
              {revision.partidas} partidas en {revision.recintos} recintos
            </dd>
          </dl>
          {revision.avisos.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-warn">
              {revision.avisos.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          )}
          <Boton disabled={pendiente} onClick={enlazar}>
            {pendiente ? "Enlazando…" : revision.veredicto === "calza" ? "Es de esta unidad: enlazar" : "Enlazar igual: es de esta unidad"}
          </Boton>
        </Tarjeta>
      )}
      <ErrorDeFormulario mensaje={error} />
    </div>
  );
}
