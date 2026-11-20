"use client";

// Botón + diálogo con el formulario de usuario. Sin `usuario` crea; con `usuario` edita.
// El formulario solo existe mientras el diálogo está abierto, así que cada vez parte limpio.

import { useCallback, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UsuarioForm, type ClienteOpcion, type UsuarioValores } from "./usuario-form";

export function UsuarioDialogo({
  usuario,
  esYo = false,
  clientes,
}: {
  usuario?: UsuarioValores;
  esYo?: boolean;
  clientes: ClienteOpcion[];
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          usuario ? (
            <Button variant="ghost" size="sm" />
          ) : (
            <Button />
          )
        }
      >
        {usuario ? (
          <>
            <Pencil className="size-4" />
            Editar
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Nuevo usuario
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{usuario ? `Editar a ${usuario.nombre}` : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <UsuarioForm
          usuario={usuario}
          esYo={esYo}
          clientes={clientes}
          onListo={cerrar}
        />
      </DialogContent>
    </Dialog>
  );
}
