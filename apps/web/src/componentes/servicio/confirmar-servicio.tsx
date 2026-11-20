"use client";
// El botón «Confirmar» de un servicio que salió de la carga inicial (las planillas de antes del
// portal): el dueño no lo ve hasta que alguien del equipo revisa que está bien y lo confirma. El
// aviso que lo explica vive en la banda de arriba (banda-de-espera.tsx); aquí solo está el botón
// y, debajo, el mensaje si la API lo rechaza. Con `compacto` es la versión de la tarjeta del
// tablero (botón secundario, más chico y pegado a la izquierda); sin él, la de la ficha.
import { useState, useTransition } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { cn } from "@/lib/utils";
import { confirmarServicio } from "@/app/(equipo)/servicios/[id]/acciones";

export function ConfirmarServicio({ servicioId, compacto = false }: { servicioId: string; compacto?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function alConfirmar() {
    setError(null);
    empezar(async () => {
      const resultado = await confirmarServicio(servicioId);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <div className={cn("flex flex-col gap-1", !compacto && "sm:items-end")}>
      <Boton
        onClick={alConfirmar}
        disabled={pendiente}
        variante={compacto ? "contorno" : "principal"}
        tamano={compacto ? "compacto" : "normal"}
        className="shrink-0"
      >
        {pendiente ? "Confirmando…" : "Confirmar"}
      </Boton>
      <ErrorDeFormulario mensaje={error} />
    </div>
  );
}
