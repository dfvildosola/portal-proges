// Los anuncios de la propiedad (Nexxos, Portal Inmobiliario, letrero…) con sus vistas y consultas
// acumuladas. En computador es una tabla; en celular, una tarjeta por anuncio. El equipo, además,
// ve el enlace y puede anotar la semana o pausar y bajar el anuncio; el dueño solo mira.
import type { VentaAnuncioConCifras } from "@proges/contrato";
import { ExternalLink } from "lucide-react";
import { Fecha } from "@/componentes/comunes/fecha";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { Tabla, TablaCelda, TablaCuerpo, TablaCabecera, TablaFila, TablaTitulo } from "@/componentes/ui/tabla";
import { AccionesDeAnuncio } from "./acciones-de-anuncio";
import { ETIQUETA_ANUNCIO } from "./etiquetas-venta";

type Props = {
  anuncios: VentaAnuncioConCifras[];
  /** Si el equipo puede editar (modo equipo y servicio abierto), con lo que necesitan los botones. */
  edicion: { servicioId: string; lunes: string[] } | null;
  /** Solo el equipo ve el enlace del aviso. */
  conEnlace: boolean;
};

function Enlace({ url, portal }: { url: string | null; portal: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-ink underline-offset-2 hover:underline"
      aria-label={`Abrir el aviso de ${portal} (se abre en otra pestaña)`}
    >
      abrir <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

export function AnunciosVenta({ anuncios, edicion, conEnlace }: Props) {
  if (anuncios.length === 0) {
    return <Vacio texto="Todavía no hay anuncios anotados. Cuando la propiedad se publique, anótalo aquí." className="py-5" />;
  }
  const acciones = (a: VentaAnuncioConCifras) =>
    edicion && (
      <AccionesDeAnuncio
        servicioId={edicion.servicioId}
        anuncioId={a.id}
        portal={a.portal}
        estado={a.estado}
        lunes={edicion.lunes}
        semanasAnotadas={a.semanas.map((s) => s.semana)}
      />
    );

  return (
    <>
      {/* Celular: una tarjeta por anuncio. */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {anuncios.map((a) => (
          <li key={a.id} className="flex flex-col gap-2 rounded-[10px] bg-scr px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{a.portal}</span>
              <Insignia tono={ETIQUETA_ANUNCIO[a.estado].tono}>{ETIQUETA_ANUNCIO[a.estado].texto}</Insignia>
            </div>
            <p className="text-xs text-soft">
              Desde <Fecha valor={a.desde} formato="auto" /> · {a.vistas.toLocaleString("es-CL")} vistas · {a.consultas} consultas
            </p>
            {conEnlace && <Enlace url={a.url} portal={a.portal} />}
            {acciones(a)}
          </li>
        ))}
      </ul>

      {/* Computador: tabla. */}
      <div className="hidden lg:block">
        <Tabla>
          <TablaCabecera>
            <TablaFila>
              <TablaTitulo>Dónde</TablaTitulo>
              <TablaTitulo>Estado</TablaTitulo>
              <TablaTitulo>Desde</TablaTitulo>
              <TablaTitulo className="text-right">Vistas</TablaTitulo>
              <TablaTitulo className="text-right">Consultas</TablaTitulo>
              {conEnlace && <TablaTitulo>Enlace</TablaTitulo>}
              {edicion && <TablaTitulo className="text-right">Acciones</TablaTitulo>}
            </TablaFila>
          </TablaCabecera>
          <TablaCuerpo>
            {anuncios.map((a) => (
              <TablaFila key={a.id}>
                <TablaCelda className="font-bold">{a.portal}</TablaCelda>
                <TablaCelda>
                  <Insignia tono={ETIQUETA_ANUNCIO[a.estado].tono}>{ETIQUETA_ANUNCIO[a.estado].texto}</Insignia>
                </TablaCelda>
                <TablaCelda>
                  <Fecha valor={a.desde} formato="auto" />
                </TablaCelda>
                <TablaCelda className="text-right font-mono tabular-nums">{a.vistas.toLocaleString("es-CL")}</TablaCelda>
                <TablaCelda className="text-right font-mono tabular-nums">{a.consultas.toLocaleString("es-CL")}</TablaCelda>
                {conEnlace && (
                  <TablaCelda>
                    <Enlace url={a.url} portal={a.portal} />
                  </TablaCelda>
                )}
                {edicion && <TablaCelda>{acciones(a)}</TablaCelda>}
              </TablaFila>
            ))}
          </TablaCuerpo>
        </Tabla>
      </div>
    </>
  );
}
