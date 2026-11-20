"use client";
// «Nueva tarea»: qué hay que hacer, en qué servicio, quién y para cuándo. (Cuando exista el
// formulario compartido de componentes/tareas/, de la pieza J, se puede cambiar por él.)
import { useState } from "react";
import { Plus } from "lucide-react";
import type { EquipoPersona, ServicioTableroItem } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Dialogo, DialogoCerrar, DialogoContenido, DialogoDisparador, DialogoPie, DialogoTitulo } from "@/componentes/ui/dialogo";
import { Select } from "@/componentes/ui/select";
import { useFormulario } from "@/lib/usar-formulario";
import { crearTarea } from "./acciones";
import { OpcionesDePersonas } from "./opciones-de-personas";

export function DialogoNuevaTarea({
  servicios,
  personas,
}: {
  servicios: ServicioTableroItem[];
  personas: EquipoPersona[];
}) {
  const [abierto, setAbierto] = useState(false);
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(crearTarea, { alExito: () => setAbierto(false) });
  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante="contorno" />}>
        <Plus aria-hidden /> Nueva tarea
      </DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>Nueva tarea</DialogoTitulo>
        <form {...formProps} className="flex flex-col gap-3">
          <CampoFormulario etiqueta="Qué hay que hacer" error={errorDe("que")}>
            <CampoTexto name="que" required maxLength={300} />
          </CampoFormulario>
          <CampoFormulario etiqueta="En qué servicio" error={errorDe("servicioId")}>
            <Select name="servicioId" defaultValue="" required>
              <option value="" disabled>
                Elige el servicio…
              </option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {s.propiedad.direccion}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Quién" error={errorDe("responsableId")}>
            <Select name="responsableId" defaultValue="">
              <OpcionesDePersonas personas={personas} sinNadie="Sin responsable por ahora" />
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Para cuándo (opcional)" error={errorDe("vence")}>
            <CampoTexto name="vence" type="date" />
          </CampoFormulario>
          <ErrorDeFormulario mensaje={errorGeneral} />
          <DialogoPie>
            <DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar>
            <Boton type="submit" disabled={pendiente}>
              {pendiente ? "Guardando…" : "Crear tarea"}
            </Boton>
          </DialogoPie>
        </form>
      </DialogoContenido>
    </Dialogo>
  );
}
