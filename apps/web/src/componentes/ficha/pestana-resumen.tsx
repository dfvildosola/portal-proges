// Pestaña «Resumen»: las cifras de la propiedad, lo último que pasó, las alertas y los servicios en
// curso con a quién se espera. Los datos vienen de una sola llamada (GET /v1/propiedades/{id}).
import Link from "next/link";
import type { FichaResumen } from "@proges/contrato";
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

export function PestanaResumen({ ficha, modo }: { ficha: FichaResumen; modo: ModoFicha }) {
  const { propiedad, cifras, alertas, serviciosEnCurso, ultimosHechos } = ficha;
  const esEquipo = modo === "equipo";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
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
              alertas.map((alerta) => (
                <Tarjeta tono="item" key={`${alerta.tipo}-${alerta.referenciaId ?? alerta.texto}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold">{alerta.texto}</span>
                    <Insignia tono={TONO_GRAVEDAD[alerta.gravedad]}>{alerta.gravedad === "alta" ? "urgente" : alerta.gravedad === "media" ? "pronto" : "después"}</Insignia>
                  </div>
                  {alerta.fecha && (
                    <span className="text-xs text-soft">
                      <Fecha valor={alerta.fecha} formato="conAnio" />
                    </span>
                  )}
                </Tarjeta>
              ))
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
                      <ChipEsperando esperando={esperandoParaChip(servicio.esperando)} />
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
