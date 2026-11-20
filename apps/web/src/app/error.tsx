"use client";
// Lo que se ve cuando una pantalla falla por algo inesperado. En producción Next esconde el texto
// real de los errores del servidor (por seguridad) y solo deja un código: por eso las pantallas
// que pueden fallar por algo de la API (Odoo caído, por ejemplo) atrapan el `ErrorDeApi` ellas
// mismas y muestran su mensaje con <ErrorDeCarga> en su bloque (ver el LEEME).
import { useEffect } from "react";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";

export default function ErrorDePantalla({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[web] Error en la pantalla:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">Algo salió mal</h1>
      <ErrorDeCarga
        mensaje={
          process.env.NODE_ENV === "production"
            ? "No se pudo cargar esta pantalla. Intenta de nuevo en un momento."
            : error.message
        }
        reintentar={reset}
      />
    </main>
  );
}
