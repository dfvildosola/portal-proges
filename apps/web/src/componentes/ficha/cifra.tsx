// Una cifra grande con su rótulo («4 · servicios desde jun 2026»), como las del resumen de la ficha.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Cifra({
  valor,
  rotulo,
  tono,
}: {
  valor: ReactNode;
  rotulo: string;
  /** Pinta la cifra de ámbar o rojo cuando pide atención. */
  tono?: "warn" | "bad";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-line bg-card px-3.5 py-3">
      <div className={cn("text-xl leading-tight font-extrabold tracking-tight", tono === "warn" && "text-warn", tono === "bad" && "text-bad")}>
        {valor}
      </div>
      <div className="text-xs text-soft">{rotulo}</div>
    </div>
  );
}
