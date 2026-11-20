// /mi/propiedades: las propiedades del dueño, cada una con lo que Proges tiene en curso en ella.
// La página viaja en la dirección (`?pagina=2`), así que se puede recargar o compartir tal cual.
import type { Metadata } from "next";
import Link from "next/link";
import type { PropiedadesPagina, PropiedadResumen } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Fecha } from "@/componentes/comunes/fecha";
import { Vacio } from "@/componentes/comunes/vacio";
import { ChipDeEspera } from "@/componentes/dueno/atendido/chip-de-espera";
import { ETIQUETA_ESTADO_PROPIEDAD, ETIQUETA_TIPO_PROPIEDAD, TONO_ESTADO_PROPIEDAD } from "@/componentes/ficha/etiquetas-ficha";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { pedir } from "@/lib/api";
import { FormularioPropiedad } from "./formulario-propiedad";

export const metadata: Metadata = { title: "Propiedades" };

const POR_PAGINA = 30;

function TarjetaDePropiedad({ p }: { p: PropiedadResumen }) {
  return (
    <Link href={`/mi/propiedades/${encodeURIComponent(p.id)}`} className="block">
      <Tarjeta className="h-full gap-1.5 hover:bg-ink-soft">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-extrabold break-words">{p.direccion}</span>
          <Insignia tono={TONO_ESTADO_PROPIEDAD[p.estado]}>{ETIQUETA_ESTADO_PROPIEDAD[p.estado]}</Insignia>
        </div>
        <div className="text-xs text-soft">
          {p.comuna} · {ETIQUETA_TIPO_PROPIEDAD[p.tipo]}
        </div>
        {p.serviciosEnCurso > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Insignia tono="ink">{p.serviciosEnCurso === 1 ? "1 servicio en curso" : `${p.serviciosEnCurso} servicios en curso`}</Insignia>
            <ChipDeEspera esperando={p.esperandoMasAntiguo} />
          </div>
        )}
        <div className="text-xs text-soft">
          {p.ultimoHecho ? (
            <>
              <Fecha valor={p.ultimoHecho.fecha} formato="relativa" /> · {p.ultimoHecho.texto}
            </>
          ) : (
            "Sin movimientos"
          )}
        </div>
      </Tarjeta>
    </Link>
  );
}

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const consulta = await searchParams;
  const valor = Array.isArray(consulta.pagina) ? consulta.pagina[0] : consulta.pagina;
  const pagina = Math.max(1, Number.parseInt(valor ?? "1", 10) || 1);

  const lista = await pedir<PropiedadesPagina>("/v1/propiedades", { consulta: { pagina, porPagina: POR_PAGINA } });
  const { total } = lista.paginacion;
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enCurso = lista.items.filter((p) => p.serviciosEnCurso > 0).length;
  const enlace = (n: number) => (n > 1 ? `/mi/propiedades?pagina=${n}` : "/mi/propiedades");

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoDePagina
        titulo="Propiedades"
        subtitulo={`${total} ${total === 1 ? "propiedad" : "propiedades"}${ultimaPagina === 1 ? ` · ${enCurso} con algo en curso` : ""}`}
      >
        <FormularioPropiedad />
      </EncabezadoDePagina>

      {lista.items.length === 0 ? (
        <Vacio texto="Todavía no hay propiedades en tu cartera. Agrega la primera." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.items.map((p) => (
            <TarjetaDePropiedad key={p.id} p={p} />
          ))}
        </div>
      )}

      {ultimaPagina > 1 && (
        <div className="flex items-center justify-between gap-2 text-[13px] text-soft">
          {pagina > 1 ? (
            <Link href={enlace(pagina - 1)} className="font-bold text-ink hover:underline">
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {pagina} de {ultimaPagina}
          </span>
          {pagina < ultimaPagina ? (
            <Link href={enlace(pagina + 1)} className="font-bold text-ink hover:underline">
              Siguientes
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
