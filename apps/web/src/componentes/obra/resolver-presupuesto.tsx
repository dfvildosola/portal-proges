"use client";
// Aprobar o rechazar un presupuesto de maestro. Solo la jefatura: este componente ni se dibuja
// para quien no lo es (la API lo exige igual). Aprobar pide confirmar, porque el presupuesto pasa
// a ser el plan de costo de la obra; rechazar pide el motivo y ya no se reabre.
import type { Monto as MontoDeApi } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { formatearMonto } from "@/lib/formato";
import { aprobarPresupuesto, rechazarPresupuesto } from "./acciones";
import { DialogoConfirmar } from "./dialogo-confirmar";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";

export function ResolverPresupuesto({
  servicioId,
  presupuestoId,
  maestro,
  total,
}: {
  servicioId: string;
  presupuestoId: string;
  maestro: string;
  total: MontoDeApi;
}) {
  return (
    <div className="flex gap-2">
      <DialogoConfirmar
        boton="Aprobar"
        variante="suave"
        titulo="¿Aprobar este presupuesto?"
        descripcion={`${maestro} por ${formatearMonto(total)}. Pasa a ser el plan de costo y de plazo de la obra, y las partidas que cubre sin maestro quedan a su nombre.`}
        textoConfirmar="Sí, aprobar"
        accion={() => aprobarPresupuesto(servicioId, presupuestoId)}
      />
      <DialogoFormulario
        boton="Rechazar"
        variante="peligro"
        titulo="Rechazar el presupuesto"
        descripcion="Un presupuesto rechazado no se reabre: si el maestro manda uno corregido, se carga uno nuevo."
        accion={rechazarPresupuesto}
        textoDeEnvio="Rechazar"
        ocultos={{ servicioId, presupuestoId }}
      >
        {(errorDe) => (
          <CampoFormulario etiqueta="Motivo" error={errorDe("motivo")}>
            <AreaTexto name="motivo" required maxLength={500} />
          </CampoFormulario>
        )}
      </DialogoFormulario>
    </div>
  );
}
