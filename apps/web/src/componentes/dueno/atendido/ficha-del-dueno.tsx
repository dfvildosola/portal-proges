// Las piezas de la ficha de una propiedad que el dueño ve en su portal: la cabecera con sus
// pestañas, el resumen y el historial. Las demás pestañas (reparaciones, documentos, datos) son
// las mismas de la ficha del equipo (componentes/ficha) con modo="dueno".
//
// Por qué estas tres no se reusan: los componentes de la ficha arman sus enlaces a «/propiedades/…»
// y «/servicios/…», que son las pantallas del equipo. Un dueño que las abre vuelve al inicio. Aquí
// los enlaces van a «/mi/propiedades/…» y «/mi/servicios/…».
import Link from "next/link";
import type { FichaResumen, HistorialCategoria, HistorialPagina, PropiedadDatos } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Vacio } from "@/componentes/comunes/vacio";
import { Cifra } from "@/componentes/ficha/cifra";
import { ETIQUETA_ESTADO_PROPIEDAD, ETIQUETA_TIPO_PROPIEDAD, TONO_ESTADO_PROPIEDAD, TONO_GRAVEDAD } from "@/componentes/ficha/etiquetas-ficha";
import { LineaDeTiempo } from "@/componentes/ficha/linea-de-tiempo";
import { estiloBoton } from "@/componentes/ui/boton";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { cn } from "@/lib/utils";
import { ChipDeEspera } from "./chip-de-espera";
import { nombreDelServicio } from "./etiquetas-atendido";

export const PESTANAS_DEL_DUENO = [
  { clave: "resumen", nombre: "Resumen" },
  { clave: "historial", nombre: "Historial" },
  { clave: "reparaciones", nombre: "Reparaciones" },
  { clave: "documentos", nombre: "Documentos" },
  { clave: "datos", nombre: "Datos y ubicación" },
] as const;
export type PestanaDelDueno = (typeof PESTANAS_DEL_DUENO)[number]["clave"];

/** La pestaña que pidió la dirección; si no existe o no vino, «resumen». */
export function pestanaDelDueno(valor: string | undefined): PestanaDelDueno {
  return PESTANAS_DEL_DUENO.find((p) => p.clave === valor)?.clave ?? "resumen";
}

/** La dirección de una pestaña, con lo que se quiera agregar (filtro, página). */
export function hrefDePestanaDelDueno(propiedadId: string, clave: PestanaDelDueno, extra: Record<string, string | undefined> = {}): string {
  const consulta = new URLSearchParams();
  if (clave !== "resumen") consulta.set("pestana", clave);
  for (const [nombre, valor] of Object.entries(extra)) if (valor) consulta.set(nombre, valor);
  const texto = consulta.toString();
  return `/mi/propiedades/${encodeURIComponent(propiedadId)}${texto ? `?${texto}` : ""}`;
}

export function CabeceraDelDueno({
  propiedad,
  llegoEl,
  serviciosEnCurso,
  activa,
}: {
  propiedad: PropiedadDatos;
  llegoEl: string;
  serviciosEnCurso: number;
  activa: PestanaDelDueno;
}) {
  const detalles = [propiedad.comuna, ETIQUETA_TIPO_PROPIEDAD[propiedad.tipo], propiedad.rolSII ? `rol ${propiedad.rolSII}` : null].filter(Boolean);
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <nav aria-label="Dónde estás" className="text-[12.5px] text-soft">
          <Link href="/mi/propiedades" className="font-semibold text-ink hover:underline">
            Propiedades
          </Link>{" "}
          / {propiedad.direccion}
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[22px] leading-tight font-extrabold tracking-tight text-balance">
              {propiedad.direccion}
              {propiedad.edificio ? <span className="font-semibold text-soft"> · {propiedad.edificio}</span> : null}
            </h1>
            <p className="text-[12.5px] text-soft">
              {detalles.join(" · ")} · en Proges desde <Fecha valor={llegoEl} formato="conAnio" />
            </p>
          </div>
          <Link href={`/mi/pedir?propiedad=${encodeURIComponent(propiedad.id)}`} className={estiloBoton({ variante: "principal" })}>
            Pedir un servicio para esta propiedad
          </Link>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Insignia tono={TONO_ESTADO_PROPIEDAD[propiedad.estado]}>{ETIQUETA_ESTADO_PROPIEDAD[propiedad.estado]}</Insignia>
          {serviciosEnCurso > 0 && (
            <Insignia tono="warn">{serviciosEnCurso === 1 ? "1 servicio en curso" : `${serviciosEnCurso} servicios en curso`}</Insignia>
          )}
        </div>
      </div>
      <nav aria-label="Secciones de la ficha" className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {PESTANAS_DEL_DUENO.map((p) => (
          <Link
            key={p.clave}
            href={hrefDePestanaDelDueno(propiedad.id, p.clave)}
            aria-current={p.clave === activa ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm font-bold whitespace-nowrap text-soft transition-colors hover:text-fg lg:min-h-9",
              p.clave === activa && "border-ink text-ink",
            )}
          >
            {p.nombre}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function ResumenDelDueno({ ficha }: { ficha: FichaResumen }) {
  const { propiedad, cifras, alertas, serviciosEnCurso, ultimosHechos } = ficha;
  // La línea de tiempo del equipo enlaza «Abrir el servicio» a una pantalla del equipo: sin el id,
  // no dibuja ese enlace. Los servicios se abren desde la tarjeta «En curso» de aquí al lado.
  const hechos = ultimosHechos.map((h) => ({ ...h, servicioId: null }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
          rotulo="pagado en reparaciones"
        />
        <Cifra valor={alertas.length} rotulo={alertas.length === 1 ? "alerta" : "alertas"} tono={alertas.length > 0 ? "warn" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Tarjeta>
          <TarjetaTitulo>
            Lo último
            <Link href={hrefDePestanaDelDueno(propiedad.id, "historial")} className="font-bold tracking-normal text-ink normal-case hover:underline">
              Ver todo el historial
            </Link>
          </TarjetaTitulo>
          {hechos.length === 0 ? (
            <Vacio texto="Todavía no ha pasado nada en esta propiedad." className="border-0 py-4" />
          ) : (
            <LineaDeTiempo hechos={hechos} />
          )}
        </Tarjeta>

        <div className="flex flex-col gap-4">
          <Tarjeta>
            <TarjetaTitulo>En curso</TarjetaTitulo>
            {serviciosEnCurso.length === 0 ? (
              <p className="py-2 text-sm text-soft">No hay servicios en curso.</p>
            ) : (
              serviciosEnCurso.map((s) => (
                <Link key={s.id} href={`/mi/servicios/${encodeURIComponent(s.id)}`} className="block">
                  <Tarjeta tono="item" className="hover:bg-ink-soft">
                    <span className="text-sm font-bold">{nombreDelServicio(s.tipo)}</span>
                    <span className="text-xs text-soft">
                      empezó <Fecha valor={s.abiertoEl} formato="relativa" />
                    </span>
                    <ChipDeEspera esperando={s.esperando} className="mt-1" />
                  </Tarjeta>
                </Link>
              ))
            )}
          </Tarjeta>

          <Tarjeta>
            <TarjetaTitulo>Alertas</TarjetaTitulo>
            {alertas.length === 0 ? (
              <p className="py-2 text-sm text-soft">Nada pendiente: los papeles y las contribuciones están al día.</p>
            ) : (
              alertas.map((a) => (
                <Tarjeta tono="item" key={`${a.tipo}-${a.referenciaId ?? a.texto}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold">{a.texto}</span>
                    <Insignia tono={TONO_GRAVEDAD[a.gravedad]}>{a.gravedad === "alta" ? "urgente" : a.gravedad === "media" ? "pronto" : "después"}</Insignia>
                  </div>
                  {a.fecha && (
                    <span className="text-xs text-soft">
                      <Fecha valor={a.fecha} formato="conAnio" />
                    </span>
                  )}
                </Tarjeta>
              ))
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

const FILTROS: { clave: HistorialCategoria | undefined; nombre: string }[] = [
  { clave: undefined, nombre: "Todo" },
  { clave: "reparaciones", nombre: "Reparaciones" },
  { clave: "papeles", nombre: "Papeles" },
  { clave: "visitas", nombre: "Visitas" },
  { clave: "venta-arriendo", nombre: "Arriendo y venta" },
];

export function HistorialDelDueno({
  propiedadId,
  historial,
  filtro,
}: {
  propiedadId: string;
  historial: HistorialPagina;
  filtro: HistorialCategoria | undefined;
}) {
  const { pagina, porPagina, total } = historial.paginacion;
  const ultimaPagina = Math.max(1, Math.ceil(total / porPagina));
  const enlace = (n: number) => hrefDePestanaDelDueno(propiedadId, "historial", { tipo: filtro, pagina: n > 1 ? String(n) : undefined });
  const hechos = historial.items.map((h) => ({ ...h, servicioId: null }));

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Filtrar el historial" className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.nombre}
            href={hrefDePestanaDelDueno(propiedadId, "historial", { tipo: f.clave })}
            aria-current={f.clave === filtro ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[13px] font-bold text-soft hover:text-fg",
              f.clave === filtro && "border-fg bg-fg text-bg hover:text-bg",
            )}
          >
            {f.nombre}
          </Link>
        ))}
      </nav>

      <Tarjeta>
        {hechos.length === 0 ? <Vacio texto="No hay nada de este tipo todavía." className="border-0" /> : <LineaDeTiempo hechos={hechos} />}
      </Tarjeta>

      {ultimaPagina > 1 && (
        <div className="flex items-center justify-between gap-2 text-[13px] text-soft">
          {pagina > 1 ? (
            <Link href={enlace(pagina - 1)} className="font-bold text-ink hover:underline">
              Más nuevos
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {pagina} de {ultimaPagina}
          </span>
          {pagina < ultimaPagina ? (
            <Link href={enlace(pagina + 1)} className="font-bold text-ink hover:underline">
              Más antiguos
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
      <p className="text-xs text-soft">Todo lo que Proges hizo en la propiedad, de más nuevo a más antiguo. Aquí salen solo los hechos marcados para ti.</p>
    </div>
  );
}
