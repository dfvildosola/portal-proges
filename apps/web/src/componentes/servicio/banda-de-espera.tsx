// El aviso de arriba de la ficha: a quién se espera y desde cuándo (o que nos toca a nosotros),
// con el botón para cambiarlo. Si el servicio salió de la carga inicial y falta confirmarlo, el
// mismo aviso lo dice en una segunda línea y trae el botón «Confirmar» como principal (así hay
// un solo aviso y no dos bandas apiladas).
// Colores: naranja cuando falta confirmar; si no, el de siempre: roja pasados 10 días de espera,
// ámbar antes, y neutra sin espera. Una espera trabada manda sobre el naranja, porque es más urgente.
import type { Esperando } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { DIAS_PARA_TRABADO, ETIQUETA_ESPERANDO_A } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";
import { CambiarEspera } from "./cambiar-espera";
import { ConfirmarServicio } from "./confirmar-servicio";

export function BandaDeEspera({
  servicioId,
  abierto,
  esperando,
  puedeCambiar,
  porConfirmar,
}: {
  servicioId: string;
  /** Solo un servicio abierto tiene espera: uno terminado que quedó por confirmar solo muestra el aviso de confirmar. */
  abierto: boolean;
  esperando: Esperando | null;
  puedeCambiar: boolean;
  porConfirmar: boolean;
}) {
  const trabado = abierto && esperando !== null && esperando.dias > DIAS_PARA_TRABADO;
  const nombre = esperando
    ? esperando.a === "OTRO" && esperando.detalle
      ? esperando.detalle
      : ETIQUETA_ESPERANDO_A[esperando.a].toLowerCase()
    : "";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between",
        trabado && "bg-bad-soft text-bad",
        !trabado && porConfirmar && "bg-warn-soft text-warn",
        !trabado && !porConfirmar && !esperando && "border border-line bg-card",
        !trabado && !porConfirmar && esperando && "bg-warn-soft text-warn",
      )}
    >
      <div className="min-w-0">
        {abierto && (
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
        )}
        {porConfirmar && (
          <p className={cn("text-[13px]", abierto ? "mt-0.5" : "font-semibold")}>
            Salió de la carga inicial: el dueño no lo ve hasta que lo confirmes.
          </p>
        )}
      </div>
      {(puedeCambiar || porConfirmar) && (
        <div className="flex flex-wrap items-start gap-2 sm:justify-end">
          {porConfirmar && <ConfirmarServicio servicioId={servicioId} />}
          {puedeCambiar && (
            <CambiarEspera servicioId={servicioId} esperando={esperando} variante={porConfirmar ? "contorno" : "principal"} />
          )}
        </div>
      )}
    </div>
  );
}
