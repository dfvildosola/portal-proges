// Pestaña «Datos y ubicación»: todo lo que se sabe de la propiedad (tipo, medidas, valor, compra,
// deuda, carpeta de Drive), dónde está, y lo que cuelga de ella: unidades anexas, avalúos y dueños.
// Solo el equipo edita (por ahora); el dueño ve lo mismo sin los botones.
import type { DuenoEntidad, PropiedadAvaluo, PropiedadDatos, PropiedadDueno, PropiedadUnidad } from "@proges/contrato";
import type { ReactNode } from "react";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Tabla, TablaCelda, TablaCuerpo, TablaFila } from "@/componentes/ui/tabla";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { BloqueAvaluos } from "./bloque-avaluos";
import { BloqueDuenos } from "./bloque-duenos";
import { BloqueUnidades } from "./bloque-unidades";
import {
  ETIQUETA_ESTADO_PROPIEDAD,
  ETIQUETA_FUENTE_VALOR,
  ETIQUETA_OBJETIVO,
  ETIQUETA_TIPO_PROPIEDAD,
} from "./etiquetas-ficha";
import { FormularioCarpeta } from "./formulario-carpeta";
import { FormularioDatos } from "./formulario-datos";
import { FormularioValores } from "./formulario-valores";
import type { ModoFicha } from "./modo";

type Props = {
  propiedad: PropiedadDatos;
  unidades: PropiedadUnidad[];
  avaluos: PropiedadAvaluo[];
  duenos: PropiedadDueno[];
  /** Las personas y sociedades del cliente, para elegir una que ya existe al agregar un dueño. */
  duenosDelCliente: DuenoEntidad[];
  modo: ModoFicha;
};

const SIN_DATO = <span className="text-soft">—</span>;

export function PestanaDatos({ propiedad: p, unidades, avaluos, duenos, duenosDelCliente, modo }: Props) {
  const puedeEditar = modo === "equipo";
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.direccion}, ${p.comuna}, ${p.region}, Chile`)}`;
  const medidas = [p.m2Construidos && `${p.m2Construidos} m² construidos`, p.m2Terreno && `${p.m2Terreno} m² de terreno`].filter(Boolean);

  const filas: [string, ReactNode][] = [
    ["Tipo", ETIQUETA_TIPO_PROPIEDAD[p.tipo]],
    ["Situación hoy", ETIQUETA_ESTADO_PROPIEDAD[p.estado]],
    ["Para qué la tiene su dueño", ETIQUETA_OBJETIVO[p.objetivo]],
    ["Superficie", medidas.length > 0 ? medidas.join(" · ") : SIN_DATO],
    ["Año de construcción", p.anoConstruccion ?? SIN_DATO],
    ["Edificio", p.edificio ?? SIN_DATO],
    ["ROL del SII", p.rolSII ?? SIN_DATO],
    ["Contribuciones", p.exentaContribuciones ? "Exenta" : "Paga cuotas"],
    [
      "Valor comercial",
      p.valorComercial ? (
        <>
          <Monto valor={p.valorComercial.monto} />
          <div className="text-xs font-normal text-soft">
            {p.valorComercial.fuente ? ETIQUETA_FUENTE_VALOR[p.valorComercial.fuente] : "Sin fuente"}
            {p.valorComercial.fecha && (
              <>
                {" · al "}
                <Fecha valor={p.valorComercial.fecha} formato="conAnio" />
              </>
            )}
          </div>
        </>
      ) : (
        SIN_DATO
      ),
    ],
    [
      "Compra",
      p.compra ? (
        <>
          <Monto valor={p.compra.precio} />
          {p.compra.fecha && (
            <div className="text-xs font-normal text-soft">
              <Fecha valor={p.compra.fecha} formato="conAnio" />
            </div>
          )}
        </>
      ) : (
        SIN_DATO
      ),
    ],
    [
      "Deuda hipotecaria",
      p.deuda ? (
        <>
          <Monto valor={p.deuda.saldo} />
          <div className="text-xs font-normal text-soft">
            {p.deuda.banco ?? "Banco sin anotar"}
            {p.deuda.dividendo && ` · dividendo ${p.deuda.dividendo} ${p.deuda.saldo.moneda}`}
            {p.deuda.termino && (
              <>
                {" · hasta "}
                <Fecha valor={p.deuda.termino} formato="conAnio" />
              </>
            )}
          </div>
        </>
      ) : (
        SIN_DATO
      ),
    ],
    ["Carpeta de Drive", p.tieneCarpetaDrive ? "Enlazada" : <span className="text-warn">Sin enlazar</span>],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Tarjeta>
          <TarjetaTitulo>Datos</TarjetaTitulo>
          <Tabla>
            <TablaCuerpo>
              {filas.map(([rotulo, valor]) => (
                <TablaFila key={rotulo}>
                  <TablaCelda className="w-2/5 text-soft">{rotulo}</TablaCelda>
                  <TablaCelda className="font-bold">{valor}</TablaCelda>
                </TablaFila>
              ))}
            </TablaCuerpo>
          </Tabla>
          {puedeEditar && (
            <div className="flex flex-wrap gap-2 pt-1">
              <FormularioDatos propiedad={p} />
              <FormularioValores propiedad={p} />
            </div>
          )}
        </Tarjeta>

        <div className="flex flex-col gap-4">
          <Tarjeta>
            <TarjetaTitulo>Ubicación</TarjetaTitulo>
            <p className="text-sm font-bold">{p.direccion}</p>
            <p className="text-[13px] text-soft">
              {p.comuna}, {p.region}
            </p>
            <a href={mapa} target="_blank" rel="noopener" className="w-fit text-[13px] font-bold text-ink hover:underline">
              Abrir en Google Maps
            </a>
          </Tarjeta>
          {puedeEditar && (
            <Tarjeta>
              <TarjetaTitulo>Carpeta de Drive</TarjetaTitulo>
              <p className="text-[13px] text-soft">
                {p.tieneCarpetaDrive
                  ? "La carpeta está enlazada: de ahí salen y ahí van los PDF y las fotos de la propiedad."
                  : "Sin la carpeta enlazada no se pueden subir PDF ni fotos de esta propiedad."}
              </p>
              <div>
                <FormularioCarpeta propiedadId={p.id} yaEnlazada={p.tieneCarpetaDrive} />
              </div>
            </Tarjeta>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <BloqueDuenos propiedadId={p.id} duenos={duenos} existentes={duenosDelCliente} puedeEditar={puedeEditar} />
        <BloqueUnidades propiedadId={p.id} unidades={unidades} puedeEditar={puedeEditar} />
        <BloqueAvaluos propiedadId={p.id} avaluos={avaluos} puedeEditar={puedeEditar} />
      </div>
    </div>
  );
}
