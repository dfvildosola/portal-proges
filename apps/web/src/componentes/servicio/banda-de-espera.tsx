// El aviso de arriba de la ficha: a quién se espera y desde cuándo (o que nos toca a nosotros),
// con el botón para cambiarlo. Mientras el servicio está en la columna «Nuevo» del tablero (lo
// dice la API en `nuevo`, con la misma regla del tablero), el aviso dice eso y qué falta para
// tomarlo, en vez de «nos toca»: si no, la ficha y el tablero se contradicen. Si falta confirmarlo,
// trae el botón «Confirmar» como principal (así hay un solo aviso y no dos bandas apiladas).
// Colores: naranja mientras es nuevo; si no, el de siempre: roja pasados 10 días de espera, ámbar
// antes, y neutra sin espera. Una espera trabada manda sobre el naranja, porque es más urgente.
import Link from "next/link";
import type { Esperando } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { aQuienSeEspera, DIAS_PARA_TRABADO } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";
import { CambiarEspera } from "./cambiar-espera";
import { ConfirmarServicio } from "./confirmar-servicio";

// Qué falta para que el servicio deje de ser nuevo, dicho con las marcas que manda la API. Si la
// API dice que es nuevo por otra razón que estas no cubren, se dice lo general.
function queFalta(s: { porRevisar: boolean; porConfirmar: boolean; sinResponsable: boolean }): React.ReactNode {
  if (s.porRevisar) {
    return (
      <>
        es un pedido del dueño y falta aceptarlo en{" "}
        <Link href="/repartir" className="underline">
          Repartir
        </Link>
        .
      </>
    );
  }
  const partes = [s.porConfirmar && "confirmarlo", s.sinResponsable && "elegir quién lo lleva"].filter(Boolean);
  return partes.length === 0 ? "todavía nadie lo toma." : `falta ${partes.join(" y ")}.`;
}

export function BandaDeEspera({
  servicioId,
  abierto,
  esperando,
  puedeCambiar,
  porConfirmar,
  nuevo,
  porRevisar,
  sinResponsable,
}: {
  servicioId: string;
  /** Solo un servicio abierto tiene espera: uno terminado que quedó por confirmar solo muestra el aviso de confirmar. */
  abierto: boolean;
  esperando: Esperando | null;
  puedeCambiar: boolean;
  porConfirmar: boolean;
  /** Si está en «Nuevo» (lo calcula la API); `porRevisar` y `sinResponsable` solo arman el texto. */
  nuevo: boolean;
  porRevisar: boolean;
  sinResponsable: boolean;
}) {
  const trabado = abierto && esperando !== null && esperando.dias > DIAS_PARA_TRABADO;
  const falta = nuevo ? queFalta({ porRevisar, porConfirmar, sinResponsable }) : null;
  const nombre = esperando ? aQuienSeEspera(esperando) : "";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between",
        trabado && "bg-bad-soft text-bad",
        !trabado && (nuevo || porConfirmar || esperando) && "bg-warn-soft text-warn",
        !trabado && !nuevo && !porConfirmar && !esperando && "border border-line bg-card",
      )}
    >
      <div className="min-w-0">
        {/* Lo nuevo va primero, salvo que además se espere a alguien: entonces la espera va arriba y
            lo nuevo debajo, en chico. */}
        {nuevo && !esperando && <p className="font-semibold">Nuevo: {falta}</p>}
        {abierto && (esperando || !nuevo) && (
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
        {nuevo && esperando && <p className="mt-0.5 text-[13px]">Nuevo: {falta}</p>}
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
