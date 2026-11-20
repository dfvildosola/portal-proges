// Una propiedad en la lista. En el computador es una fila de la tabla; en el celular, una tarjeta
// (una tabla de seis columnas no cabe en 390 px). Las dos muestran lo mismo: dirección, comuna,
// tipo, cliente, servicios en curso, a quién se espera y lo último que pasó.
import Link from "next/link";
import type { PropiedadResumen } from "@proges/contrato";
import { ChipEsperando } from "@/componentes/comunes/chip-esperando";
import { Fecha } from "@/componentes/comunes/fecha";
import { esperandoParaChip } from "@/componentes/ficha/esperando";
import { ETIQUETA_ESTADO_PROPIEDAD, ETIQUETA_TIPO_PROPIEDAD, TONO_ESTADO_PROPIEDAD } from "@/componentes/ficha/etiquetas-ficha";
import { Insignia } from "@/componentes/ui/insignia";
import { TablaCelda, TablaFila } from "@/componentes/ui/tabla";
import { Tarjeta } from "@/componentes/ui/tarjeta";

const enlace = (p: PropiedadResumen) => `/propiedades/${encodeURIComponent(p.id)}`;

// A quién se espera: solo tiene sentido si hay algo en curso (si no, «Nos toca» sería un dato falso).
function Espera({ p }: { p: PropiedadResumen }) {
  if (p.serviciosEnCurso === 0) return <span className="text-soft">—</span>;
  return <ChipEsperando esperando={esperandoParaChip(p.esperandoMasAntiguo)} />;
}

export function FilaDePropiedad({ p }: { p: PropiedadResumen }) {
  return (
    <TablaFila>
      <TablaCelda>
        <Link href={enlace(p)} className="font-bold text-ink hover:underline">
          {p.direccion}
        </Link>
        <div className="text-xs text-soft">{p.comuna}</div>
      </TablaCelda>
      <TablaCelda>{p.clienteNombre}</TablaCelda>
      <TablaCelda>{ETIQUETA_TIPO_PROPIEDAD[p.tipo]}</TablaCelda>
      <TablaCelda>
        <Insignia tono={TONO_ESTADO_PROPIEDAD[p.estado]}>{ETIQUETA_ESTADO_PROPIEDAD[p.estado]}</Insignia>
      </TablaCelda>
      <TablaCelda className="text-center tabular-nums">{p.serviciosEnCurso}</TablaCelda>
      <TablaCelda>
        <Espera p={p} />
      </TablaCelda>
      <TablaCelda className="max-w-72 text-xs text-soft">
        {p.ultimoHecho ? (
          <>
            <Fecha valor={p.ultimoHecho.fecha} formato="relativa" /> · <span className="break-words">{p.ultimoHecho.texto}</span>
          </>
        ) : (
          "Sin movimientos"
        )}
      </TablaCelda>
    </TablaFila>
  );
}

export function TarjetaDePropiedad({ p }: { p: PropiedadResumen }) {
  return (
    <Link href={enlace(p)} className="block">
      <Tarjeta className="gap-1.5 hover:bg-ink-soft">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-extrabold break-words">{p.direccion}</span>
          <Insignia tono={TONO_ESTADO_PROPIEDAD[p.estado]}>{ETIQUETA_ESTADO_PROPIEDAD[p.estado]}</Insignia>
        </div>
        <div className="text-xs text-soft">
          {p.comuna} · {ETIQUETA_TIPO_PROPIEDAD[p.tipo]} · {p.clienteNombre}
        </div>
        {p.serviciosEnCurso > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Insignia tono="ink">{p.serviciosEnCurso === 1 ? "1 servicio en curso" : `${p.serviciosEnCurso} servicios en curso`}</Insignia>
            <Espera p={p} />
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
