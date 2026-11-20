"use client";
// Editar la plata de la propiedad: lo que vale hoy, cuándo y por cuánto se compró, y la deuda
// hipotecaria. Cada bloque se manda entero; si se deja vacío, se borra.
import { Pencil } from "lucide-react";
import type { PropiedadDatos } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { actualizarValores } from "./acciones";
import { CampoMonto } from "./campo-monto";
import { DialogoDeFormulario } from "./dialogo-de-formulario";
import { ETIQUETA_FUENTE_VALOR } from "./etiquetas-ficha";

export function FormularioValores({ propiedad }: { propiedad: PropiedadDatos }) {
  const { valorComercial, compra, deuda } = propiedad;
  return (
    <DialogoDeFormulario
      ancho
      titulo="Editar valor, compra y deuda"
      descripcion="Si dejas un bloque entero vacío, se borra de la ficha."
      textoBoton={
        <>
          <Pencil />
          Editar valor y deuda
        </>
      }
      accion={actualizarValores}
      campos={(errorDe) => (
        <>
          <input type="hidden" name="propiedadId" value={propiedad.id} />

          <h3 className="text-xs font-bold tracking-[0.07em] text-soft uppercase">Valor comercial</h3>
          <CampoMonto etiqueta="Cuánto vale" nombre="vcMonto" nombreMoneda="vcMoneda" actual={valorComercial?.monto} error={errorDe("valorComercial.monto")} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFormulario etiqueta="A qué día corresponde" error={errorDe("valorComercial.fecha")}>
              <CampoTexto type="date" name="vcFecha" defaultValue={valorComercial?.fecha ?? ""} />
            </CampoFormulario>
            <CampoFormulario etiqueta="De dónde sale" error={errorDe("valorComercial.fuente")}>
              <Select name="vcFuente" defaultValue={valorComercial?.fuente ?? ""}>
                <option value="">—</option>
                {Object.entries(ETIQUETA_FUENTE_VALOR).map(([clave, nombre]) => (
                  <option key={clave} value={clave}>
                    {nombre}
                  </option>
                ))}
              </Select>
            </CampoFormulario>
          </div>

          <h3 className="mt-2 text-xs font-bold tracking-[0.07em] text-soft uppercase">Compra</h3>
          <CampoMonto etiqueta="Precio" nombre="compraPrecio" nombreMoneda="compraMoneda" actual={compra?.precio} error={errorDe("compra.precio")} />
          <CampoFormulario etiqueta="Fecha de compra" error={errorDe("compra.fecha")}>
            <CampoTexto type="date" name="compraFecha" defaultValue={compra?.fecha ?? ""} />
          </CampoFormulario>

          <h3 className="mt-2 text-xs font-bold tracking-[0.07em] text-soft uppercase">Deuda hipotecaria</h3>
          <CampoMonto etiqueta="Saldo" nombre="deudaSaldo" nombreMoneda="deudaMoneda" actual={deuda?.saldo} error={errorDe("deuda.saldo")} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFormulario etiqueta="Banco" error={errorDe("deuda.banco")}>
              <CampoTexto name="deudaBanco" defaultValue={deuda?.banco ?? ""} />
            </CampoFormulario>
            <CampoFormulario etiqueta="Dividendo mensual" ayuda="En la misma moneda que el saldo." error={errorDe("deuda.dividendo")}>
              <CampoTexto name="deudaDividendo" inputMode="decimal" defaultValue={deuda?.dividendo ?? ""} />
            </CampoFormulario>
            <CampoFormulario etiqueta="Saldo al día" error={errorDe("deuda.fecha")}>
              <CampoTexto type="date" name="deudaFecha" defaultValue={deuda?.fecha ?? ""} />
            </CampoFormulario>
            <CampoFormulario etiqueta="Último dividendo" error={errorDe("deuda.termino")}>
              <CampoTexto type="date" name="deudaTermino" defaultValue={deuda?.termino ?? ""} />
            </CampoFormulario>
          </div>
        </>
      )}
    />
  );
}
