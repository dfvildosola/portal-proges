// Las cuentas de la obra (solo EQUIPO): lo aprobado, los adicionales, lo facturado por los
// maestros, lo pagado, el saldo y el avance ponderado. Todos los números salen de las funciones
// puras de src/lib/obra.ts: aquí no se calcula nada, solo se muestra. El dueño nunca ve esto.

import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { exigirLectura } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { formatMoney } from "@/lib/format";
import { avancePonderado, cuentasDeObra } from "@/lib/obra";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cargarDatosDeObra } from "./obra-datos";

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-lg font-semibold tabular-nums">{valor}</p>
      {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}

export async function ObraCuentas({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  // Solo el equipo: aquí hay costos del maestro.
  await equipoEnAccion();

  const datos = await cargarDatosDeObra(servicioEnCursoId);
  if (!datos) notFound();
  await exigirLectura(datos.organizationId);

  const cuentas = cuentasDeObra(
    datos.presupuestos,
    datos.facturas.map((f) => f.cuenta),
  );
  const avance = avancePonderado(datos.partidas);

  // El pago viene de Odoo: si no se pudo leer, no se muestra un número que podría estar mal.
  const sinPago = datos.odooError !== null;
  const faltanDatos = datos.facturas.filter((f) => f.sinDatosDeOdoo).length;
  const fmt = (n: number) => formatMoney(n, "CLP");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas de la obra</CardTitle>
        <CardDescription>
          Lo que se acordó con los maestros, lo que han facturado y lo que Odoo marca pagado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Cifra titulo="Aprobado" valor={fmt(cuentas.aprobado)} detalle="presupuestos originales" />
          <Cifra titulo="Adicionales" valor={fmt(cuentas.adicionales)} detalle="cambios de alcance" />
          <Cifra titulo="Facturado" valor={fmt(cuentas.facturado)} detalle="asignado a este proyecto" />
          <Cifra titulo="Pagado" valor={sinPago ? "—" : fmt(cuentas.pagado)} detalle="según Odoo" />
          <Cifra titulo="Saldo" valor={sinPago ? "—" : fmt(cuentas.saldo)} detalle="aprobado + adicionales − pagado" />
          <Cifra titulo="Avance" valor={`${avance.toLocaleString("es-CL")} %`} detalle="ponderado por precio" />
        </div>

        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={avance}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance de la obra"
        >
          <div className="h-full bg-primary" style={{ width: `${avance}%` }} />
        </div>

        {sinPago && (
          <p className="flex items-start gap-2 text-sm text-warning-soft-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>Odoo no respondió ({datos.odooError}). El pagado y el saldo se muestran cuando vuelva.</span>
          </p>
        )}
        {!sinPago && faltanDatos > 0 && (
          <p className="flex items-start gap-2 text-sm text-warning-soft-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {faltanDatos === 1 ? "Una factura asignada no apareció" : `${faltanDatos} facturas asignadas no aparecieron`}{" "}
              en Odoo: el pagado puede estar incompleto.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
