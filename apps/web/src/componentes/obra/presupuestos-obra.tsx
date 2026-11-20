// Los presupuestos que mandaron los maestros para esta obra. El equipo los carga tal como llegan
// (PDF o WhatsApp); la jefatura los aprueba o rechaza. Un presupuesto aprobado pasa a ser el plan
// de costo y de plazo de la obra; uno adicional es un cambio de alcance durante el trabajo.
import type { ObraEquipo } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { urlDeArchivo } from "@/lib/archivos";
import {
  ETIQUETA_PRESUPUESTO_ESTADO,
  ETIQUETA_PRESUPUESTO_TIPO,
  TONO_PRESUPUESTO_ESTADO,
} from "./etiquetas-obra";
import { FormularioPresupuesto } from "./formulario-presupuesto";
import { LineaVacia } from "./linea-vacia";
import { ResolverPresupuesto } from "./resolver-presupuesto";

type Presupuesto = ObraEquipo["presupuestos"][number];
type Partida = ObraEquipo["partidas"][number];

export function PresupuestosObra({
  servicioId,
  presupuestos,
  partidas,
  maestros,
  esJefatura,
  editable,
}: {
  servicioId: string;
  presupuestos: Presupuesto[];
  partidas: Partida[];
  maestros: { id: string; nombre: string }[];
  esJefatura: boolean;
  editable: boolean;
}) {
  const vigentes = partidas.filter((p) => !p.quitadaEnOdoo);
  const botonCargar = editable && (
    <FormularioPresupuesto
      servicioId={servicioId}
      maestros={maestros}
      partidas={vigentes.map(({ id, recinto, descripcion }) => ({ id, recinto, descripcion }))}
    />
  );
  // Sin presupuestos, la sección es una sola línea con su botón; con ellos, la tarjeta con la lista.
  if (presupuestos.length === 0) {
    return (
      <LineaVacia titulo="Presupuestos de maestros" texto="todavía no hay. Carga el que mande el maestro.">
        {botonCargar}
      </LineaVacia>
    );
  }
  return (
    <Tarjeta>
      <div className="flex items-center justify-between gap-2">
        <TarjetaTitulo>Presupuestos de maestros</TarjetaTitulo>
        {botonCargar}
      </div>
      <ul className="flex flex-col gap-2">
        {presupuestos.map((presupuesto) => (
          <li key={presupuesto.id}>
            <TarjetaDePresupuesto
              servicioId={servicioId}
              presupuesto={presupuesto}
              cubre={presupuesto.partidaIds.map((id) => partidas.find((p) => p.id === id)?.descripcion).filter((d): d is string => !!d)}
              esJefatura={esJefatura}
              editable={editable}
            />
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

function TarjetaDePresupuesto({
  servicioId,
  presupuesto,
  cubre,
  esJefatura,
  editable,
}: {
  servicioId: string;
  presupuesto: Presupuesto;
  cubre: string[];
  esJefatura: boolean;
  editable: boolean;
}) {
  return (
    <Tarjeta tono="item" className="gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{presupuesto.maestro.nombre}</p>
          <p className="text-xs text-soft">
            Cargado por {presupuesto.cargadoPor} · <Fecha valor={presupuesto.creadoEl} formato="relativa" />
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Monto valor={presupuesto.total} className="text-sm font-semibold" />
          <div className="flex gap-1">
            <Insignia tono="ink">{ETIQUETA_PRESUPUESTO_TIPO[presupuesto.tipo]}</Insignia>
            <Insignia tono={TONO_PRESUPUESTO_ESTADO[presupuesto.estado]}>{ETIQUETA_PRESUPUESTO_ESTADO[presupuesto.estado]}</Insignia>
          </div>
        </div>
      </div>
      <p className="text-xs text-soft">
        {presupuesto.plazoDias ? `Plazo: ${presupuesto.plazoDias} días` : "Sin plazo indicado"}
        {cubre.length > 0 && ` · Cubre: ${cubre.join(", ")}`}
      </p>
      {presupuesto.nota && <p className="text-xs">{presupuesto.nota}</p>}
      {presupuesto.resueltoPor && presupuesto.resueltoEl && (
        <p className="text-xs text-soft">
          {presupuesto.estado === "APROBADO" ? "Aprobado" : "Rechazado"} por {presupuesto.resueltoPor}{" "}
          <Fecha valor={presupuesto.resueltoEl} formato="relativa" />
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {presupuesto.pdfDriveFileId && (
          // El PDF se pide a la ruta de la web (lleva la sesión): nunca hay un enlace público.
          <a
            href={urlDeArchivo("presupuesto", presupuesto.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-ink underline underline-offset-2"
          >
            Ver el PDF
          </a>
        )}
        {presupuesto.estado === "RECIBIDO" && editable && (esJefatura ? (
          <ResolverPresupuesto servicioId={servicioId} presupuestoId={presupuesto.id} maestro={presupuesto.maestro.nombre} total={presupuesto.total} />
        ) : (
          <span className="text-xs text-soft">Espera la aprobación de la jefatura.</span>
        ))}
      </div>
    </Tarjeta>
  );
}
