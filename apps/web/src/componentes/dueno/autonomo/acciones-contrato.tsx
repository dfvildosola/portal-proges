"use client";
// Lo que se hace con un contrato vigente: seguir un plazo más (renovar) o fijar el día en que sale
// el arrendatario (terminar). Cada uno pide confirmar o la fecha: no se deshacen con un toque.
import type { Contrato } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { renovarContrato, terminarContrato } from "./acciones";
import { DialogoConfirmar } from "./dialogo-confirmar";

export function AccionesDeContrato({ contrato, hoy }: { contrato: Contrato; hoy: string }) {
  // La API no deja renovar un contrato con salida fijada ni uno que aún no empieza.
  const sePuedeRenovar = !contrato.fechaSalida && contrato.estado !== "POR_EMPEZAR";
  return (
    <>
      {sePuedeRenovar && (
        <DialogoConfirmar
          boton="Renovar"
          variante="suave"
          titulo="Renovar el contrato"
          pregunta={`El contrato de ${contrato.arrendatarioNombre} seguirá un plazo más (${contrato.plazoMeses} meses).`}
          textoDeEnvio="Sí, renovar"
          accion={renovarContrato}
          ocultos={{ id: contrato.id }}
        />
      )}
      <DialogoFormulario
        boton="Terminar"
        variante="fantasma"
        titulo="Terminar el contrato"
        descripcion={`¿Qué día sale ${contrato.arrendatarioNombre}? Los cobros sin pago de los meses siguientes se borran; los que ya tienen pagos se mantienen.`}
        accion={terminarContrato}
        textoDeEnvio="Terminar contrato"
        ocultos={{ id: contrato.id }}
      >
        {(errorDe) => (
          <CampoFormulario etiqueta="Día de salida" error={errorDe("fechaSalida")}>
            <CampoTexto name="fechaSalida" type="date" defaultValue={contrato.fechaSalida ?? hoy} required />
          </CampoFormulario>
        )}
      </DialogoFormulario>
    </>
  );
}
