import { Users, Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { clientesParaElegir, espaciosQueLee, nombresPorId } from "@/lib/org";
import { FiltroCliente } from "@/components/filtro-cliente";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ownerTypeLabels } from "@/lib/domain";
import {
  CreateGrupoForm,
  CreateOwnerForm,
  OwnerGrupoSelect,
  DeleteGrupoButton,
} from "./forms";

export default async function DuenosPage({
  searchParams,
}: PageProps<"/duenos">) {
  const sp = await searchParams;
  // El equipo ve todos los clientes juntos y puede filtrar por uno (?cliente=).
  const filtro = typeof sp.cliente === "string" ? sp.cliente : null;
  const clientes = await clientesParaElegir();
  const nombreDe = nombresPorId(clientes);
  const orgIds = await espaciosQueLee(filtro);

  const [grupos, owners] = await Promise.all([
    db.grupo.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { nombre: "asc" },
      select: { id: true, organizationId: true, nombre: true, rut: true },
    }),
    db.owner.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        organizationId: true,
        nombre: true,
        rut: true,
        tipo: true,
        grupoId: true,
        properties: { select: { propertyId: true } },
      },
    }),
  ]);

  // Un grupo solo agrupa entidades de su mismo cliente: cada entidad ofrece los grupos del suyo.
  // En el formulario de crear (equipo) cada grupo lleva el nombre de su cliente.
  const grupoOpts = grupos.map((g) => ({
    id: g.id,
    nombre: nombreDe.has(g.organizationId) ? `${g.nombre} · ${nombreDe.get(g.organizationId)}` : g.nombre,
  }));
  const gruposDe = (orgId: string) =>
    grupos.filter((g) => g.organizationId === orgId).map((g) => ({ id: g.id, nombre: g.nombre }));

  // Resumen por grupo: nº de entidades y nº de propiedades distintas.
  const statsByGrupo = new Map<
    string,
    { entidades: number; propiedades: Set<string> }
  >();
  for (const g of grupos)
    statsByGrupo.set(g.id, { entidades: 0, propiedades: new Set() });
  for (const o of owners) {
    if (!o.grupoId) continue;
    const s = statsByGrupo.get(o.grupoId);
    if (!s) continue;
    s.entidades++;
    for (const p of o.properties) s.propiedades.add(p.propertyId);
  }

  const sinGrupo = owners.filter((o) => !o.grupoId).length;

  return (
    <>
      <PageHeader
        title="Dueños"
        description="Grupos económicos y las entidades legales (personas y sociedades) que los componen."
        action={clientes && <FiltroCliente clientes={clientes} actual={filtro} />}
      />

      <div className="space-y-10">
        {/* ---------------- Grupos económicos ---------------- */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Grupos económicos
          </h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <CreateGrupoForm clientes={clientes ?? undefined} />
              {grupos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay grupos. Crea uno y luego asigna entidades abajo.
                </p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {grupos.map((g) => {
                    const s = statsByGrupo.get(g.id)!;
                    return (
                      <div
                        key={g.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div>
                          <div className="font-medium">{g.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {nombreDe.has(g.organizationId) && `${nombreDe.get(g.organizationId)} · `}
                            {g.rut ? `RUT ${g.rut} · ` : ""}
                            {s.entidades}{" "}
                            {s.entidades === 1 ? "entidad" : "entidades"} ·{" "}
                            {s.propiedades.size}{" "}
                            {s.propiedades.size === 1
                              ? "propiedad"
                              : "propiedades"}
                          </div>
                        </div>
                        <DeleteGrupoButton grupoId={g.id} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ---------------- Entidades ---------------- */}
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Entidades
            </h2>
            {sinGrupo > 0 && (
              <span className="text-xs text-muted-foreground">
                {sinGrupo} sin grupo
              </span>
            )}
          </div>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Nueva entidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateOwnerForm grupos={grupoOpts} clientes={clientes ?? undefined} />
            </CardContent>
          </Card>

          {owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay entidades registradas. Se crean aquí o al agregar un dueño a
              una propiedad.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Propiedades</TableHead>
                    <TableHead>Grupo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {o.tipo === "SOCIEDAD" ? (
                            <Building2 className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <Users className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-medium">{o.nombre}</div>
                            <div className="text-xs text-muted-foreground">
                              {nombreDe.has(o.organizationId) && `${nombreDe.get(o.organizationId)} · `}
                              {o.rut}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ownerTypeLabels[o.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {o.properties.length}
                      </TableCell>
                      <TableCell>
                        <OwnerGrupoSelect
                          ownerId={o.id}
                          grupoId={o.grupoId}
                          grupos={gruposDe(o.organizationId)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
