// Operación: todo el trabajo abierto de la cartera en una pantalla.
// La página solo carga los datos (una consulta por bloque, ninguna dentro de
// un bucle) y los reparte a sus bloques, cada uno en su archivo.

import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { hoyChile, sumarDias } from "@/lib/fechas";
import { formatDate } from "@/lib/format";
import { TIPOS_SERVICIO, visitasUltimaSemana } from "@/lib/servicios";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/page-header";
import { Cifras } from "./cifras";
import { desdeCuando, type FilaServicio, type FilaVisita } from "./filas";
import { Filtros, SIN_RESPONSABLE, type Filtro } from "./filtros";
import { PorConfirmarTabla } from "./por-confirmar-tabla";
import { PorResponsable, type CuentaResponsable } from "./por-responsable";
import { PorTipoYEtapa } from "./por-tipo-y-etapa";
import { VisitasSemana } from "./visitas-semana";

function Seccion({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{ayuda}</p>
      {children}
    </section>
  );
}

// Un parámetro de la dirección puede venir repetido (`?a=1&a=2`): se toma el primero.
function primero(valor: string | string[] | undefined): string | null {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v ? v : null;
}

export default async function OperacionPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  // Un tipo que no existe se ignora en vez de romper la página.
  const tipoPedido = primero(sp.tipo);
  const tipo =
    tipoPedido && tipoPedido in TIPOS_SERVICIO
      ? (tipoPedido as ServicioTipo)
      : null;
  const filtro: Filtro = { tipo, responsable: primero(sp.responsable) };

  const orgId = await getOrgId();
  const hoy = hoyChile();

  // Lo que filtra por tipo y responsable, igual para los servicios y las visitas.
  const delServicio = {
    ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
    ...(filtro.responsable
      ? {
          responsableId:
            filtro.responsable === SIN_RESPONSABLE ? null : filtro.responsable,
        }
      : {}),
  };

  const [servicios, etapas, equipo, visitas] = await Promise.all([
    db.servicioEnCurso.findMany({
      where: { organizationId: orgId, estado: "ABIERTO", ...delServicio },
      select: {
        id: true,
        tipo: true,
        porConfirmar: true,
        abiertoEl: true,
        property: { select: { id: true, direccion: true, rolSII: true } },
        servicio: { select: { nombre: true } },
        etapa: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
        // Desde cuándo está en su etapa: el último cambio de etapa.
        eventos: {
          where: { tipo: "ETAPA" },
          orderBy: { fecha: "desc" },
          take: 1,
          select: { fecha: true },
        },
      },
    }),
    db.etapa.findMany({
      where: { organizationId: orgId },
      orderBy: [{ tipo: "asc" }, { orden: "asc" }],
      select: { id: true, tipo: true, nombre: true, activa: true },
    }),
    db.usuario.findMany({
      where: { organizationId: orgId, rol: "EQUIPO", activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    // Los últimos 7 días contando hoy (de hoy-6 a hoy): la misma ventana que usa
    // `visitasUltimaSemana`, que es la que cuenta la cifra de arriba.
    db.visita.findMany({
      where: {
        organizationId: orgId,
        fecha: { gte: sumarDias(hoy, -6), lte: hoy },
        servicioEnCurso: delServicio,
      },
      orderBy: { fecha: "desc" },
      select: {
        id: true,
        fecha: true,
        evaluacion: true,
        realizadaPor: { select: { nombre: true } },
        servicioEnCurso: {
          select: {
            id: true,
            tipo: true,
            property: { select: { id: true, direccion: true } },
          },
        },
      },
    }),
  ]);

  const filas: FilaServicio[] = servicios
    .map((s) => {
      // Un servicio recién abierto, sin cambios de etapa, cuenta desde que se abrió.
      const desde = desdeCuando(s.eventos[0]?.fecha ?? s.abiertoEl, hoy);
      return {
        id: s.id,
        propertyId: s.property.id,
        direccion: s.property.direccion,
        rol: s.property.rolSII,
        tipo: s.tipo,
        servicio: s.servicio.nombre,
        etapaId: s.etapa.id,
        etapa: s.etapa.nombre,
        responsableId: s.responsable?.id ?? null,
        responsable: s.responsable?.nombre ?? null,
        desde: desde.texto,
        desdeDias: desde.dias,
        porConfirmar: s.porConfirmar,
      };
    })
    // Dentro de cada etapa, primero los que llevan más tiempo esperando.
    .sort((a, b) => b.desdeDias - a.desdeDias);

  const filasVisita: FilaVisita[] = visitas.map((v) => ({
    id: v.id,
    fecha: formatDate(v.fecha),
    propertyId: v.servicioEnCurso.property.id,
    servicioId: v.servicioEnCurso.id,
    direccion: v.servicioEnCurso.property.direccion,
    tipo: v.servicioEnCurso.tipo,
    hechaPor: v.realizadaPor?.nombre ?? null,
    evaluacion: v.evaluacion,
  }));

  // Cuántos abiertos lleva cada persona. Primero el equipo activo (aunque tenga 0),
  // y después quien lleva servicios sin estar ya activo, para que la suma cuadre.
  const nombres = new Map(equipo.map((u) => [u.id, u.nombre]));
  for (const f of filas) {
    if (f.responsableId && f.responsable) nombres.set(f.responsableId, f.responsable);
  }
  const cuentas: CuentaResponsable[] = [...nombres]
    .map(([id, nombre]) => ({
      clave: id,
      nombre,
      abiertos: filas.filter((f) => f.responsableId === id).length,
    }))
    .sort((a, b) => b.abiertos - a.abiertos || a.nombre.localeCompare(b.nombre, "es"));
  cuentas.push({
    clave: SIN_RESPONSABLE,
    nombre: "Sin responsable",
    abiertos: filas.filter((f) => f.responsableId === null).length,
  });
  // Con un responsable elegido, solo se muestra su fila.
  const cuentasVisibles = filtro.responsable
    ? cuentas.filter((c) => c.clave === filtro.responsable)
    : cuentas;

  const porConfirmar = filas.filter((f) => f.porConfirmar);

  return (
    <>
      <PageHeader
        title="Operación"
        description="Todo el trabajo abierto de la cartera: por tipo y etapa, por responsable y lo que falta confirmar."
      />

      <Filtros filtro={filtro} responsables={equipo} />

      <Cifras
        abiertos={filas.length}
        porConfirmar={porConfirmar.length}
        sinResponsable={filas.filter((f) => f.responsableId === null).length}
        visitasSemana={visitasUltimaSemana(visitas, hoy)}
      />

      <Seccion
        titulo="Por tipo y etapa"
        ayuda="Cuántos servicios abiertos hay en cada etapa. Toca una etapa para ver cuáles son."
      >
        <PorTipoYEtapa etapas={etapas} filas={filas} />
      </Seccion>

      <Seccion
        titulo="Por responsable"
        ayuda="Cuántos servicios abiertos lleva cada persona."
      >
        <PorResponsable cuentas={cuentasVisibles} />
      </Seccion>

      <Seccion
        titulo="Por confirmar"
        ayuda="Servicios que la carga inicial dedujo de las carpetas del Drive. El equipo tiene que revisar cada uno."
      >
        {porConfirmar.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay servicios por confirmar.
          </p>
        ) : (
          <PorConfirmarTabla data={porConfirmar} />
        )}
      </Seccion>

      <Seccion
        titulo="Visitas de la semana"
        ayuda="Las de los últimos 7 días, de más reciente a más antigua."
      >
        <VisitasSemana visitas={filasVisita} />
      </Seccion>
    </>
  );
}
