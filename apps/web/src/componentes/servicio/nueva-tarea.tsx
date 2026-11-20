"use client";
// El botón «+ Tarea» y su ventana, con el formulario de tarea de la pieza J (qué, quién y para
// cuándo). Al guardar, la ventana se cierra.
import { Plus } from "lucide-react";
import { useState } from "react";
import type { EquipoPersona } from "@proges/contrato";
import { FormularioDeTarea } from "@/componentes/tareas/formulario-de-tarea";
import { Boton } from "@/componentes/ui/boton";
import { Dialogo, DialogoContenido, DialogoDisparador, DialogoTitulo } from "@/componentes/ui/dialogo";

export function NuevaTarea({ servicioId, personas }: { servicioId: string; personas: EquipoPersona[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante="suave" className="mt-1 w-full" />}>
        <Plus aria-hidden /> Tarea: qué, quién, para cuándo
      </DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>Nueva tarea</DialogoTitulo>
        <FormularioDeTarea servicioId={servicioId} personas={personas} alExito={() => setAbierto(false)} />
      </DialogoContenido>
    </Dialogo>
  );
}
