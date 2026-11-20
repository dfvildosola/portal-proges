"use client";
// Aviso de un servicio que salió de la carga inicial (las planillas de antes del portal): el dueño
// no lo ve hasta que alguien del equipo revisa que está bien y lo confirma con este botón.
import { useState, useTransition } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { confirmarServicio } from "@/app/(equipo)/servicios/[id]/acciones";

export function ConfirmarServicio({ servicioId }: { servicioId: string }) {
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
    <div className="flex flex-col gap-2 rounded-xl bg-warn-soft p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-warn">
        Este servicio salió de la carga inicial y el dueño todavía no lo ve. Revisa que esté bien (propiedad, tipo y
        responsable) y confírmalo.
      </p>
      <div className="flex flex-col gap-1 sm:items-end">
        <Boton onClick={alConfirmar} disabled={pendiente} className="shrink-0">
          {pendiente ? "Confirmando…" : "Confirmar"}
        </Boton>
        <ErrorDeFormulario mensaje={error} />
      </div>
    </div>
  );
}
