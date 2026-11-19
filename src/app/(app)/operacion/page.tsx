// Operación: el trabajo de Proges con TODOS los clientes en una pantalla.
// Arriba, la bandeja de solicitudes nuevas; después, lo abierto por tipo y etapa, por
// responsable, lo que falta confirmar y las visitas de la semana.
// La página solo carga los datos (una consulta por bloque, ninguna dentro de un bucle,
// todas desde `src/lib/operacion.ts`, que es lo único que cruza clientes) y los reparte
// a sus bloques, cada uno en su archivo.

import { exigirEquipo } from "@/lib/sesion";
import {
  SIN_RESPONSABLE,
  catalogoParaAceptar,
  clientesDeOperacion,
  equipoActivo,
  etapasDeProges,
  serviciosAbiertos,
  solicitudesNuevas,
  visitasDeLaSemana,
} from "@/lib/operacion";
import { hoyChile } from "@/lib/fechas";
import { formatDate } from "@/lib/format";
import { TIPOS_SERVICIO, visitasUltimaSemana } from "@/lib/servicios";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/page-header";
import { Cifras } from "./cifras";
import { desdeCuando, type FilaServicio, type FilaVisita } from "./filas";
import { Filtros, type Filtro } from "./filtros";
import { PorConfirmarTabla } from "./por-confirmar-tabla";
import { PorResponsable, type CuentaResponsable } from "./por-responsable";
import { PorTipoYEtapa } from "./por-tipo-y-etapa";
import { SolicitudesBandeja } from "./solicitudes-bandeja";
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
  // Solo el equipo entra acá: un cliente vuelve al inicio.
  await exigirEquipo();

  const sp = await searchParams;
  // Un tipo que no existe se ignora en vez de romper la página.
  const tipoPedido = primero(sp.tipo);
  const tipo =
    tipoPedido && tipoPedido in TIPOS_SERVICIO
      ? (tipoPedido as ServicioTipo)
      : null;
  const filtro: Filtro = {
    tipo,
    responsable: primero(sp.responsable),
    cliente: primero(sp.cliente),
  };

  const hoy = hoyChile();
  const clientes = await clientesDeOperacion();
  // Un cliente del filtro que no existe o está desactivado se ignora.
  if (filtro.cliente && !clientes.some((c) => c.id === filtro.cliente)) filtro.cliente = null;
  const nombreCliente = new Map(clientes.map((c) => [c.id, c.nombre]));

  const [solicitudes, catalogo, servicios, etapas, equipo, visitas] = await Promise.all([
    solicitudesNuevas(),
    catalogoParaAceptar(),
    serviciosAbiertos(filtro, clientes),
    etapasDeProges(),
    equipoActivo(),
    visitasDeLaSemana(filtro, clientes, hoy),
  ]);

  const filas: FilaServicio[] = servicios
    .map((s) => {
      // Un servicio recién abierto, sin cambios de etapa, cuenta desde que se abrió.
      const desde = desdeCuando(s.eventos[0]?.fecha ?? s.abiertoEl, hoy);
      return {
        id: s.id,
        clienteId: s.organizationId,
        cliente: nombreCliente.get(s.organizationId) ?? "",
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
    clienteId: v.organizationId,
    cliente: nombreCliente.get(v.organizationId) ?? "",
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
        description="El trabajo de todos los clientes: las solicitudes nuevas, y lo abierto por tipo y etapa, por responsable y lo que falta confirmar."
      />

      <Seccion
        titulo="Solicitudes nuevas"
        ayuda="Pedidos de los clientes que esperan respuesta. Aceptar abre el servicio en la cartera del cliente; rechazar pide un motivo."
      >
        <SolicitudesBandeja
          solicitudes={solicitudes}
          catalogo={catalogo}
          responsables={equipo}
        />
      </Seccion>

      <Filtros filtro={filtro} clientes={clientes} responsables={equipo} />

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
