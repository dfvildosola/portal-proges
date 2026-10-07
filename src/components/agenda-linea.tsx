// Una línea de la agenda de pendientes: qué es, de qué propiedad, cuánto y el botón que lo resuelve.
// Se usa en Pendientes, y también en Inicio y la ficha de propiedad.
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BotonEnviar } from "@/components/boton-enviar";
import { markBillPaid } from "@/app/(app)/cuentas/actions";
import { tipoItemLabels, type ItemAgenda } from "@/lib/agenda";
import { hoyChile } from "@/lib/fechas";
import { formatMoney, toDateInputValue } from "@/lib/format";

export function AgendaLinea({
  item,
  conPropiedad = true,
}: {
  item: ItemAgenda;
  conPropiedad?: boolean;
}) {
  const { propiedad, contrato, accion } = item;
  // En la ficha, un botón que lleva a esa misma ficha no sirve de nada.
  const enlazaASiMisma =
    !conPropiedad && !!propiedad && accion.href === `/propiedades/${propiedad.id}`;
  return (
    <div className="flex flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        {/* El tipo va en el mismo renglón que el texto, para que cada línea ocupe dos renglones y no tres. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Badge variant="secondary">{tipoItemLabels[item.tipo]}</Badge>
          <span>{item.texto}</span>
        </p>
        {((conPropiedad && propiedad) || contrato) && (
          <p className="text-xs text-muted-foreground">
            {conPropiedad && propiedad && (
              <Link
                href={`/propiedades/${propiedad.id}`}
                className="hover:underline"
              >
                {propiedad.direccion} · {propiedad.comuna}
              </Link>
            )}
            {conPropiedad && propiedad && contrato && " · "}
            {contrato && contrato.arrendatario}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {item.montoCLP !== null && (
          <span className="text-sm font-medium tabular-nums">
            ${formatMoney(item.montoCLP)}
          </span>
        )}
        {item.ref.modelo === "cuenta" ? (
          <form action={markBillPaid}>
            <input type="hidden" name="billId" value={item.ref.id} />
            <input
              type="hidden"
              name="fechaPago"
              value={toDateInputValue(hoyChile())}
            />
            <BotonEnviar texto={accion.texto} />
          </form>
        ) : enlazaASiMisma ? null : (
          <Link
            href={accion.href}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {accion.texto}
          </Link>
        )}
      </div>
    </div>
  );
}
