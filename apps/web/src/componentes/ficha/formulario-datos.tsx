"use client";
// Editar los datos generales de la propiedad: dónde está, qué es y cuánto mide. La plata (valor,
// compra, deuda) tiene su propio formulario (formulario-valores.tsx) para que ninguno sea enorme.
import { Pencil } from "lucide-react";
import type { PropiedadDatos } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { Select } from "@/componentes/ui/select";
import { actualizarDatos } from "./acciones";
import { DialogoDeFormulario } from "./dialogo-de-formulario";
import { ETIQUETA_ESTADO_PROPIEDAD, ETIQUETA_OBJETIVO, ETIQUETA_TIPO_PROPIEDAD } from "./etiquetas-ficha";

function Opciones({ lista }: { lista: Record<string, string> }) {
  return Object.entries(lista).map(([clave, nombre]) => (
    <option key={clave} value={clave}>
      {nombre}
    </option>
  ));
}

export function FormularioDatos({ propiedad }: { propiedad: PropiedadDatos }) {
  return (
    <DialogoDeFormulario
      ancho
      titulo="Editar los datos"
      textoBoton={
        <>
          <Pencil />
          Editar datos
        </>
      }
      accion={actualizarDatos}
      campos={(errorDe) => (
        <>
          <input type="hidden" name="propiedadId" value={propiedad.id} />
          <CampoFormulario etiqueta="Dirección" error={errorDe("direccion")}>
            <CampoTexto name="direccion" defaultValue={propiedad.direccion} required />
          </CampoFormulario>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFormulario etiqueta="Comuna" error={errorDe("comuna")}>
              <CampoTexto name="comuna" defaultValue={propiedad.comuna} required />
            </CampoFormulario>
            <CampoFormulario etiqueta="Región" error={errorDe("region")}>
              <CampoTexto name="region" defaultValue={propiedad.region} required />
            </CampoFormulario>
            <CampoFormulario etiqueta="Tipo" error={errorDe("tipo")}>
              <Select name="tipo" defaultValue={propiedad.tipo}>
                <Opciones lista={ETIQUETA_TIPO_PROPIEDAD} />
              </Select>
            </CampoFormulario>
            <CampoFormulario etiqueta="Situación hoy" error={errorDe("estado")}>
              <Select name="estado" defaultValue={propiedad.estado}>
                <Opciones lista={ETIQUETA_ESTADO_PROPIEDAD} />
              </Select>
            </CampoFormulario>
            <CampoFormulario etiqueta="Para qué la tiene su dueño" error={errorDe("objetivo")}>
              <Select name="objetivo" defaultValue={propiedad.objetivo}>
                <Opciones lista={ETIQUETA_OBJETIVO} />
              </Select>
            </CampoFormulario>
            <CampoFormulario etiqueta="Moneda principal" error={errorDe("monedaPrincipal")}>
              <Select name="monedaPrincipal" defaultValue={propiedad.monedaPrincipal}>
                <option value="CLP">Pesos</option>
                <option value="UF">UF</option>
              </Select>
            </CampoFormulario>
            <CampoFormulario etiqueta="Edificio" ayuda="Agrupa las unidades de un mismo edificio." error={errorDe("edificio")}>
              <CampoTexto name="edificio" defaultValue={propiedad.edificio ?? ""} />
            </CampoFormulario>
            <CampoFormulario etiqueta="ROL del SII" error={errorDe("rolSII")}>
              <CampoTexto name="rolSII" defaultValue={propiedad.rolSII ?? ""} />
            </CampoFormulario>
            <CampoFormulario etiqueta="Terreno (m²)" error={errorDe("m2Terreno")}>
              <CampoTexto name="m2Terreno" inputMode="decimal" defaultValue={propiedad.m2Terreno ?? ""} />
            </CampoFormulario>
            <CampoFormulario etiqueta="Construidos (m²)" error={errorDe("m2Construidos")}>
              <CampoTexto name="m2Construidos" inputMode="decimal" defaultValue={propiedad.m2Construidos ?? ""} />
            </CampoFormulario>
            <CampoFormulario etiqueta="Año de construcción" error={errorDe("anoConstruccion")}>
              <CampoTexto name="anoConstruccion" inputMode="numeric" defaultValue={propiedad.anoConstruccion ?? ""} />
            </CampoFormulario>
          </div>
          <Casilla name="exentaContribuciones" defaultChecked={propiedad.exentaContribuciones}>
            Está exenta de contribuciones
          </Casilla>
        </>
      )}
    />
  );
}
