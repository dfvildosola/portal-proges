"use client";
// Cerrar el servicio: darlo por terminado o cancelarlo, siempre con su motivo. Una obra no se cierra
// aquí (exige todas las partidas recibidas): su cierre está en el panel de la obra, y en este lugar
// solo se avisa. Cualquier otro rechazo de la API se muestra en la ventana, con su mensaje.
import { useState } from "react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { AreaTexto } from "@/componentes/ui/area-texto";
import {
  Dialogo,
  DialogoCerrar,
  DialogoContenido,
  DialogoDescripcion,
  DialogoDisparador,
  DialogoPie,
  DialogoTitulo,
} from "@/componentes/ui/dialogo";
import { Select } from "@/componentes/ui/select";
import { useFormulario } from "@/lib/usar-formulario";
import { cerrarServicio } from "@/app/(equipo)/servicios/[id]/acciones";

export function CerrarServicio({ servicioId, esObra }: { servicioId: string; esObra: boolean }) {
  if (esObra) {
    return (
      <p className="text-[13px] text-soft">
        Una obra no se cierra aquí: se cierra desde el panel de la obra, cuando todas las partidas están recibidas.
      </p>
    );
  }
  return <DialogoDeCierre servicioId={servicioId} />;
}

function DialogoDeCierre({ servicioId }: { servicioId: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante="contorno" className="w-full sm:w-auto" />}>Cerrar el servicio</DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>Cerrar el servicio</DialogoTitulo>
        <DialogoDescripcion>Un servicio cerrado ya no recibe tareas ni cambios. Cuenta por qué se cierra.</DialogoDescripcion>
        <FormularioDeCierre servicioId={servicioId} alExito={() => setAbierto(false)} />
      </DialogoContenido>
    </Dialogo>
  );
}

function FormularioDeCierre({ servicioId, alExito }: { servicioId: string; alExito: () => void }) {
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(cerrarServicio, { alExito });
  return (
    <form {...formProps} className="flex flex-col gap-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <CampoFormulario etiqueta="Cómo termina" error={errorDe("resultado")}>
        <Select name="resultado" defaultValue="TERMINADO">
          <option value="TERMINADO">Terminado: se entregó</option>
          <option value="CANCELADO">Cancelado: se dejó sin terminar</option>
        </Select>
      </CampoFormulario>
      <CampoFormulario etiqueta="Motivo" error={errorDe("motivo")}>
        <AreaTexto name="motivo" rows={3} maxLength={2000} required placeholder="Por ejemplo: se entregó el informe final al cliente" />
      </CampoFormulario>
      <ErrorDeFormulario mensaje={errorGeneral} />
      <DialogoPie>
        <DialogoCerrar render={<Boton variante="contorno" />}>Volver</DialogoCerrar>
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Cerrando…" : "Cerrar servicio"}
        </Boton>
      </DialogoPie>
    </form>
  );
}
