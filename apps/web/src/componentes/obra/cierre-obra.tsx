"use client";
// El cierre de la obra. Solo lo hace la jefatura, y solo cuando todas las partidas están recibidas
// conformes: la API lo comprueba en el servidor (este botón solo avisa de antemano). Cerrar deja
// el servicio terminado.
import type { ObraEquipo } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { Boton } from "@/componentes/ui/boton";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { cerrarObra } from "./acciones";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";

// Por qué todavía no se puede cerrar, dicho con las cuentas de la recepción.
function motivoParaNoCerrar(recepcion: ObraEquipo["recepcion"]): string {
  if (recepcion.total === 0) return "La obra todavía no tiene partidas.";
  const faltan = [
    recepcion.pendientes > 0 ? `${recepcion.pendientes} por recibir` : null,
    recepcion.observadas > 0 ? `${recepcion.observadas} observadas` : null,
  ].filter(Boolean);
  return `Para cerrar, todas las partidas tienen que estar conformes. Faltan: ${faltan.join(" y ")}.`;
}

export function CierreObra({
  servicioId,
  estado,
  sePuedeCerrar,
  recepcion,
  esJefatura,
}: {
  servicioId: string;
  estado: ObraEquipo["estado"];
  sePuedeCerrar: boolean;
  recepcion: ObraEquipo["recepcion"];
  esJefatura: boolean;
}) {
  if (estado === "CANCELADO") {
    return (
      <Tarjeta>
        <TarjetaTitulo>Cierre</TarjetaTitulo>
        <p className="text-sm text-soft">Este servicio está cancelado: la obra ya no se puede cambiar.</p>
      </Tarjeta>
    );
  }
  if (estado === "TERMINADO") {
    return (
      <Tarjeta>
        <TarjetaTitulo>Cierre</TarjetaTitulo>
        <div className="flex items-center gap-2">
          <Insignia tono="ok">Obra cerrada</Insignia>
          <span className="text-sm text-soft">Lo planificado contra lo real está arriba, en «Plata».</span>
        </div>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta>
      <TarjetaTitulo>Cierre</TarjetaTitulo>
      {!esJefatura ? (
        <p className="text-sm text-soft">La obra la cierra la jefatura, cuando todas las partidas están recibidas conformes.</p>
      ) : (
        <div className="flex flex-col items-start gap-2">
          {!sePuedeCerrar && <p className="text-sm text-soft">{motivoParaNoCerrar(recepcion)}</p>}
          {sePuedeCerrar ? (
            <DialogoFormulario
              boton="Cerrar la obra"
              variante="principal"
              tamano="normal"
              titulo="¿Cerrar la obra?"
              descripcion="Todas las partidas están recibidas conformes. El servicio queda terminado."
              accion={cerrarObra}
              textoDeEnvio="Cerrar la obra"
              ocultos={{ servicioId }}
            >
              {(errorDe) => (
                <CampoFormulario etiqueta="Nota para quien lea el cierre (optativo)" error={errorDe("motivo")}>
                  <AreaTexto name="motivo" maxLength={500} />
                </CampoFormulario>
              )}
            </DialogoFormulario>
          ) : (
            <Boton disabled>Cerrar la obra</Boton>
          )}
        </div>
      )}
    </Tarjeta>
  );
}
