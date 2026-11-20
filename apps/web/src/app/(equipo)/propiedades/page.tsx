// /propiedades: la lista de propiedades de todos los clientes. Sirve para ver dónde hay trabajo:
// qué tiene cada una en curso y a quién se espera y lo último que pasó. Los filtros y
// la página viajan en la dirección, así que la lista se puede compartir o recargar tal cual.
import type { Metadata } from "next";
import Link from "next/link";
import type { PropiedadesPagina } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Vacio } from "@/componentes/comunes/vacio";
import { Tabla, TablaCuerpo, TablaTitulo } from "@/componentes/ui/tabla";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { pedir } from "@/lib/api";
import { clientesParaElegir } from "./clientes-para-elegir";
import { FiltrosPropiedades, type FiltrosDeLista } from "./filtros-propiedades";
import { FilaDePropiedad, TarjetaDePropiedad } from "./fila-de-propiedad";
import { FormularioPropiedadNueva } from "./formulario-propiedad-nueva";

export const metadata: Metadata = { title: "Propiedades" };

const POR_PAGINA = 50;

type Consulta = Record<string, string | string[] | undefined>;
const uno = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor) || undefined;

export default async function Pagina({ searchParams }: { searchParams: Promise<Consulta> }) {
  const consulta = await searchParams;
  const filtros: FiltrosDeLista = {
    q: uno(consulta.q),
    // Solo los dos valores que la API conoce; cualquier otra cosa en la dirección se ignora.
    enCurso: uno(consulta.enCurso) === "true" || uno(consulta.enCurso) === "false" ? uno(consulta.enCurso) : undefined,
    cliente: uno(consulta.cliente),
    comuna: uno(consulta.comuna),
  };
  const pagina = Math.max(1, Number.parseInt(uno(consulta.pagina) ?? "1", 10) || 1);

  const [lista, { clientes }] = await Promise.all([
    pedir<PropiedadesPagina>("/v1/propiedades", { consulta: { ...filtros, pagina, porPagina: POR_PAGINA } }),
    clientesParaElegir(),
  ]);

  const { total } = lista.paginacion;
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enCurso = lista.items.filter((p) => p.serviciosEnCurso > 0).length;
  const enlaceDePagina = (n: number) => {
    const partes = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) if (valor) partes.set(clave, valor);
    if (n > 1) partes.set("pagina", String(n));
    const texto = partes.toString();
    return `/propiedades${texto ? `?${texto}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoDePagina
        titulo="Propiedades"
        subtitulo={`${total} ${total === 1 ? "propiedad" : "propiedades"}${ultimaPagina === 1 ? ` · ${enCurso} con algo en curso` : ""}`}
      >
        <FormularioPropiedadNueva clientes={clientes} />
      </EncabezadoDePagina>

      <FiltrosPropiedades filtros={filtros} clientes={clientes} />

      {lista.items.length === 0 ? (
        <Vacio texto={Object.values(filtros).some(Boolean) ? "Ninguna propiedad calza con esos filtros." : "Todavía no hay propiedades."} />
      ) : (
        <>
          {/* En celular, una tarjeta por propiedad; desde 1024 px, la tabla. */}
          <div className="flex flex-col gap-2 lg:hidden">
            {lista.items.map((p) => (
              <TarjetaDePropiedad key={p.id} p={p} />
            ))}
          </div>
          <Tarjeta className="hidden p-1.5 lg:flex">
            <Tabla>
              <thead>
                <tr>
                  <TablaTitulo>Propiedad</TablaTitulo>
                  <TablaTitulo>Cliente</TablaTitulo>
                  <TablaTitulo>Tipo</TablaTitulo>
                  <TablaTitulo>En curso</TablaTitulo>
                  <TablaTitulo>Lo último</TablaTitulo>
                </tr>
              </thead>
              <TablaCuerpo>
                {lista.items.map((p) => (
                  <FilaDePropiedad key={p.id} p={p} />
                ))}
              </TablaCuerpo>
            </Tabla>
          </Tarjeta>
        </>
      )}

      {ultimaPagina > 1 && (
        <div className="flex items-center justify-between gap-2 text-[13px] text-soft">
          {pagina > 1 ? (
            <Link href={enlaceDePagina(pagina - 1)} className="font-bold text-ink hover:underline">
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {pagina} de {ultimaPagina}
          </span>
          {pagina < ultimaPagina ? (
            <Link href={enlaceDePagina(pagina + 1)} className="font-bold text-ink hover:underline">
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
