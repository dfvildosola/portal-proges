"use client";

// Botón «Borrar» de una nota propia del mismo día, con confirmación. El servidor vuelve a
// comprobar quién es el autor y que sea el mismo día: esto solo decide si se muestra.

import { Trash2 } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { borrarNota } from "./bitacora-actions";
import type { BitacoraFormState } from "./bitacora-actions";

export function BitacoraBorrar({ notaId }: { notaId: string }) {
  const [state, formProps, pending] = useFormAction(borrarNota, {} as BitacoraFormState);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-destructive" />}
      >
        <Trash2 className="size-4" />
        Borrar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar esta nota?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borra la nota y sus fotos dejan de verse en el portal. Solo puedes borrar tus notas del mismo día.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form {...formProps}>
            <input type="hidden" name="notaId" value={notaId} />
            <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
              <Trash2 className="size-4" />
              {pending ? "Borrando…" : "Borrar"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
