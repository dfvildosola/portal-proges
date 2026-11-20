// Pestaña «Reparaciones»: cada obra de la propiedad con lo cobrado al dueño y, solo para el equipo,
// el costo del maestro, el margen y los días planificados contra los reales. Al abrir una obra se
// ven sus partidas (qué se hizo en cada recinto y cómo se recibió). Abajo, el total por recinto.
//
// Lo que la API no manda (costo, margen, días, observaciones) no se dibuja: el dueño ve la misma
// pantalla sin esas filas. Se usa <details> del navegador para abrir y cerrar, sin JavaScript.
import type { FichaObra, FichaPartida, FichaReparaciones } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia, type TonoDeInsignia } from "@/componentes/ui/insignia";
import { Tabla, TablaCelda, TablaCuerpo, TablaFila, TablaTitulo } from "@/componentes/ui/tabla";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { ETIQUETA_ESTADO_SERVICIO_FICHA, TONO_ESTADO_SERVICIO_FICHA } from "./etiquetas-ficha";
import type { ModoFicha } from "./modo";

const RECEPCION: Record<FichaPartida["recepcion"], { texto: string; tono: TonoDeInsignia }> = {
  PENDIENTE: { texto: "Pendiente", tono: "neutro" },
  CONFORME: { texto: "Conforme", tono: "ok" },
  OBSERVADA: { texto: "Observada", tono: "warn" },
};

function Dato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[11px] font-bold tracking-[0.06em] text-soft uppercase">{rotulo}</span>
      <span className="text-sm font-bold">{children}</span>
    </div>
  );
}

function Dias({ dias }: { dias: NonNullable<FichaObra["dias"]> }) {
  if (dias.real === null && dias.planificado === null) return <span className="text-soft">—</span>;
  const de = dias.planificado === null ? "" : ` de ${dias.planificado}`;
  const pasado = dias.diferencia !== null && dias.diferencia > 0;
  return (
    <span className={pasado ? "text-bad" : undefined}>
      {dias.real ?? 0}
      {de}
      {pasado ? ` (${dias.diferencia} de más)` : ""}
    </span>
  );
}

function TarjetaDeObra({ obra, modo }: { obra: FichaObra; modo: ModoFicha }) {
  const esEquipo = modo === "equipo";
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-extrabold">{obra.nombre}</span>
          <span className="text-xs text-soft">
            Abierta <Fecha valor={obra.abiertoEl} formato="conAnio" />
            {obra.cerradoEl && (
              <>
                {" · cerrada "}
                <Fecha valor={obra.cerradoEl} formato="conAnio" />
              </>
            )}
            {obra.orden && ` · orden ${obra.orden.numero}`}
          </span>
        </div>
        <Insignia tono={TONO_ESTADO_SERVICIO_FICHA[obra.estado]}>
          {ETIQUETA_ESTADO_SERVICIO_FICHA[obra.estado]} · {Math.round(obra.avance)} %
        </Insignia>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato rotulo={esEquipo ? "Cobrado" : "Pagado"}>{obra.orden ? <Monto valor={obra.orden.cobrado} /> : <span className="text-soft">Sin orden</span>}</Dato>
        {obra.costoMaestro !== undefined && (
          <Dato rotulo="Costo del maestro">
            <Monto valor={obra.costoMaestro} />
          </Dato>
        )}
        {obra.margen !== undefined && (
          <Dato rotulo="Margen">
            <Monto valor={obra.margen} />
          </Dato>
        )}
        {obra.dias !== undefined && (
          <Dato rotulo="Días: reales y plan">
            <Dias dias={obra.dias} />
          </Dato>
        )}
      </div>

      <details className="group mt-1">
        <summary className="inline-flex min-h-9 cursor-pointer items-center text-[13px] font-bold text-ink hover:underline">
          {obra.partidas.length === 1 ? "Ver la partida" : `Ver las ${obra.partidas.length} partidas`}
        </summary>
        {obra.partidas.length === 0 ? (
          <p className="py-2 text-sm text-soft">Esta obra todavía no tiene partidas.</p>
        ) : (
          <Tabla className="mt-1">
            <thead>
              <tr>
                <TablaTitulo>Recinto</TablaTitulo>
                <TablaTitulo>Qué se hizo</TablaTitulo>
                <TablaTitulo>Recepción</TablaTitulo>
                <TablaTitulo className="text-right">Fotos</TablaTitulo>
                <TablaTitulo className="text-right">Cobrado</TablaTitulo>
              </tr>
            </thead>
            <TablaCuerpo>
              {obra.partidas.map((p) => (
                <TablaFila key={p.id}>
                  <TablaCelda>{p.recinto ?? "General"}</TablaCelda>
                  <TablaCelda className="min-w-48">
                    {p.descripcion}
                    {p.observacion && <div className="text-xs text-soft">Observación: {p.observacion}</div>}
                  </TablaCelda>
                  <TablaCelda>
                    <Insignia tono={RECEPCION[p.recepcion].tono}>{RECEPCION[p.recepcion].texto}</Insignia>
                  </TablaCelda>
                  <TablaCelda className="text-right tabular-nums">{p.fotos}</TablaCelda>
                  <TablaCelda className="text-right">
                    <Monto valor={p.cobrado} />
                  </TablaCelda>
                </TablaFila>
              ))}
            </TablaCuerpo>
          </Tabla>
        )}
      </details>
    </Tarjeta>
  );
}

export function PestanaReparaciones({ reparaciones, modo }: { reparaciones: FichaReparaciones; modo: ModoFicha }) {
  if (reparaciones.obras.length === 0) {
    return <Vacio texto="Esta propiedad todavía no tiene reparaciones." />;
  }
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-3">
        {reparaciones.obras.map((obra) => (
          <TarjetaDeObra key={obra.servicioId} obra={obra} modo={modo} />
        ))}
      </div>
      <Tarjeta>
        <TarjetaTitulo>{modo === "equipo" ? "Cobrado" : "Pagado"} por recinto</TarjetaTitulo>
        <Tabla>
          <TablaCuerpo>
            {reparaciones.totalPorRecinto.map((r) => (
              <TablaFila key={r.recinto ?? "general"}>
                <TablaCelda>
                  {r.recinto ?? "General"}
                  <div className="text-xs text-soft">{r.partidas === 1 ? "1 partida" : `${r.partidas} partidas`}</div>
                </TablaCelda>
                <TablaCelda className="text-right">
                  {r.total.length === 0 ? (
                    <Monto valor={null} />
                  ) : (
                    r.total.map((m) => (
                      <div key={m.moneda}>
                        <Monto valor={m} />
                      </div>
                    ))
                  )}
                </TablaCelda>
              </TablaFila>
            ))}
          </TablaCuerpo>
        </Tabla>
      </Tarjeta>
    </div>
  );
}
