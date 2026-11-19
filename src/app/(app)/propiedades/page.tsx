import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { hoyChile } from "@/lib/fechas";
import { clientesParaElegir, espaciosQueLee, nombresPorId } from "@/lib/org";
import { FiltroCliente } from "@/components/filtro-cliente";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { PropertiesTable, type PropertyRow } from "./properties-table";

// Lo que el equipo necesita ver de cada propiedad para saber dónde hay trabajo: sus proyectos
// abiertos, sus tareas abiertas (y cuántas están atrasadas), la última novedad y si Proges
// administra su arriendo. Se calcula en una sola pasada, con consultas por espacio (nunca por
// propiedad), para que la lista no haga una consulta por fila.
type TrabajoDePropiedad = {
  proyectosAbiertos: number;
  tareasAbiertas: number;
  tareasAtrasadas: number;
  ultimaNovedad: Date | null;
  enAdministracion: boolean;
};

function trabajoVacio(): TrabajoDePropiedad {
  return {
    proyectosAbiertos: 0,
    tareasAbiertas: 0,
    tareasAtrasadas: 0,
    ultimaNovedad: null,
    enAdministracion: false,
  };
}

// Carga todo el trabajo en curso y su historial de una vez. Con cientos de propiedades no pesa;
// si la lista se pone lenta, hay que agrupar en SQL por propiedad.
async function trabajoPorPropiedad(orgIds: string[], hoy: Date) {
  const porPropiedad = new Map<string, TrabajoDePropiedad>();
  const de = (propertyId: string) => {
    let t = porPropiedad.get(propertyId);
    if (!t) {
      t = trabajoVacio();
      porPropiedad.set(propertyId, t);
    }
    return t;
  };

  const [servicios, tareas, notas, eventos, administraciones] = await Promise.all([
    db.servicioEnCurso.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true, propertyId: true, estado: true },
    }),
    // Igual que «Mi trabajo»: una tarea de un proyecto ya cerrado no es trabajo pendiente.
    db.tarea.findMany({
      where: {
        organizationId: { in: orgIds },
        hechaEl: null,
        servicioEnCurso: { estado: "ABIERTO" },
      },
      select: { vence: true, servicioEnCurso: { select: { propertyId: true } } },
    }),
    db.nota.groupBy({
      by: ["servicioEnCursoId"],
      where: { organizationId: { in: orgIds } },
      _max: { createdAt: true },
    }),
    db.evento.groupBy({
      by: ["servicioEnCursoId"],
      where: { organizationId: { in: orgIds } },
      _max: { fecha: true },
    }),
    // «En administración» = sin fecha de término, o con término que aún no pasa (como M).
    db.administracion.findMany({
      where: {
        organizationId: { in: orgIds },
        OR: [{ hasta: null }, { hasta: { gte: hoy } }],
      },
      select: { propertyId: true },
    }),
  ]);

  const propiedadDelServicio = new Map<string, string>();
  for (const s of servicios) {
    propiedadDelServicio.set(s.id, s.propertyId);
    if (s.estado === "ABIERTO") de(s.propertyId).proyectosAbiertos += 1;
  }
  for (const t of tareas) {
    const trabajo = de(t.servicioEnCurso.propertyId);
    trabajo.tareasAbiertas += 1;
    // Atrasada: venció antes de hoy (la misma regla que agruparTareas).
    if (t.vence && t.vence < hoy) trabajo.tareasAtrasadas += 1;
  }
  const anotarNovedad = (servicioId: string, fecha: Date | null) => {
    const propertyId = propiedadDelServicio.get(servicioId);
    if (!propertyId || !fecha) return;
    const trabajo = de(propertyId);
    if (!trabajo.ultimaNovedad || fecha > trabajo.ultimaNovedad) trabajo.ultimaNovedad = fecha;
  };
  for (const n of notas) anotarNovedad(n.servicioEnCursoId, n._max.createdAt);
  for (const e of eventos) anotarNovedad(e.servicioEnCursoId, e._max.fecha);
  for (const a of administraciones) de(a.propertyId).enAdministracion = true;

  return porPropiedad;
}

export default async function PropiedadesPage({
  searchParams,
}: PageProps<"/propiedades">) {
  const sp = await searchParams;
  // El equipo ve todos los clientes juntos y puede filtrar por uno (?cliente=).
  const filtro = typeof sp.cliente === "string" ? sp.cliente : null;
  const clientes = await clientesParaElegir();
  const nombreDe = nombresPorId(clientes);
  // Solo el equipo tiene la vista «con trabajo en curso» (clientes !== null).
  const esEquipo = clientes !== null;
  const verTodas = sp.todas === "1";
  const hoy = hoyChile();
  const orgIds = await espaciosQueLee(filtro);

  const [properties, trabajo] = await Promise.all([
    db.property.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { createdAt: "desc" },
    }),
    esEquipo
      ? trabajoPorPropiedad(orgIds, hoy)
      : Promise.resolve(new Map<string, TrabajoDePropiedad>()),
  ]);

  // Aplanamos a una forma serializable (Decimal/Date no cruzan a Client Components).
  const todas: PropertyRow[] = properties.map((p) => {
    const t = trabajo.get(p.id) ?? trabajoVacio();
    return {
      id: p.id,
      rolSII: p.rolSII ?? "Sin ROL",
      tipo: p.tipo,
      direccion: p.direccion,
      edificio: p.edificio ?? "",
      comuna: p.comuna,
      region: p.region,
      objetivo: p.objetivo,
      estado: p.estado,
      monedaPrincipal: p.monedaPrincipal,
      valorComercial: p.valorComercial ? Number(p.valorComercial) : null,
      valorComercialMoneda: p.valorComercialMoneda,
      createdAt: p.createdAt.toISOString(),
      clienteNombre: nombreDe.get(p.organizationId) ?? "",
      proyectosAbiertos: t.proyectosAbiertos,
      tareasAbiertas: t.tareasAbiertas,
      tareasAtrasadas: t.tareasAtrasadas,
      ultimaNovedad: t.ultimaNovedad?.toISOString() ?? "",
      enAdministracion: t.enAdministracion,
    };
  });

  // Por defecto el equipo ve solo donde hay trabajo en curso: un proyecto abierto o una tarea
  // abierta. «Todas» (?todas=1) muestra la cartera completa.
  const conTrabajo = (r: PropertyRow) => r.proyectosAbiertos > 0 || r.tareasAbiertas > 0;
  const filtraPorTrabajo = esEquipo && !verTodas;
  const rows = filtraPorTrabajo ? todas.filter(conTrabajo) : todas;

  // Los enlaces del interruptor conservan el filtro de cliente.
  const hrefVista = (todasLasPropiedades: boolean) => {
    const params = new URLSearchParams();
    if (filtro) params.set("cliente", filtro);
    if (todasLasPropiedades) params.set("todas", "1");
    const texto = params.toString();
    return texto ? `/propiedades?${texto}` : "/propiedades";
  };

  return (
    <>
      <PageHeader
        title="Propiedades"
        description={
          esEquipo
            ? "La cartera de todos los clientes. Cada propiedad abre su ficha con su historial, documentos, contrato, económico y alertas."
            : "Tu cartera. Cada propiedad abre su ficha con documentos, contrato, económico y alertas."
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {clientes && <FiltroCliente clientes={clientes} actual={filtro} />}
            <Button nativeButton={false} render={<Link href="/propiedades/nueva" />}>
              <Plus className="size-4" />
              Nueva propiedad
            </Button>
          </div>
        }
      />

      {esEquipo && todas.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={filtraPorTrabajo ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={hrefVista(false)} />}
          >
            Con trabajo en curso ({todas.filter(conTrabajo).length})
          </Button>
          <Button
            size="sm"
            variant={filtraPorTrabajo ? "outline" : "default"}
            nativeButton={false}
            render={<Link href={hrefVista(true)} />}
          >
            Todas ({todas.length})
          </Button>
        </div>
      )}

      {todas.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Todavía no hay propiedades"
          description="Crea la primera propiedad para empezar a cargar tu cartera."
          action={
            <Button nativeButton={false} render={<Link href="/propiedades/nueva" />}>
              <Plus className="size-4" />
              Nueva propiedad
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hay propiedades con trabajo en curso"
          description="Ninguna propiedad tiene un proyecto abierto ni tareas por hacer."
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={hrefVista(true)} />}
            >
              Ver todas las propiedades
            </Button>
          }
        />
      ) : (
        <PropertiesTable data={rows} mostrarCliente={esEquipo} />
      )}
    </>
  );
}
