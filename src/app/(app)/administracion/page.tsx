// Administración de arriendos (pieza M, ADR 0012): las propiedades cuyo arriendo controla
// Proges, de todos los clientes. Arriba los atrasados; abajo la lista y las comisiones del mes
// (una factura por cliente, que se emite en Odoo: el portal solo calcula, no factura).
//
// Marcar un arriendo pagado se hace en la cobranza de siempre (/cobranza), donde también
// puede hacerlo el dueño. Esta pantalla solo mira.

import Link from "next/link";
import { ChevronLeft, ChevronRight, Wallet, Building } from "lucide-react";
import { exigirEquipo } from "@/lib/sesion";
import { clientesParaElegir, espaciosQueLee, nombresPorId } from "@/lib/org";
import { hoyChile, mesActual } from "@/lib/fechas";
import { formatDate, formatMoney, formatPeriodo } from "@/lib/format";
import {
  administracionVigente,
  cobrosAtrasados,
  comisionesPorCliente,
  cuentaDelMes,
  estadoArriendoLabels,
  estadoArriendoVariant,
  mesEnAdministracion,
  textoMontos,
} from "@/lib/administracion";
import { FiltroCliente } from "@/components/filtro-cliente";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { administracionesParaPagina, type FilaAdministracion } from "./consultas";

function sumarMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Los tipos de ruta (PageProps) los genera Next al compilar; para una ruta recién creada aún no
// existen, así que los parámetros de la URL se tipan a mano.
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdministracionPage({ searchParams }: Props) {
  await exigirEquipo();
  const sp = await searchParams;
  const mes =
    typeof sp.mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes) ? sp.mes : mesActual();
  const filtro = typeof sp.cliente === "string" ? sp.cliente : null;

  const clientes = await clientesParaElegir();
  const nombreCliente = nombresPorId(clientes);
  const hoy = hoyChile();
  const filas = await administracionesParaPagina(await espaciosQueLee(filtro), mes, hoy);

  const vigentes = filas.filter((f) => administracionVigente(f, hoy));

  // Los atrasados: cada cobro sin pagar y vencido de una administración vigente.
  const atrasados = vigentes
    .flatMap((f) => cobrosAtrasados(f, f.cobros, hoy).map((cobro) => ({ fila: f, cobro })))
    .sort((a, b) => a.cobro.fechaVencimiento.getTime() - b.cobro.fechaVencimiento.getTime());

  // Las comisiones del mes: una propiedad cuenta una sola vez (la administración más reciente
  // que toque el mes; así una que terminó y otra que empezó el mismo mes no cobran doble).
  const delMes = new Map<string, FilaAdministracion>();
  for (const f of filas) {
    if (mesEnAdministracion(f, mes) && !delMes.has(f.propertyId)) delMes.set(f.propertyId, f);
  }
  const comisionesPorPropiedad = [...delMes.values()].map((f) => ({
    fila: f,
    cuenta: cuentaDelMes(f, f.cobros, mes, hoy),
  }));
  const porCliente = comisionesPorCliente(
    comisionesPorPropiedad.map((c) => ({ clienteId: c.fila.organizationId, comision: c.cuenta.comision })),
  ).sort((a, b) =>
    (nombreCliente.get(a.clienteId) ?? "").localeCompare(nombreCliente.get(b.clienteId) ?? "", "es"),
  );

  // Al cambiar de mes se conserva el filtro de cliente.
  const hrefMes = (m: string) => `/administracion?mes=${m}${filtro ? `&cliente=${encodeURIComponent(filtro)}` : ""}`;
  const hrefCobranza = (m: string, clienteId: string) => `/cobranza?mes=${m}&cliente=${encodeURIComponent(clienteId)}`;

  return (
    <>
      <PageHeader
        title="En administración"
        description="Las propiedades cuyo arriendo controla Proges: quién pagó, quién está atrasado y la comisión del mes."
        action={clientes && <FiltroCliente clientes={clientes} actual={filtro} />}
      />

      {vigentes.length === 0 && comisionesPorPropiedad.length === 0 ? (
        <EmptyState
          icon={Building}
          title="Ninguna propiedad en administración"
          description="Se pone desde la ficha de cada propiedad: «Poner en administración», con la fecha de inicio y la comisión."
        />
      ) : (
        <div className="space-y-8">
          {/* Atrasados */}
          <section aria-labelledby="atrasados">
            <h2 id="atrasados" className="mb-3 text-base font-semibold">
              Atrasados {atrasados.length > 0 && <Badge variant="destructive">{atrasados.length}</Badge>}
            </h2>
            {atrasados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún arriendo atrasado.</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {atrasados.map(({ fila, cobro }) => (
                  <li
                    key={`${fila.id}-${cobro.periodo}-${cobro.fechaVencimiento.toISOString()}`}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <Link href={`/propiedades/${fila.propertyId}`} className="font-medium hover:underline">
                        {fila.direccion}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {[nombreCliente.get(fila.organizationId), fila.arrendatario].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-sm sm:text-right">
                        <p className="font-medium tabular-nums">{formatMoney(cobro.montoEsperado, cobro.moneda)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPeriodo(cobro.periodo)} · venció el {formatDate(cobro.fechaVencimiento)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={hrefCobranza(cobro.periodo, fila.organizationId)} />}
                      >
                        <Wallet className="size-4" />
                        Cobranza
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Comisiones del mes */}
          <section aria-labelledby="comisiones">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="comisiones" className="text-base font-semibold">
                Comisiones del mes
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<Link href={hrefMes(sumarMes(mes, -1))} aria-label={formatPeriodo(sumarMes(mes, -1))} />}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-36 text-center text-sm font-semibold">{formatPeriodo(mes)}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<Link href={hrefMes(sumarMes(mes, 1))} aria-label={formatPeriodo(sumarMes(mes, 1))} />}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Para facturar en Odoo, una por cliente. Es el arriendo esperado del mes por la comisión de cada propiedad.
            </p>
            {porCliente.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguna propiedad estuvo en administración en {formatPeriodo(mes)}.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {porCliente.map((c) => (
                  <Card key={c.clienteId} size="sm">
                    <CardHeader>
                      <CardTitle>{nombreCliente.get(c.clienteId) ?? "Cliente"}</CardTitle>
                      <CardDescription className="text-lg font-semibold tabular-nums text-foreground">
                        {textoMontos(c.total)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="divide-y text-sm">
                        {comisionesPorPropiedad
                          .filter((p) => p.fila.organizationId === c.clienteId)
                          .map((p) => (
                            <li key={p.fila.propertyId} className="flex items-center justify-between gap-3 py-1.5">
                              <span className="min-w-0 truncate">
                                {p.fila.direccion}
                                <span className="text-muted-foreground"> · {p.fila.comisionPct.toLocaleString("es-CL")}%</span>
                              </span>
                              <span className="shrink-0 tabular-nums">
                                {p.cuenta.estado === "SIN_COBRO" ? "sin cobro" : textoMontos(p.cuenta.comision)}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Todas las propiedades en administración */}
          <section aria-labelledby="lista">
            <h2 id="lista" className="mb-3 text-base font-semibold">
              Propiedades en administración <span className="font-normal text-muted-foreground">({vigentes.length})</span>
            </h2>
            <ul className="divide-y rounded-xl border">
              {vigentes.map((f) => {
                const cuenta = cuentaDelMes(f, f.cobros, mes, hoy);
                return (
                  <li key={f.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link href={`/propiedades/${f.propertyId}`} className="font-medium hover:underline">
                        {f.direccion}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {[nombreCliente.get(f.organizationId), f.arrendatario ?? "Sin arrendatario"].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="tabular-nums">
                        {f.arriendo ? formatMoney(f.arriendo.monto, f.arriendo.moneda) : "Sin contrato"}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{f.comisionPct.toLocaleString("es-CL")}%</span>
                      <Badge variant={estadoArriendoVariant[cuenta.estado]}>
                        {formatPeriodo(mes)}: {estadoArriendoLabels[cuenta.estado].toLowerCase()}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
