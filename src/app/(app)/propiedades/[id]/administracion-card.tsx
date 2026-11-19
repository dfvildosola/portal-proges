// Tarjeta «Administración de arriendos» de la ficha de una propiedad (pieza M, ADR 0012).
//
// Cuando Proges administra el arriendo, el arrendatario le paga directo al dueño y Proges
// controla que pague. La tarjeta muestra desde cuándo, la comisión, cómo van los últimos 6
// meses (pagado o atrasado) y la comisión de este mes. El equipo además puede poner la
// propiedad en administración, editarla y terminarla. El dueño ve lo mismo sin botones: no
// hay nada secreto, es lo que Proges le cobra.
//
// Es un Server Component que carga sus propios datos: la ficha solo le pasa el id. No
// pinta nada si el usuario no puede leer esa propiedad, ni (para un dueño) si la propiedad
// no está en administración.

import Link from "next/link";
import { Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { puedeLeerEn } from "@/lib/org";
import { usuarioActual } from "@/lib/sesion";
import { hoyChile } from "@/lib/fechas";
import { formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import {
  administracionVigente,
  cuentaDeMeses,
  estadoArriendoLabels,
  estadoArriendoVariant,
  periodoDe,
  textoMontos,
  ultimosMeses,
} from "@/lib/administracion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { administracionDePropiedad } from "../../administracion/consultas";
import { AdministracionAcciones } from "../../administracion/formularios";

// «nov 26»: el mes corto y el año de dos cifras, para que quepan seis en una fila a 390 px.
function mesCorto(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CL", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(Date.UTC(anio, mes - 1, 1)))
    .replace(".", "");
}

export async function AdministracionCard({ propertyId }: { propertyId: string }) {
  const usuario = await usuarioActual();
  if (!usuario) return null;

  // El espacio sale de la propiedad: si no se puede leer, es como si no existiera.
  const propiedad = await db.property.findUnique({
    where: { id: propertyId },
    select: { organizationId: true },
  });
  if (!propiedad || !(await puedeLeerEn(propiedad.organizationId))) return null;

  const esEquipo = usuario.rol === "EQUIPO";
  const hoy = hoyChile();
  const adm = await administracionDePropiedad(propertyId, propiedad.organizationId, hoy);

  // Un dueño no necesita ver «no está en administración»: solo el equipo puede ponerla.
  if (!adm && !esEquipo) return null;

  const hoyTexto = toDateInputValue(hoy);

  if (!adm) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Administración de arriendos</CardTitle>
          <CardDescription>
            Esta propiedad no está en administración. Si Proges controla que el arrendatario pague
            cada mes, ponla en administración con su comisión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdministracionAcciones propertyId={propertyId} administracion={null} hoy={hoyTexto} />
        </CardContent>
      </Card>
    );
  }

  const vigente = administracionVigente(adm, hoy);
  const mesHoy = periodoDe(hoy);
  const meses = cuentaDeMeses(adm, adm.cobros, ultimosMeses(mesHoy, 6), hoy);
  const esteMes = meses[meses.length - 1];
  // Al dueño le sirve ir directo a su mes; al equipo, a la cobranza del cliente.
  const hrefCobranza = esEquipo
    ? `/cobranza?mes=${mesHoy}&cliente=${encodeURIComponent(adm.organizationId)}`
    : `/cobranza?mes=${mesHoy}`;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Administración de arriendos
          <Badge variant={vigente ? "success" : "secondary"}>{vigente ? "Vigente" : "Terminada"}</Badge>
        </CardTitle>
        <CardDescription>
          El arrendatario le paga directo al dueño; Proges controla que pague y cobra una comisión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Desde</dt>
            <dd className="font-medium">{formatDate(adm.desde)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Hasta</dt>
            <dd className="font-medium">{adm.hasta ? formatDate(adm.hasta) : "Sin fecha"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Comisión</dt>
            <dd className="font-medium tabular-nums">{adm.comisionPct.toLocaleString("es-CL")}%</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Arriendo</dt>
            <dd className="font-medium tabular-nums">
              {adm.arriendo ? formatMoney(adm.arriendo.monto, adm.arriendo.moneda) : "Sin contrato"}
            </dd>
            {adm.arrendatario && <dd className="truncate text-xs text-muted-foreground">{adm.arrendatario}</dd>}
          </div>
        </dl>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Últimos 6 meses</p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {meses.map((m) => (
              <li key={m.periodo} className="flex flex-col items-start gap-1 rounded-lg border px-2 py-1.5">
                <span className="text-xs capitalize text-muted-foreground">{mesCorto(m.periodo)}</span>
                <Badge variant={estadoArriendoVariant[m.estado]}>{estadoArriendoLabels[m.estado]}</Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Comisión de este mes</p>
            <p className="text-xl font-semibold tabular-nums">
              {esteMes.estado === "FUERA" || esteMes.estado === "SIN_COBRO" ? "—" : textoMontos(esteMes.comision)}
            </p>
            {esteMes.estado === "SIN_COBRO" && (
              <p className="text-xs text-muted-foreground">Todavía no se genera el cobro del mes.</p>
            )}
            {esteMes.estado === "FUERA" && (
              <p className="text-xs text-muted-foreground">Este mes está fuera de la administración.</p>
            )}
          </div>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={hrefCobranza} />}>
            <Wallet className="size-4" />
            Ver cobranza del mes
          </Button>
        </div>

        {esEquipo && (
          <AdministracionAcciones
            propertyId={propertyId}
            administracion={
              vigente
                ? {
                    id: adm.id,
                    desde: toDateInputValue(adm.desde),
                    hasta: toDateInputValue(adm.hasta),
                    comisionPct: String(adm.comisionPct),
                  }
                : null
            }
            hoy={hoyTexto}
          />
        )}
      </CardContent>
    </Card>
  );
}
