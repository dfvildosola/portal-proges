"use client";
// Lo que se ve después de crear una llave: la llave completa, UNA sola vez. Proges guarda solo su
// huella (como una cerradura que reconoce la llave pero no puede fabricar otra igual), así que
// si se cierra esta ventana sin copiarla, no hay forma de verla de nuevo: habría que crear otra.
import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Boton } from "@/componentes/ui/boton";
import { useCerrarDialogo } from "./dialogo-de-formulario";

export function LlaveCreada({ llave }: { llave: string }) {
  const cerrar = useCerrarDialogo();
  const [estado, setEstado] = useState<"sin-copiar" | "copiada" | "fallo">("sin-copiar");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(llave);
      setEstado("copiada");
    } catch (error) {
      console.error("[web] No se pudo copiar la llave:", error);
      setEstado("fallo");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p role="alert" className="flex items-start gap-2 rounded-[10px] bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        Esta llave no se vuelve a ver. Cópiala ahora y entrégala por un canal seguro.
      </p>
      <input
        readOnly
        value={llave}
        aria-label="La llave completa"
        onFocus={(e) => e.currentTarget.select()}
        className="h-11 w-full min-w-0 rounded-[10px] border border-line bg-scr px-3 font-mono text-[13px] text-fg lg:h-9"
      />
      {estado === "fallo" && (
        <p role="alert" className="text-xs font-semibold text-bad">
          No se pudo copiar solo. Toca la llave, selecciónala completa y cópiala a mano.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Boton onClick={copiar} className="sm:flex-1">
          {estado === "copiada" ? <Check /> : <Copy />}
          {estado === "copiada" ? "Copiada" : "Copiar la llave"}
        </Boton>
        <Boton variante="contorno" onClick={cerrar}>
          Listo, ya la copié
        </Boton>
      </div>
    </div>
  );
}
