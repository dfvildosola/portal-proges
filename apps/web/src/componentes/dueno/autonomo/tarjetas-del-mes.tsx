// Las cuatro cifras con que abre el inicio del dueño autónomo: cómo va el mes. Todos los números
// los calcula la API (GET /v1/cartera/resumen); aquí solo se escriben.
import Link from "next/link";
import type { ResumenCartera } from "@proges/contrato";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { mesConAnio } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { MontosJuntos } from "./montos-juntos";

function Cifra({
  cifra,
  texto,
  apoyo,
  alerta = false,
  href,
}: {
  cifra: React.ReactNode;
  texto: string;
  apoyo?: React.ReactNode;
  alerta?: boolean;
  href?: string;
}) {
  const contenido = (
    <Tarjeta className={cn("h-full gap-0.5", href && "transition-colors hover:bg-ink-soft/60")}>
      <span className={cn("text-xl leading-tight font-extrabold tracking-tight", alerta && "text-bad")}>{cifra}</span>
      <span className="text-xs text-soft">{texto}</span>
      {apoyo && <span className="text-xs text-soft">{apoyo}</span>}
    </Tarjeta>
  );
  return href ? (
    <Link href={href} className="block">
      {contenido}
    </Link>
  ) : (
    contenido
  );
}

export function TarjetasDelMes({ resumen }: { resumen: ResumenCartera }) {
  const { arriendos, gastos, atrasados } = resumen;
  const mes = mesConAnio(resumen.mes);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cifra
        cifra={`${arriendos.pagados} de ${arriendos.total}`}
        texto={`arriendos de ${mes} pagados`}
        href="/mi/cartera"
      />
      <Cifra
        cifra={<MontosJuntos montos={arriendos.cobrado} />}
        texto="cobrado en el mes"
        apoyo={
          <>
            de <MontosJuntos montos={arriendos.esperado} />
          </>
        }
        href="/mi/cartera"
      />
      <Cifra
        cifra={<MontosJuntos montos={gastos.total} />}
        texto="en gastos y cuentas del mes"
        apoyo={gastos.sinPagar > 0 ? `${gastos.sinPagar} de ${gastos.cantidad} sin pagar` : undefined}
        href="/mi/cartera?seccion=gastos"
      />
      <Cifra
        cifra={atrasados.cantidad}
        texto={atrasados.cantidad === 1 ? "arriendo atrasado" : "arriendos atrasados"}
        apoyo={atrasados.cantidad > 0 ? <>faltan <MontosJuntos montos={atrasados.saldo} /></> : undefined}
        alerta={atrasados.cantidad > 0}
        href="/mi/cartera"
      />
    </div>
  );
}
