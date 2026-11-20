"use client";

// Botón + diálogo con el formulario de una etapa. Sin `etapa` agrega una al final del
// tipo; con `etapa` la edita. El formulario solo existe mientras el diálogo está abierto,
// así que cada vez parte limpio.

import { useCallback, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { EtapaForm, type EtapaValores } from "./etapa-form";

export function EtapaDialogo({
  tipo,
  nombreTipo,
  etapa,
  esComercial,
}: {
  tipo: ServicioTipo;
  nombreTipo: string;
  etapa?: EtapaValores;
  esComercial: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={etapa ? <Button variant="outline" size="sm" /> : <Button variant="outline" />}
      >
        {etapa ? (
          <>
            <Pencil className="size-3.5" />
            Editar
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Agregar etapa
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {etapa ? `Editar «${etapa.nombre}»` : `Nueva etapa de ${nombreTipo}`}
          </DialogTitle>
          <DialogDescription>
            {etapa
              ? "El historial de los servicios conserva el nombre que tenía la etapa ese día."
              : "Queda al final de la lista; después la puedes subir."}
          </DialogDescription>
        </DialogHeader>
        <EtapaForm tipo={tipo} etapa={etapa} esComercial={esComercial} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}
