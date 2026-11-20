// La franja de la ficha que dice a quién se espera y desde cuándo (o que nos toca a nosotros), con
// el botón para cambiarlo. Roja pasados 10 días de espera, ámbar antes; sin espera, neutra.
import type { Esperando } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { DIAS_PARA_TRABADO, ETIQUETA_ESPERANDO_A } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";
import { CambiarEspera } from "./cambiar-espera";

export function BandaDeEspera({
  servicioId,
  esperando,
  puedeCambiar,
}: {
  servicioId: string;
  esperando: Esperando | null;
  puedeCambiar: boolean;
}) {
  const trabado = esperando !== null && esperando.dias > DIAS_PARA_TRABADO;
  const nombre = esperando
    ? esperando.a === "OTRO" && esperando.detalle
      ? esperando.detalle
      : ETIQUETA_ESPERANDO_A[esperando.a].toLowerCase()
    : "";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between",
        !esperando && "border border-line bg-card",
        esperando && !trabado && "bg-warn-soft text-warn",
        trabado && "bg-bad-soft text-bad",
      )}
    >
      <p className="font-semibold">
        {esperando ? (
          <>
            Esperando a: {nombre}
            {esperando.detalle && esperando.a !== "OTRO" ? ` (${esperando.detalle})` : ""} · desde el{" "}
            <Fecha valor={esperando.desde} formato="conDia" /> · {esperando.dias} {esperando.dias === 1 ? "día" : "días"}
            {trabado ? " · trabado" : ""}
          </>
        ) : (
          "Nos toca a nosotros: no estamos esperando a nadie."
        )}
      </p>
      {puedeCambiar && <CambiarEspera servicioId={servicioId} esperando={esperando} />}
    </div>
  );
}
