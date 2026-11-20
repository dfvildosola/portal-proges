"use client";
// Cambiar un maestro que ya está agregado: su especialidad, su teléfono y si está activo. El nombre
// no se escribe aquí: viene de Odoo (si lo corrigieron allá, se marca «Traer el nombre de Odoo»).
// Un maestro desactivado deja de ofrecerse al cargar presupuestos, pero nunca se borra.
import type { Maestro } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { useFormulario } from "@/lib/usar-formulario";
import { cambiarMaestro } from "./acciones";
import { useCerrarDialogo } from "./dialogo-de-formulario";

export function FormularioMaestro({ maestro }: { maestro: Maestro }) {
  const cerrar = useCerrarDialogo();
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(cambiarMaestro, { alExito: cerrar });

  return (
    <form {...formProps} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={maestro.id} />
      <CampoFormulario etiqueta="Especialidad" error={errorDe("especialidad")} ayuda="Lo que hace: gasfíter, electricista, pintor…">
        <CampoTexto name="especialidad" defaultValue={maestro.especialidad ?? ""} autoComplete="off" />
      </CampoFormulario>
      <CampoFormulario etiqueta="Teléfono" error={errorDe("telefono")}>
        <CampoTexto name="telefono" type="tel" defaultValue={maestro.telefono ?? ""} autoComplete="off" />
      </CampoFormulario>
      <Casilla name="activo" defaultChecked={maestro.activo}>
        Activo (se ofrece al cargar presupuestos)
      </Casilla>
      <Casilla name="refrescarNombreDeOdoo">Traer el nombre de nuevo desde Odoo</Casilla>
      <ErrorDeFormulario mensaje={errorGeneral} />
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </Boton>
    </form>
  );
}
