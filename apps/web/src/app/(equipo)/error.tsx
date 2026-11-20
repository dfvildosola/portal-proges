"use client";
// Lo mismo que app/error.tsx, pero dentro del marco del equipo: el menú y la franja de arriba se
// quedan en su lugar y solo el contenido de la pantalla muestra el error.
import { useEffect } from "react";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";

export default function ErrorDePantalla({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[web] Error en la pantalla:", error);
  }, [error]);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-[22px] font-extrabold tracking-tight">Algo salió mal</h1>
      <ErrorDeCarga
        mensaje={
          process.env.NODE_ENV === "production"
            ? "No se pudo cargar esta pantalla. Intenta de nuevo en un momento."
            : error.message
        }
        reintentar={reset}
      />
    </div>
  );
}
