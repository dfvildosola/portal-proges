"use client";
// «Volver a traer la orden»: pone las partidas al día con lo que cambió en Odoo. Las nuevas se
// agregan, las cambiadas se actualizan y las que Odoo ya no trae se marcan (nunca se borran). El
// avance, la recepción y el maestro de cada partida no se tocan.
import { useState } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { actualizarOrden } from "./acciones";
import { useAccionDirecta } from "./usar-accion-directa";

export function ActualizarOrden({ servicioId }: { servicioId: string }) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccionDirecta();

  return (
    <div className="flex flex-col gap-2">
      <Boton
        variante="contorno"
        tamano="chico"
        disabled={pendiente}
        onClick={() => {
          setMensaje(null);
          ejecutar(
            () => actualizarOrden(servicioId),
            (resultado) => setMensaje(resultado?.mensaje ?? "Orden al día."),
          );
        }}
      >
        {pendiente ? "Trayendo…" : "Volver a traer la orden"}
      </Boton>
      {mensaje && <p className="text-xs text-soft">{mensaje}</p>}
      <ErrorDeFormulario mensaje={error} />
    </div>
  );
}
