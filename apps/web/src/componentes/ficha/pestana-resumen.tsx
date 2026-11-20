// Pestaña «Resumen»: las cifras de la propiedad, lo último que pasó, las alertas y los servicios en
// curso con a quién se espera. Los datos vienen de una sola llamada (GET /v1/propiedades/{id}).
import Link from "next/link";
import type { FichaAlerta, FichaResumen } from "@proges/contrato";
import { ChipEsperando } from "@/componentes/comunes/chip-esperando";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { Cifra } from "./cifra";
import { esperandoParaChip } from "./esperando";
import { TONO_GRAVEDAD } from "./etiquetas-ficha";
import { LineaDeTiempo } from "./linea-de-tiempo";
import type { ModoFicha } from "./modo";
import { hrefDePestana } from "./pestanas-ficha";

// La API manda una alerta por cada documento que falta («Falta el documento: Escritura.»). Con
// los papeles de una propiedad recién cargada son nueve líneas iguales, así que acá se juntan en
// una, con el nombre de cada documento (el campo `documento` de la alerta).

const ETIQUETA_GRAVEDAD = { alta: "urgente", media: "pronto", baja: "después" } as const;
const PESO_GRAVEDAD = { alta: 0, media: 1, baja: 2 } as const;

type LineaDeAlerta = { tipo: "sueltas"; alerta: FichaAlerta } | { tipo: "faltan"; nombres: string[] };

// Las alertas sueltas ya vienen ordenadas de más a menos grave. La línea de documentos que faltan
// es «pronto»: va después de lo urgente y de lo demás que sea «pronto» (que es más puntual, con su
// fecha), y antes de lo que puede esperar.
function lineasDeAlertas(alertas: FichaAlerta[]): LineaDeAlerta[] {
  const faltan = alertas.filter((a) => a.tipo === "DOCUMENTO_FALTA");
  const lineas: LineaDeAlerta[] = alertas.filter((a) => a.tipo !== "DOCUMENTO_FALTA").map((alerta) => ({ tipo: "sueltas", alerta }));
  if (faltan.length === 0) return lineas;
  const grupo: LineaDeAlerta = { tipo: "faltan", nombres: faltan.map((a) => a.documento ?? a.texto) };
  const lugar = lineas.findIndex((l) => l.tipo === "sueltas" && PESO_GRAVEDAD[l.alerta.gravedad] > PESO_GRAVEDAD.media);
  lineas.splice(lugar === -1 ? lineas.length : lugar, 0, grupo);
  return lineas;
}

export function PestanaResumen({ ficha, modo }: { ficha: FichaResumen; modo: ModoFicha }) {
  const { propiedad, cifras, alertas, serviciosEnCurso, ultimosHechos } = ficha;
  const esEquipo = modo === "equipo";

  return (
    <div className="flex flex-col gap-4">
      {/* Desde lg todas las cifras van en una sola fila, sean 3 o 5 (una columna por cifra). */}
      <div className="grid grid-cols-2 gap-3 lg:auto-cols-fr lg:grid-flow-col">
        <Cifra valor={cifras.servicios} rotulo="servicios desde que llegó" />
        <Cifra
          valor={
            cifras.cobradoReparaciones.length === 0 ? (
              <Monto valor={null} />
            ) : (
              <div className="flex flex-col">
                {cifras.cobradoReparaciones.map((m) => (
                  <Monto key={m.moneda} valor={m} />
                ))}
              </div>
            )
          }
          rotulo={esEquipo ? "cobrado al dueño en reparaciones" : "pagado en reparaciones"}
        />
        {/* El costo de los maestros y el margen solo llegan para el equipo: si no vienen, no se dibujan. */}
        {cifras.costoMaestros !== undefined && <Cifra valor={<Monto valor={cifras.costoMaestros} />} rotulo="costo de maestros" />}
        {cifras.margen !== undefined && <Cifra valor={<Monto valor={cifras.margen} />} rotulo="margen de las reparaciones" />}
        <Cifra valor={alertas.length} rotulo={alertas.length === 1 ? "alerta" : "alertas"} tono={alertas.length > 0 ? "warn" : undefined} />
      </div>

      {/* items-start: cada columna mide lo que mide su contenido; si no, «Lo último» se estira hasta la altura de las alertas y queda un cuadro vacío. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Tarjeta>
          <TarjetaTitulo>
            Lo último
            <Link href={hrefDePestana(propiedad.id, "historial")} className="font-bold tracking-normal text-ink normal-case hover:underline">
              Ver todo el historial
            </Link>
          </TarjetaTitulo>
          {ultimosHechos.length === 0 ? (
            <Vacio texto="Todavía no ha pasado nada en esta propiedad." className="border-0 py-4" />
          ) : (
            <LineaDeTiempo hechos={ultimosHechos} />
          )}
        </Tarjeta>

        <div className="flex flex-col gap-4">
          <Tarjeta>
            <TarjetaTitulo>Alertas</TarjetaTitulo>
            {alertas.length === 0 ? (
              <p className="py-2 text-sm text-soft">Nada pendiente: los papeles y las contribuciones están al día.</p>
            ) : (
              lineasDeAlertas(alertas).map((linea) =>
                linea.tipo === "faltan" ? (
                  <Link key="faltan" href={hrefDePestana(propiedad.id, "documentos")} className="block">
                    <Tarjeta tono="item" className="hover:bg-ink-soft">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold">
                          {linea.nombres.length === 1 ? `Falta 1 documento: ${linea.nombres[0]}` : `Faltan ${linea.nombres.length} documentos`}
                        </span>
                        <Insignia tono={TONO_GRAVEDAD.media}>{ETIQUETA_GRAVEDAD.media}</Insignia>
                      </div>
                      {linea.nombres.length > 1 && <span className="text-xs break-words text-soft">{linea.nombres.join(", ")}</span>}
                    </Tarjeta>
                  </Link>
                ) : (
                  <Tarjeta tono="item" key={`${linea.alerta.tipo}-${linea.alerta.referenciaId ?? linea.alerta.texto}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold">{linea.alerta.texto}</span>
                      <Insignia tono={TONO_GRAVEDAD[linea.alerta.gravedad]}>{ETIQUETA_GRAVEDAD[linea.alerta.gravedad]}</Insignia>
                    </div>
                    {linea.alerta.fecha && (
                      <span className="text-xs text-soft">
                        <Fecha valor={linea.alerta.fecha} formato="conAnio" />
                      </span>
                    )}
                  </Tarjeta>
                ),
              )
            )}
          </Tarjeta>

          <Tarjeta>
            <TarjetaTitulo>En curso</TarjetaTitulo>
            {serviciosEnCurso.length === 0 ? (
              <p className="py-2 text-sm text-soft">No hay servicios en curso.</p>
            ) : (
              serviciosEnCurso.map((servicio) => (
                <Link key={servicio.id} href={`/servicios/${encodeURIComponent(servicio.id)}`} className="block">
                  <Tarjeta tono="item" className="hover:bg-ink-soft">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold">{servicio.nombre || ETIQUETA_TIPO_SERVICIO[servicio.tipo]}</span>
                      {/* «Nuevo» es la misma columna del tablero (solo la ve el equipo). */}
                      {servicio.nuevo ? (
                        <Insignia tono="neutro">Nuevo</Insignia>
                      ) : (
                        <ChipEsperando esperando={esperandoParaChip(servicio.esperando)} />
                      )}
                    </div>
                    <span className="text-xs text-soft">
                      {ETIQUETA_TIPO_SERVICIO[servicio.tipo]} · abierto <Fecha valor={servicio.abiertoEl} formato="relativa" />
                      {servicio.responsable ? ` · lo lleva ${servicio.responsable}` : ""}
                    </span>
                  </Tarjeta>
                </Link>
              ))
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
