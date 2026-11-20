"use client";
// Anotar a mano una factura que no está en Odoo (supuesto abierto de la ADR 0014: no se sabe si las
// facturas de los maestros terminan entrando a Odoo). Si todas terminan allá, esta puerta no se usa.
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { Select } from "@/componentes/ui/select";
import { anotarFactura } from "./acciones";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";

export function FormularioFacturaManual({ servicioId, maestros }: { servicioId: string; maestros: { id: string; nombre: string }[] }) {
  return (
    <DialogoFormulario
      boton="Anotar a mano"
      titulo="Anotar una factura fuera de Odoo"
      descripcion="Para una factura o un pago del maestro que no está en Odoo. Se suma a las cuentas igual que las de Odoo y queda marcada «Fuera de Odoo»."
      accion={anotarFactura}
      textoDeEnvio="Anotar"
      ocultos={{ servicioId }}
    >
      {(errorDe) => (
        <>
          <CampoFormulario etiqueta="Maestro" error={errorDe("maestroId")}>
            <Select name="maestroId" required defaultValue="">
              <option value="" disabled>
                Elige un maestro
              </option>
              {maestros.map((maestro) => (
                <option key={maestro.id} value={maestro.id}>
                  {maestro.nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <div className="grid grid-cols-2 gap-2">
            <CampoFormulario etiqueta="N° de factura (optativo)" error={errorDe("numero")}>
              <CampoTexto name="numero" maxLength={40} />
            </CampoFormulario>
            <CampoFormulario etiqueta="Fecha" error={errorDe("fecha")}>
              <CampoTexto name="fecha" type="date" required />
            </CampoFormulario>
          </div>
          <CampoFormulario etiqueta="Monto en pesos" error={errorDe("monto") ?? errorDe("monto.valor")}>
            <CampoTexto name="monto" inputMode="numeric" placeholder="920.000" required />
          </CampoFormulario>
          <Casilla name="pagada">Ya está pagada</Casilla>
          <CampoFormulario etiqueta="Nota (optativo)" error={errorDe("nota")}>
            <AreaTexto name="nota" maxLength={500} />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}
