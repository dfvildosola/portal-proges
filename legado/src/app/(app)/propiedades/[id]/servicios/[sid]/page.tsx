import Link from "next/link";
import { ComercialPanel } from "../../comercial-panel";
import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { espaciosQueLee, ORG_PROGES } from "@/lib/org";
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
import { TareasSeccion } from "./tareas-seccion";
import { BitacoraSeccion } from "./bitacora-seccion";
import { VentaResumen } from "./venta-resumen";
import { ObraOrden } from "./obra-orden";
import { ObraAvance } from "./obra-avance";
import { ObraPresupuestos } from "./obra-presupuestos";
import { ObraFacturas } from "./obra-facturas";
import { ObraCuentas } from "./obra-cuentas";
import { ObraRecepcion } from "./obra-recepcion";
import { ObraCierre } from "./obra-cierre";

// Página de un proyecto (un ServicioEnCurso). Para el EQUIPO es una mesa de trabajo, de arriba
// hacia abajo: la cabecera; lo que hay que hacer (tareas) y lo que pasó (bitácora); lo comercial si
// es venta o arriendo; la obra (orden, avance, presupuestos, facturas, cuentas, recepción, cierre);
// y al final la etapa, el responsable y el historial de siempre. El CLIENTE ve una versión de solo
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

  // Se busca por id, propiedad y espacios que se pueden leer: un servicio de otra propiedad o de
  // un cliente que no se puede leer da 404.
  const s = await db.servicioEnCurso.findFirst({
    where: { id: sid, propertyId: id, organizationId: { in: await espaciosQueLee() } },
    include: {
      property: { select: { direccion: true, comuna: true } },
      servicio: { select: { codigo: true, nombre: true } },
      orden: { select: { numero: true } },
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

  // El cliente dueño de la propiedad (el equipo ve a todos juntos, así que se dice de quién es).
  // Y cuántas partidas vigentes traen recinto: eso decide qué secciones de obra salen.
  const [cliente, conRecinto] = await Promise.all([
    db.organizacion.findUnique({ where: { id: s.organizationId }, select: { nombre: true } }),
    db.partida.count({
      where: {
        servicioEnCursoId: s.id,
        organizationId: s.organizationId,
        quitadaEnOdoo: false,
        recinto: { not: null },
      },
    }),
  ]);

  // Qué secciones de obra se muestran:
  //  - una OBRA, o cualquier proyecto con una orden que tiene recintos: la obra completa;
  //  - un servicio suelto (orden sin recintos, que no es OBRA): basta la orden y el avance;
  //  - sin orden y sin ser obra: solo la orden, que trae el formulario para enlazarla después
  //    (los comerciales no llevan orden: no se les ofrece).
  const tieneOrden = s.orden !== null;
  const esObra = s.tipo === "OBRA" || conRecinto > 0;
  const esSuelto = tieneOrden && !esObra;
  const comercial = esComercial(s.tipo);
  const muestraOrden = tieneOrden || !comercial;
  const porCotizar = !tieneOrden && !comercial && !s.porRevisar;

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
          {s.porRevisar && <Badge variant="warning">Por revisar</Badge>}
          {porCotizar && <Badge variant="outline">Por cotizar</Badge>}
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
          {cliente && <span> · Cliente: {cliente.nombre}</span>}
        </p>
        {s.porRevisar && (
          <p className="text-sm text-muted-foreground">
            Nació de un pedido del cliente. La jefatura lo revisa y lo reparte en{" "}
            <Link href="/operacion" className="text-foreground underline-offset-4 hover:underline">
              Trabajo del equipo
            </Link>
            .
          </p>
        )}
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
        <TareasSeccion servicioEnCursoId={s.id} />
        <BitacoraSeccion servicioEnCursoId={s.id} />

        {comercial && (
          <>
            <VentaResumen servicioEnCursoId={s.id} />
            <ComercialPanel servicioId={s.id} />
          </>
        )}

        {muestraOrden && <ObraOrden servicioEnCursoId={s.id} />}
        {(esObra || esSuelto) && <ObraAvance servicioEnCursoId={s.id} />}
        {esObra && (
          <>
            <ObraPresupuestos servicioEnCursoId={s.id} />
            <ObraFacturas servicioEnCursoId={s.id} />
            <ObraCuentas servicioEnCursoId={s.id} />
            <ObraRecepcion servicioEnCursoId={s.id} />
            <ObraCierre servicioEnCursoId={s.id} />
          </>
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
