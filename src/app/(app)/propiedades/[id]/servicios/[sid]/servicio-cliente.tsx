// La página de un servicio vista por un CLIENTE: solo lectura. Recibe lo que entrega
// `servicioParaCliente` (src/lib/vista-cliente.ts): sin responsable, sin notas internas, sin
// motivo de cierre y sin datos de interesados u oferentes.

import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { NOMBRES_ESTADO, TIPOS_SERVICIO } from "@/lib/servicios";
import type { ServicioDelDetalle } from "@/lib/vista-cliente";
import { ServicioClienteComercial } from "./servicio-cliente-comercial";

export function ServicioCliente({ servicio: s }: { servicio: ServicioDelDetalle }) {
  const abierto = s.estado === "ABIERTO";
  const desde = formatDate(s.abiertoEl);
  const hasta = s.cerradoEl ? formatDate(s.cerradoEl) : null;

  return (
    <>
      <BackLink href={`/propiedades/${s.propiedad.id}?pestana=servicios`}>
        Volver a la propiedad
      </BackLink>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{TIPOS_SERVICIO[s.tipo].nombre}</Badge>
          <Badge variant={abierto ? "info" : "success"}>{NOMBRES_ESTADO[s.estado]}</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{s.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          Propiedad:{" "}
          <Link
            href={`/propiedades/${s.propiedad.id}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {s.propiedad.direccion}
            {s.propiedad.comuna ? `, ${s.propiedad.comuna}` : ""}
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span>
            Etapa actual: <span className="font-medium">{s.etapa}</span>
          </span>
          <span className="text-muted-foreground">
            {hasta ? `Del ${desde} al ${hasta}` : `Abierto el ${desde}`}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {s.comercial && <ServicioClienteComercial comercial={s.comercial} />}

        <Card>
          <CardHeader>
            <CardTitle>Historial de etapas</CardTitle>
          </CardHeader>
          <CardContent>
            {s.cambiosDeEtapa.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {/* El más reciente arriba. */}
                {[...s.cambiosDeEtapa].reverse().map((c, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-24 shrink-0 text-xs leading-5 text-muted-foreground">
                      {formatDate(c.fecha)}
                    </span>
                    <span>{c.etapa}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
