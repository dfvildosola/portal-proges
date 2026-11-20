// El Inicio del equipo, armado en una sola llamada: cifras, lo nuevo, lo trabado, la carga de
// cada persona y las últimas notas con foto. Recibe los espacios que la ruta ya sacó de
// espaciosQueLee y «hoy» como parámetro.
import { db } from "@proges/db";
import type { InicioEquipo } from "@proges/contrato";
import { aFechaHoraISO, aFechaISO } from "../../util/al-contrato";
import { equipoActivo, clientesPorId, filasDelTablero, tareasAbiertas } from "./consultas";
import { seleccionNota } from "./selecciones";
import { agruparTablero, esperandoMasDeLoNormal, type TableroAgrupado } from "./tablero";
import { cargaDelEquipo, clasificarPorSemana } from "./tareas";

const MAX_NUEVOS = 50;
const MAX_TAREAS_ATRASADAS = 30;
const NOTAS_CON_FOTO = 5;

// Las cinco cifras de arriba del Inicio. Pura: parte de los grupos del tablero.
export function cifrasDelInicio(g: TableroAgrupado, tareasAtrasadas: number): InicioEquipo["cifras"] {
  return {
    serviciosEnCurso: g.nosToca.length + g.esperando.length + g.porEntregar.length,
    nuevosSinRepartir: g.nuevo.length,
    esperando: g.esperando.length,
    esperandoMasDe10Dias: esperandoMasDeLoNormal(g.esperando).length,
    tareasAtrasadas,
  };
}

export async function armarInicio(orgIds: string[], hoy: Date): Promise<InicioEquipo> {
  const [filas, abiertas, equipo, presupuestosPorAprobar, notas] = await Promise.all([
    filasDelTablero(orgIds, {}, hoy),
    tareasAbiertas(orgIds),
    equipoActivo(),
    // Solo se cuentan: el detalle del presupuesto (el costo del maestro) no sale en el Inicio.
    db.presupuestoMaestro.count({
      where: { organizationId: { in: orgIds }, estado: "RECIBIDO", servicioEnCurso: { estado: "ABIERTO" } },
    }),
    db.nota.findMany({
      where: { organizationId: { in: orgIds }, fotos: { some: {} } },
      orderBy: { createdAt: "desc" },
      take: NOTAS_CON_FOTO,
      select: {
        ...seleccionNota,
        servicioEnCurso: {
          select: {
            id: true,
            tipo: true,
            servicio: { select: { nombre: true } },
            property: { select: { id: true, direccion: true, comuna: true } },
          },
        },
      },
    }),
  ]);

  const grupos = agruparTablero(filas);
  // Las más atrasadas primero: clasificarPorSemana ordena por fecha de vencimiento.
  const atrasadas = clasificarPorSemana(abiertas, hoy).atrasadas;
  const clienteDe = await clientesPorId(notas.map((n) => n.organizationId));

  return {
    fecha: aFechaISO(hoy),
    cifras: cifrasDelInicio(grupos, atrasadas.length),
    nuevo: grupos.nuevo.slice(0, MAX_NUEVOS),
    trabado: {
      esperandoMasDe10Dias: esperandoMasDeLoNormal(grupos.esperando),
      tareasAtrasadas: atrasadas.slice(0, MAX_TAREAS_ATRASADAS).map((t) => t.contrato),
      presupuestosPorAprobar,
    },
    carga: cargaDelEquipo(equipo, abiertas, hoy),
    ultimasNotasConFoto: notas.map((n) => ({
      id: n.id,
      texto: n.texto,
      creadaEl: aFechaHoraISO(n.createdAt),
      autor: { id: n.autor.id, nombre: n.autor.nombre },
      servicio: { id: n.servicioEnCurso.id, tipo: n.servicioEnCurso.tipo, nombre: n.servicioEnCurso.servicio.nombre },
      propiedad: n.servicioEnCurso.property,
      cliente: clienteDe(n.organizationId),
      fotos: n.fotos.map((f) => ({ id: f.id, nombre: f.nombre })),
    })),
  };
}
