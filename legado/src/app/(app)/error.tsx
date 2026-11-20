"use client";

// Lo que se ve cuando algo falla dentro del portal, en vez de una página rota.
// En producción Next no deja pasar el texto del error a la pantalla (podría tener datos
// internos), así que el mensaje es general. El caso más esperable: alguien del equipo apretó
// un botón que edita la cartera, y la cartera la edita el cliente (ADR 0010).

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorDelPortal({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
      <h2 className="text-lg font-semibold">No se pudo hacer</h2>
      <p className="text-sm text-muted-foreground">
        Si eres del equipo de Proges: la cartera (propiedades, contratos, cobranza y cuentas) la
        edita el cliente; Proges la ve y gestiona sus servicios. Si no es eso, vuelve a intentarlo
        y, si sigue fallando, avísale a Diego.
      </p>
      <Button variant="outline" onClick={() => unstable_retry()}>
        Volver a intentar
      </Button>
    </div>
  );
}
