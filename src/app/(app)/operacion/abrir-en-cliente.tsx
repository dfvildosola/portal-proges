"use client";

// «Abrir» un servicio de cualquier cliente desde Operación.
//
// La ficha de una propiedad solo se ve si el cliente activo (el que el equipo está mirando)
// es su dueño. Desde acá se puede abrir un servicio de otro cliente, así que antes de ir se
// cambia el cliente activo, como girar la llave del piso correcto antes de abrir la puerta.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cambiarClienteActivo } from "@/lib/cliente-activo-actions";

// Cambia de cliente y navega. Lo usa el botón y también la fila clicable de «Por confirmar».
export function useAbrirEnCliente() {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string>();

  function abrir(clienteId: string, href: string) {
    setError(undefined);
    empezar(async () => {
      const resultado = await cambiarClienteActivo(clienteId);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      router.push(href);
    });
  }

  return { abrir, pendiente, error };
}

export function AbrirEnCliente({
  clienteId,
  href,
}: {
  clienteId: string;
  href: string;
}) {
  const { abrir, pendiente, error } = useAbrirEnCliente();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pendiente}
        // Dentro de una fila clicable, el clic del botón no debe contar también como clic de la fila.
        onClick={(e) => {
          e.stopPropagation();
          abrir(clienteId, href);
        }}
      >
        {pendiente ? "Abriendo…" : "Abrir"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
