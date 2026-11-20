"use client";

// Botón de enviar de un formulario: muestra «Guardando…» y se deshabilita mientras la acción corre.
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function BotonEnviar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "Guardando…" : texto}
    </Button>
  );
}
