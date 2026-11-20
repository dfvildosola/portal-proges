// Los datos del servicio: tipo, estado, propiedad (con enlace a su ficha), cliente, responsable
// (cambiable), fechas y, si ya se cerró, el motivo. Se usa en la ficha del equipo.
import Link from "next/link";
import type { ServicioEquipo } from "@proges/contrato";
import { ChipEstado } from "@/componentes/comunes/chip-estado";
import { Fecha } from "@/componentes/comunes/fecha";
import { Seccion } from "@/componentes/comunes/seccion";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { CambiarResponsable } from "./cambiar-responsable";
import type { Persona } from "./tipos";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <dt className="text-xs font-semibold text-soft">{etiqueta}</dt>
      <dd className="min-w-0 text-[13px] font-semibold sm:text-right">{children}</dd>
    </div>
  );
}

export function DatosDelServicio({ servicio, personas }: { servicio: ServicioEquipo; personas: Persona[] }) {
  const abierto = servicio.estado === "ABIERTO";
  return (
    <Seccion titulo="Datos">
      <Tarjeta>
        <dl className="flex flex-col gap-2.5">
          <Dato etiqueta="Servicio">
            {ETIQUETA_TIPO_SERVICIO[servicio.tipo]} · {servicio.nombre}
          </Dato>
          <Dato etiqueta="Estado">
            {/* «Por confirmar» y «Nuevo · sin repartir» ya salen junto al título: aquí solo el estado a secas. */}
            <ChipEstado estado={servicio.estado} />
          </Dato>
          <Dato etiqueta="Propiedad">
            <Link href={`/propiedades/${servicio.propiedad.id}`} className="text-ink underline-offset-2 hover:underline">
              {servicio.propiedad.direccion}, {servicio.propiedad.comuna}
            </Link>
          </Dato>
          <Dato etiqueta="Cliente">{servicio.cliente.nombre}</Dato>
          <Dato etiqueta="Empezó el">
            <Fecha valor={servicio.abiertoEl} formato="conAnio" />
          </Dato>
          {servicio.cerradoEl && (
            <Dato etiqueta="Se cerró el">
              <Fecha valor={servicio.cerradoEl} formato="conAnio" />
            </Dato>
          )}
        </dl>
        <div className="mt-1 flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-soft">Responsable</span>
          <CambiarResponsable
            servicioId={servicio.id}
            responsableId={servicio.responsable?.id ?? null}
            personas={personas}
            deshabilitado={!abierto || servicio.porRevisar}
          />
          {abierto && servicio.porRevisar && (
            <p className="text-xs text-soft">Este servicio viene de un pedido: primero hay que aceptarlo y repartirlo.</p>
          )}
        </div>
        {servicio.nota && (
          <div className="mt-1 rounded-[10px] bg-scr p-2.5 text-[13px]">
            <span className="block text-xs font-semibold text-soft">Nota al abrirlo</span>
            {servicio.nota}
          </div>
        )}
        {servicio.motivoCierre && (
          <div className="mt-1 rounded-[10px] bg-scr p-2.5 text-[13px]">
            <span className="block text-xs font-semibold text-soft">Motivo del cierre</span>
            {servicio.motivoCierre}
          </div>
        )}
      </Tarjeta>
    </Seccion>
  );
}
