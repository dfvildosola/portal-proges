"use client";
// «Nueva propiedad»: lo mínimo para abrir la ficha (cliente, tipo y ubicación). El resto de los
// datos se llena después en la pestaña «Datos y ubicación».
import { Plus } from "lucide-react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoDeFormulario } from "@/componentes/ficha/dialogo-de-formulario";
import { ETIQUETA_TIPO_PROPIEDAD } from "@/componentes/ficha/etiquetas-ficha";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { crearPropiedad } from "./acciones";
import type { ClienteElegible } from "./clientes-para-elegir";

export function FormularioPropiedadNueva({ clientes }: { clientes: ClienteElegible[] }) {
  return (
    <DialogoDeFormulario
      variante="principal"
      tamano="normal"
      titulo="Nueva propiedad"
      descripcion="Con esto se abre la ficha. Después llenas el resto: valor, compra, dueños y la carpeta de Drive."
      textoBoton={
        <>
          <Plus />
          Nueva propiedad
        </>
      }
      textoGuardar="Crear la propiedad"
      accion={crearPropiedad}
      campos={(errorDe) => (
        <>
          <CampoFormulario etiqueta="Cliente" error={errorDe("clienteId")}>
            <Select name="clienteId" defaultValue="" required>
              <option value="" disabled>
                Elige el cliente…
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Tipo" error={errorDe("tipo")}>
            <Select name="tipo" defaultValue="DEPARTAMENTO">
              {Object.entries(ETIQUETA_TIPO_PROPIEDAD).map(([clave, nombre]) => (
                <option key={clave} value={clave}>
                  {nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Dirección" error={errorDe("direccion")}>
            <CampoTexto name="direccion" placeholder="Agustinas 715, oficina 706" required />
          </CampoFormulario>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFormulario etiqueta="Comuna" error={errorDe("comuna")}>
              <CampoTexto name="comuna" required />
            </CampoFormulario>
            <CampoFormulario etiqueta="Región" error={errorDe("region")}>
              <CampoTexto name="region" defaultValue="Metropolitana" required />
            </CampoFormulario>
          </div>
          <CampoFormulario etiqueta="ROL del SII" ayuda="Opcional." error={errorDe("rolSII")}>
            <CampoTexto name="rolSII" />
          </CampoFormulario>
        </>
      )}
    />
  );
}
