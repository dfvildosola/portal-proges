// Una propiedad en la lista. En el computador es una fila de la tabla; en el celular, una tarjeta
// (una tabla de seis columnas no cabe en 390 px). Las dos muestran lo mismo: dirección, comuna,
// tipo, cliente, lo que hay en curso (con a quién se espera) y lo último que pasó. No muestran el
// estado de la propiedad («Disponible»): chocaba con el estado de sus servicios y confundía. Esa
// insignia sigue en la ficha de la propiedad y en el portal del dueño, que tiene su propia tarjeta.
import Link from "next/link";
import type { PropiedadResumen } from "@proges/contrato";
import { ChipEsperando } from "@/componentes/comunes/chip-esperando";
import { Fecha } from "@/componentes/comunes/fecha";
import { esperandoParaChip } from "@/componentes/ficha/esperando";
import { ETIQUETA_TIPO_PROPIEDAD } from "@/componentes/ficha/etiquetas-ficha";
import { Insignia } from "@/componentes/ui/insignia";
import { TablaCelda, TablaFila } from "@/componentes/ui/tabla";
import { Tarjeta } from "@/componentes/ui/tarjeta";

const enlace = (p: PropiedadResumen) => `/propiedades/${encodeURIComponent(p.id)}`;

// En qué está lo que hay en curso: solo tiene sentido si hay algo (si no, «Nos toca» sería un dato
// falso). Si alguno de sus servicios es nuevo (por confirmar, por revisar o sin responsable), dice
// «Nuevo», como la columna del tablero, y además a quién se espera si algún servicio espera: una
// obra trabada no se puede esconder detrás de una venta recién llegada.
function Espera({ p }: { p: PropiedadResumen }) {
  if (p.serviciosEnCurso === 0) return <span className="text-soft">—</span>;
  if ((p.serviciosNuevos ?? 0) === 0) return <ChipEsperando esperando={esperandoParaChip(p.esperandoMasAntiguo)} />;
  return (
    <>
      <Insignia tono="neutro">Nuevo</Insignia>
      {p.esperandoMasAntiguo && <ChipEsperando esperando={esperandoParaChip(p.esperandoMasAntiguo)} />}
    </>
  );
}

// La columna «En curso» de la tabla: el chip de espera del servicio más antiguo y, si hay más de
// uno, cuántos son. Las dos cosas juntas dicen «hay trabajo y esto es lo que lo frena».
function EnCurso({ p }: { p: PropiedadResumen }) {
  if (p.serviciosEnCurso === 0) return <span className="text-soft">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Espera p={p} />
      {p.serviciosEnCurso > 1 && <span className="text-xs text-soft">{p.serviciosEnCurso} servicios</span>}
    </div>
  );
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
        <EnCurso p={p} />
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
        <span className="text-[15px] font-extrabold break-words">{p.direccion}</span>
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
