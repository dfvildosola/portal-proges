// Las etapas de cada tipo de servicio, editables por el admin.
// Los seis tipos están fijos en el código (src/lib/servicios.ts); sus etapas son filas
// de la tabla Etapa y se ajustan acá, sin tocar código.

import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { exigirAdmin } from "@/lib/sesion";
import { TIPOS_SERVICIO } from "@/lib/servicios";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { BloqueTipo } from "./bloque-tipo";
import type { EtapaFilaDatos } from "./etapa-fila";

export default async function EtapasPage() {
  await exigirAdmin();
  const orgId = await getOrgId();

  const [etapas, abiertosPorEtapa] = await Promise.all([
    db.etapa.findMany({
      where: { organizationId: orgId },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    // Cuántos servicios abiertos hay hoy en cada etapa.
    db.servicioEnCurso.groupBy({
      by: ["etapaId"],
      where: { organizationId: orgId, estado: "ABIERTO" },
      _count: { _all: true },
    }),
  ]);

  const abiertos = new Map(abiertosPorEtapa.map((g) => [g.etapaId, g._count._all]));

  // Las etapas de cada tipo, en su orden.
  const porTipo = new Map<ServicioTipo, EtapaFilaDatos[]>();
  for (const e of etapas) {
    const lista = porTipo.get(e.tipo) ?? [];
    lista.push({
      id: e.id,
      nombre: e.nombre,
      cierraServicio: e.cierraServicio,
      propiedadPublicada: e.propiedadPublicada,
      activa: e.activa,
      abiertos: abiertos.get(e.id) ?? 0,
    });
    porTipo.set(e.tipo, lista);
  }

  const tipos = Object.keys(TIPOS_SERVICIO) as ServicioTipo[];

  return (
    <>
      <BackLink href="/equipo">Equipo</BackLink>
      <PageHeader
        title="Etapas de los servicios"
        description="Los pasos por los que avanza cada tipo de servicio, en orden."
      />

      <div className="mb-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p>
          Renombrar una etapa no toca el historial: los cambios ya registrados guardan el nombre
          que la etapa tenía ese día. Una etapa con servicios o historial no se borra, se
          desactiva: deja de ofrecerse para mover servicios, pero los que ya están en ella siguen
          ahí.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {tipos.map((tipo) => (
          <BloqueTipo key={tipo} tipo={tipo} etapas={porTipo.get(tipo) ?? []} />
        ))}
      </div>
    </>
  );
}
