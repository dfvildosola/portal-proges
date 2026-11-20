import type { Property } from "@/generated/prisma/client";
import type { Currency } from "@/generated/prisma/enums";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { valorFuenteLabels } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/format";
import {
  antiguedad,
  mesesDesde,
  plusvalia,
  valorDesactualizado,
  valorNeto,
} from "@/lib/property-metrics";
import { Seccion } from "./facts-parts";

type PropiedadPatrimonio = Pick<
  Property,
  | "valorComercialFecha"
  | "valorComercialFuente"
  | "compraFecha"
  | "compraPrecio"
  | "compraMoneda"
  | "deudaSaldo"
  | "deudaMoneda"
  | "deudaFecha"
  | "deudaBanco"
  | "deudaDividendo"
  | "deudaTermino"
>;

const PCT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

// Fila etiqueta / valor, con una nota chica debajo si hace falta. `aviso` pinta la
// nota con el color de aviso.
function Dato({
  label,
  children,
  nota,
  aviso,
  destacado,
  negativo,
}: {
  label: string;
  children: React.ReactNode;
  nota?: string;
  aviso?: boolean;
  destacado?: boolean;
  negativo?: boolean;
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={`text-right font-medium tabular-nums ${
            destacado ? "text-lg font-semibold" : "text-sm"
          } ${negativo ? "text-destructive" : ""}`}
        >
          {children}
        </span>
      </div>
      {nota && (
        <p
          className={`mt-0.5 text-right text-xs ${
            aviso ? "text-warning" : "text-muted-foreground"
          }`}
        >
          {nota}
        </p>
      )}
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

// Bloque «Patrimonio»: cuánto vale la propiedad (con su fecha y fuente), cuánto se
// debe, cuánto es realmente del dueño (valor neto) y cuánto ganó desde la compra
// (plusvalía). El dividendo solo se muestra: no entra al costo ni a la rentabilidad.
export function PatrimonioCard({
  property: p,
  valorComercial,
  uf,
  now,
}: {
  property: PropiedadPatrimonio;
  valorComercial: { monto: number; moneda: Currency } | null;
  uf: number | null;
  now: Date;
}) {
  const hayValor = valorComercial !== null && valorComercial.monto > 0;

  const saldo = p.deudaSaldo === null ? null : Number(p.deudaSaldo);
  const deuda =
    saldo !== null && saldo > 0 ? { monto: saldo, moneda: p.deudaMoneda } : null;
  const compra =
    p.compraPrecio === null
      ? null
      : { monto: Number(p.compraPrecio), moneda: p.compraMoneda };

  const neto = valorNeto({ valor: valorComercial, deuda, uf });
  const plus = plusvalia({ valor: valorComercial, compra, uf });

  // Línea bajo el valor comercial: fuente, fecha y antigüedad.
  const desactualizado = valorDesactualizado(p.valorComercialFecha, now);
  const notaValor = [
    p.valorComercialFuente ? valorFuenteLabels[p.valorComercialFuente] : null,
    p.valorComercialFecha
      ? `${formatDate(p.valorComercialFecha)} · ${antiguedad(mesesDesde(p.valorComercialFecha, now))}`
      : "sin fecha",
    desactualizado ? "desactualizado" : null,
  ]
    .filter((parte) => parte !== null)
    .join(" · ");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Patrimonio</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Seccion titulo="Valor comercial">
          {hayValor ? (
            <Dato label="Valor" nota={notaValor} aviso={desactualizado}>
              {formatMoney(valorComercial.monto, valorComercial.moneda)}
            </Dato>
          ) : (
            <Vacio>Sin valor comercial cargado.</Vacio>
          )}
        </Seccion>

        <Seccion titulo="Deuda hipotecaria">
          {deuda ? (
            <div className="divide-y">
              <Dato
                label="Saldo"
                nota={
                  p.deudaFecha
                    ? `al ${formatDate(p.deudaFecha)}`
                    : "sin fecha del saldo"
                }
              >
                {formatMoney(deuda.monto, deuda.moneda)}
              </Dato>
              {p.deudaBanco && <Dato label="Banco">{p.deudaBanco}</Dato>}
              {p.deudaDividendo !== null && (
                <Dato label="Dividendo mensual">
                  {formatMoney(p.deudaDividendo, deuda.moneda)}
                </Dato>
              )}
              {p.deudaTermino && (
                <Dato label="Último dividendo (fin del crédito)">
                  {formatDate(p.deudaTermino)}
                </Dato>
              )}
            </div>
          ) : (
            <Vacio>Sin deuda registrada.</Vacio>
          )}
        </Seccion>

        <Seccion titulo="Valor neto">
          <Dato
            label="Valor comercial menos deuda"
            destacado
            negativo={neto !== null && neto.monto < 0}
            nota={
              neto !== null
                ? undefined
                : hayValor
                  ? "Falta el valor UF para convertir la deuda."
                  : "Falta el valor comercial."
            }
            aviso={neto === null && hayValor}
          >
            {neto ? formatMoney(neto.monto, neto.moneda) : "—"}
          </Dato>
        </Seccion>

        <Seccion titulo="Compra y plusvalía">
          {compra === null && p.compraFecha === null ? (
            <p className="text-xs text-muted-foreground">
              Compra sin registrar.
            </p>
          ) : (
            <div className="divide-y">
              <Dato label="Precio de compra">
                {compra ? formatMoney(compra.monto, compra.moneda) : "sin registrar"}
              </Dato>
              <Dato label="Fecha de compra">
                {p.compraFecha ? formatDate(p.compraFecha) : "sin registrar"}
              </Dato>
              <Dato
                label="Plusvalía"
                negativo={plus !== null && plus.monto < 0}
                nota={
                  plus === null
                    ? compra === null
                      ? "Falta el precio de compra."
                      : compra.monto <= 0
                        ? "Sin precio de compra: no se calcula."
                        : hayValor
                          ? "Falta el valor UF para comparar."
                          : "Falta el valor comercial."
                    : plus.nominal
                      ? "En pesos de la fecha de compra: incluye la inflación."
                      : undefined
                }
                aviso={
                  plus === null && compra !== null && compra.monto > 0 && hayValor
                }
              >
                {plus
                  ? `${plus.monto > 0 ? "+" : ""}${formatMoney(plus.monto, plus.moneda)} (${PCT.format(plus.pct)}%)`
                  : "—"}
              </Dato>
            </div>
          )}
        </Seccion>
      </CardContent>
    </Card>
  );
}
