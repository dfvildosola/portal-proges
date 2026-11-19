import Link from "next/link";
import { ComercialPanel } from "../../comercial-panel";
import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId, ORG_PROGES } from "@/lib/org";
import { usuarioActual } from "@/lib/sesion";
import { servicioParaCliente } from "@/lib/vista-cliente";
import { formatDate } from "@/lib/format";
import { NOMBRES_ESTADO, TIPOS_SERVICIO, diaChile, esComercial } from "@/lib/servicios";
import { BackLink } from "@/components/back-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoverEtapaForm } from "./servicio-mover";
import { ConfirmarBoton, DetalleForm } from "./servicio-detalle";
import { CancelarDialogo } from "./servicio-cancelar";
import { ServicioHistorial } from "./servicio-historial";
import { ServicioCliente } from "./servicio-cliente";

// Página de un servicio en curso. El EQUIPO ve su encabezado, las acciones (mientras está
// abierto) y su historial de cambios, en el cliente activo. El CLIENTE ve una versión de solo
// lectura con lo que deja ver `src/lib/vista-cliente.ts`.
export default async function ServicioPage({
  params,
}: PageProps<"/propiedades/[id]/servicios/[sid]">) {
  const { id, sid } = await params;
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");

  if (usuario.rol === "CLIENTE") {
    const delCliente = await servicioParaCliente(usuario, sid);
    // Si el servicio no es suyo, o no es de esa propiedad, responde como si no existiera.
    if (!delCliente || delCliente.propiedad.id !== id) notFound();
    return <ServicioCliente servicio={delCliente} />;
  }

  const orgId = await getOrgId();

  // Se busca por id, propiedad y organización: un servicio de otra propiedad da 404.
  const s = await db.servicioEnCurso.findFirst({
    where: { id: sid, propertyId: id, organizationId: orgId },
    include: {
      property: { select: { direccion: true, comuna: true } },
      servicio: { select: { codigo: true, nombre: true } },
      etapa: { select: { id: true, nombre: true } },
      responsable: { select: { nombre: true } },
      eventos: {
        orderBy: { fecha: "desc" },
        select: {
          id: true,
          tipo: true,
          anterior: true,
          nuevo: true,
          moneda: true,
          origen: true,
          motivo: true,
          fecha: true,
          autor: { select: { nombre: true } },
        },
      },
    },
  });
  if (!s) notFound();

  const abierto = s.estado === "ABIERTO";

  // Solo se necesitan las etapas y las personas si hay acciones que mostrar.
  const [etapas, responsables] = abierto
    ? await Promise.all([
        db.etapa.findMany({
          // Las etapas son de Proges, comunes a todos los clientes.
          where: { organizationId: ORG_PROGES, tipo: s.tipo, activa: true },
          orderBy: { orden: "asc" },
          select: { id: true, nombre: true, cierraServicio: true },
        }),
        db.usuario.findMany({
          // El equipo vive en el espacio de Proges.
          where: { organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true },
        }),
      ])
    : [[], []];

  const desde = formatDate(diaChile(s.abiertoEl));
  const hasta = s.cerradoEl ? formatDate(diaChile(s.cerradoEl)) : null;

  return (
    <>
      <BackLink href={`/propiedades/${id}?pestana=servicios`}>Volver a la propiedad</BackLink>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{TIPOS_SERVICIO[s.tipo].nombre}</Badge>
          <Badge variant={abierto ? "info" : s.estado === "TERMINADO" ? "success" : "outline"}>
            {NOMBRES_ESTADO[s.estado]}
          </Badge>
          {s.porConfirmar && <Badge variant="warning">Por confirmar</Badge>}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-muted-foreground">{s.servicio.codigo}</span> · {s.servicio.nombre}
        </h1>
        <p className="text-sm text-muted-foreground">
          Propiedad:{" "}
          <Link href={`/propiedades/${id}`} className="text-foreground underline-offset-4 hover:underline">
            {s.property.direccion}
            {s.property.comuna ? `, ${s.property.comuna}` : ""}
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span>
            Etapa actual: <span className="font-medium">{s.etapa.nombre}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-4 text-muted-foreground" />
            {s.responsable ? s.responsable.nombre : "Sin responsable"}
          </span>
          <span className="text-muted-foreground">
            {hasta ? `Del ${desde} al ${hasta}` : `Abierto el ${desde}`}
          </span>
        </div>
        {s.nota && <p className="text-sm text-muted-foreground">Nota: {s.nota}</p>}
        {!abierto && s.motivoCierre && (
          <p className="text-sm">
            <span className="text-muted-foreground">
              {s.estado === "CANCELADO" ? "Motivo de la cancelación: " : "Nota del cierre: "}
            </span>
            {s.motivoCierre}
          </p>
        )}
      </div>

      <div className="space-y-6">
        {esComercial(s.tipo) && (
          <ComercialPanel servicioId={s.id} />
        )}

        {abierto && (
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <Card>
              <CardHeader>
                <CardTitle>Mover de etapa</CardTitle>
              </CardHeader>
              <CardContent>
                <MoverEtapaForm
                  propertyId={id}
                  servicioId={s.id}
                  etapas={etapas.filter((e) => e.id !== s.etapa.id)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsable y nota</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <DetalleForm
                  propertyId={id}
                  servicioId={s.id}
                  responsableId={s.responsableId}
                  nota={s.nota}
                  responsables={responsables}
                />
                {s.porConfirmar && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Este servicio se dedujo de la carpeta del Drive. Confírmalo cuando alguien
                      del equipo lo haya revisado.
                    </p>
                    <ConfirmarBoton propertyId={id} servicioId={s.id} />
                  </div>
                )}
                <div className="border-t pt-4">
                  <CancelarDialogo propertyId={id} servicioId={s.id} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <ServicioHistorial eventos={s.eventos} />
      </div>
    </>
  );
}
