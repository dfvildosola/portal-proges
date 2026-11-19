// «Mis servicios»: lo que el cliente le ha pedido a Proges y en qué va cada servicio.
// Es solo para usuarios de un cliente; el equipo tiene su propia pantalla (Trabajo del equipo).
//
// Arriba, los pedidos (Solicitud): por revisar, aceptados o rechazados. Abajo, los servicios
// abiertos (los «por revisar» todavía no cuentan: se ven arriba, como pedido). Las consultas traen solo lo que el cliente puede ver: nada del
// interesado, del oferente ni del responsable.

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { espaciosQueLee } from "@/lib/org";
import { exigirUsuario } from "@/lib/sesion";
import { PageHeader } from "@/components/page-header";
import { PedirServicioConSelector } from "../propiedades/[id]/solicitud-form";
import { MisPedidos } from "./mis-pedidos";
import { ServiciosEnCurso } from "./servicios-en-curso";

export default async function MisServiciosPage() {
  const usuario = await exigirUsuario();
  // Un integrante del equipo no tiene «mis servicios»: su vista es Trabajo del equipo.
  if (usuario.rol !== "CLIENTE") redirect("/operacion");

  // Para un cliente es solo su espacio.
  const orgIds = await espaciosQueLee();

  const [pedidos, servicios, propiedades] = await Promise.all([
    db.solicitud.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tipo: true,
        descripcion: true,
        estado: true,
        motivoRechazo: true,
        createdAt: true,
        servicioEnCursoId: true,
        property: { select: { id: true, direccion: true, comuna: true } },
      },
    }),
    // Los «por confirmar» vienen de la carga inicial y todavía no están confirmados por Proges;
    // los «por revisar» nacieron de un pedido y la jefatura aún no los reparte.
    db.servicioEnCurso.findMany({
      where: {
        organizationId: { in: orgIds },
        estado: "ABIERTO",
        porConfirmar: false,
        porRevisar: false,
      },
      orderBy: { abiertoEl: "desc" },
      select: {
        id: true,
        tipo: true,
        servicio: { select: { nombre: true } },
        etapa: { select: { nombre: true } },
        property: { select: { id: true, direccion: true, comuna: true } },
      },
    }),
    db.property.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { direccion: "asc" },
      select: { id: true, direccion: true, comuna: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Mis servicios"
        description="Lo que le has pedido a Proges y en qué va cada servicio."
        action={
          <PedirServicioConSelector
            propiedades={propiedades.map((p) => ({
              id: p.id,
              nombre: `${p.direccion}, ${p.comuna}`,
            }))}
          />
        }
      />
      <MisPedidos pedidos={pedidos} />
      <ServiciosEnCurso servicios={servicios} />
    </>
  );
}
