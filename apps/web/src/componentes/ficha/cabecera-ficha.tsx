// La cabecera de la ficha de una propiedad: el nombre, a dónde volver, las etiquetas de estado y
// las pestañas. Las pestañas son enlaces (ver pestanas-ficha.ts), así que esto no necesita
// JavaScript en el navegador.
import Link from "next/link";
import type { PropiedadDatos } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Insignia } from "@/componentes/ui/insignia";
import { cn } from "@/lib/utils";
import { ETIQUETA_ESTADO_PROPIEDAD, ETIQUETA_TIPO_PROPIEDAD, TONO_ESTADO_PROPIEDAD } from "./etiquetas-ficha";
import type { ModoFicha } from "./modo";
import { type ClavePestana, hrefDePestana, PESTANAS } from "./pestanas-ficha";

type Props = {
  propiedad: PropiedadDatos;
  /** Desde cuándo está la propiedad en el portal (`cifras.llegoEl`). */
  llegoEl: string;
  serviciosEnCurso: number;
  activa: ClavePestana;
  modo: ModoFicha;
};

export function CabeceraFicha({ propiedad, llegoEl, serviciosEnCurso, activa, modo }: Props) {
  const detalles = [
    propiedad.comuna,
    ETIQUETA_TIPO_PROPIEDAD[propiedad.tipo],
    propiedad.rolSII ? `rol ${propiedad.rolSII}` : null,
  ].filter(Boolean);

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <nav aria-label="Dónde estás" className="text-[12.5px] text-soft">
          <Link href={modo === "equipo" ? "/propiedades" : "/inicio"} className="font-semibold text-ink hover:underline">
            {modo === "equipo" ? "Propiedades" : "Mis propiedades"}
          </Link>{" "}
          / {propiedad.direccion}
        </nav>
        <h1 className="text-[22px] leading-tight font-extrabold tracking-tight text-balance">
          {propiedad.direccion}
          {propiedad.edificio ? <span className="font-semibold text-soft"> · {propiedad.edificio}</span> : null}
        </h1>
        <p className="text-[12.5px] text-soft">
          {detalles.join(" · ")} · en Proges desde <Fecha valor={llegoEl} formato="conAnio" />
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Insignia tono={TONO_ESTADO_PROPIEDAD[propiedad.estado]}>{ETIQUETA_ESTADO_PROPIEDAD[propiedad.estado]}</Insignia>
          {serviciosEnCurso > 0 && (
            <Insignia tono="warn">
              {serviciosEnCurso === 1 ? "1 servicio en curso" : `${serviciosEnCurso} servicios en curso`}
            </Insignia>
          )}
        </div>
      </div>
      <nav aria-label="Secciones de la ficha" className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {PESTANAS.map((pestana) => (
          <Link
            key={pestana.clave}
            href={hrefDePestana(propiedad.id, pestana.clave)}
            aria-current={pestana.clave === activa ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm font-bold whitespace-nowrap text-soft transition-colors hover:text-fg lg:min-h-9",
              pestana.clave === activa && "border-ink text-ink",
            )}
          >
            {pestana.nombre}
          </Link>
        ))}
      </nav>
    </header>
  );
}
