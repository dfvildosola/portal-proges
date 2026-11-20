"use client";
// «Abrir servicio»: para un servicio que no vino de un pedido (llamó alguien, se acordó en
// persona). Se elige la propiedad, el servicio del catálogo, quién lo lleva y una nota.
import { useState } from "react";
import { FolderPlus } from "lucide-react";
import type { CatalogoServicio, EquipoPersona, PropiedadResumen } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Boton } from "@/componentes/ui/boton";
import { Dialogo, DialogoCerrar, DialogoContenido, DialogoDisparador, DialogoPie, DialogoTitulo } from "@/componentes/ui/dialogo";
import { Select } from "@/componentes/ui/select";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { useFormulario } from "@/lib/usar-formulario";
import { abrirServicio } from "./acciones";
import { OpcionesDePersonas } from "./opciones-de-personas";

export function DialogoAbrirServicio({
  propiedades,
  catalogo,
  personas,
}: {
  propiedades: PropiedadResumen[];
  catalogo: CatalogoServicio[];
  personas: EquipoPersona[];
}) {
  const [abierto, setAbierto] = useState(false);
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(abrirServicio, { alExito: () => setAbierto(false) });
  // Los tipos que se pueden elegir: los que ofrece algún servicio del catálogo, sin repetir.
  const tipos = [...new Set(catalogo.flatMap((s) => s.tipos))];
  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante="contorno" />}>
        <FolderPlus aria-hidden /> Abrir servicio
      </DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>Abrir un servicio</DialogoTitulo>
        <form {...formProps} className="flex flex-col gap-3">
          <CampoFormulario etiqueta="Propiedad" error={errorDe("propiedadId")}>
            <Select name="propiedadId" defaultValue="" required>
              <option value="" disabled>
                Elige la propiedad…
              </option>
              {propiedades.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.direccion}, {p.comuna} · {p.clienteNombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Servicio del catálogo" error={errorDe("servicioId")}>
            <Select name="servicioId" defaultValue="" required>
              <option value="" disabled>
                Elige el servicio…
              </option>
              {catalogo.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} · {s.nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario
            etiqueta="Tipo de servicio (opcional)"
            ayuda="Déjalo así salvo que el sistema te pida elegir uno."
            error={errorDe("tipo")}
          >
            <Select name="tipo" defaultValue="">
              <option value="">Según el servicio</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TIPO_SERVICIO[t]}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Quién lo lleva" error={errorDe("responsableId")}>
            <Select name="responsableId" defaultValue="">
              <OpcionesDePersonas personas={personas} sinNadie="Sin responsable por ahora" />
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Nota (opcional)" error={errorDe("nota")}>
            <AreaTexto name="nota" rows={2} />
          </CampoFormulario>
          <ErrorDeFormulario mensaje={errorGeneral} />
          <DialogoPie>
            <DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar>
            <Boton type="submit" disabled={pendiente}>
              {pendiente ? "Abriendo…" : "Abrir servicio"}
            </Boton>
          </DialogoPie>
        </form>
      </DialogoContenido>
    </Dialogo>
  );
}
