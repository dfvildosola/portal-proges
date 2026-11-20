// De lo que guarda la base a lo que dice el contrato, campo por campo. Es el «recorte» de la
// regla de oro (LEEME.md): lo que sale hacia un dueño o una llave se arma con las funciones
// «…Dueno» de este archivo, que NUNCA incluyen al responsable, las tareas ni las notas internas.
// Cada función arma un objeto nuevo listando lo que sí sale; ninguna copia el registro entero.
import type { PropertyType, EsperandoA, ServicioEstado, ServicioTipo, SolicitudEstado } from "@proges/db";
import type * as contrato from "@proges/contrato";
import { aFechaHoraISO, aFechaISO } from "../../util/al-contrato";
import { esperaDeEvento, esperandoDe } from "./espera";
import type {
  FichaDuenoDeBase,
  FichaEquipoDeBase,
  FilaDeServicio,
  NotaDeBase,
  PedidoDeBase,
  TareaConServicioDeBase,
  TareaDeBase,
} from "./selecciones";

// Las listas del contrato tienen que calzar exacto con los enums de la base: si alguien agrega un
// valor en un lado y no en el otro, `npm run tipos` falla aquí.
type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const tiposCalzan: Iguales<ServicioTipo, contrato.ServicioTipo> = true;
const estadosCalzan: Iguales<ServicioEstado, contrato.ServicioEstado> = true;
const esperaCalza: Iguales<EsperandoA, contrato.EsperandoA> = true;
const solicitudCalza: Iguales<SolicitudEstado, contrato.SolicitudEstado> = true;
const propiedadCalza: Iguales<PropertyType, contrato.PedidoTipoPropiedad> = true;
void [tiposCalzan, estadosCalzan, esperaCalza, solicitudCalza, propiedadCalza];

export type NombreDeCliente = { id: string; nombre: string };

const propiedad = (p: { id: string; direccion: string; comuna: string }): contrato.TrabajoPropiedad => ({
  id: p.id,
  direccion: p.direccion,
  comuna: p.comuna,
});

const persona = (p: { id: string; nombre: string } | null): contrato.TrabajoPersona | null =>
  p ? { id: p.id, nombre: p.nombre } : null;

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

const fotosDe = (n: NotaDeBase): contrato.FotoDeNota[] => n.fotos.map((f) => ({ id: f.id, nombre: f.nombre }));

export function notaParaDueno(n: NotaDeBase): contrato.NotaDueno {
  return { id: n.id, texto: n.texto, creadaEl: aFechaHoraISO(n.createdAt), fotos: fotosDe(n) };
}

export function notaParaEquipo(n: NotaDeBase): contrato.NotaEquipo {
  return {
    ...notaParaDueno(n),
    paraDueno: n.paraDueno,
    autor: { id: n.autor.id, nombre: n.autor.nombre },
    tareaId: n.tareaId,
  };
}

// ---------------------------------------------------------------------------
// Tareas (solo salen hacia el equipo)
// ---------------------------------------------------------------------------

export function tareaAContrato(t: TareaDeBase): contrato.Tarea {
  return {
    id: t.id,
    que: t.que,
    responsable: persona(t.responsable),
    vence: t.vence ? aFechaISO(t.vence) : null,
    hecha: t.hechaEl !== null,
    hechaEl: t.hechaEl ? aFechaHoraISO(t.hechaEl) : null,
    hechaPor: persona(t.hechaPor),
    esRevision: t.esRevision,
    creadaEl: aFechaHoraISO(t.createdAt),
  };
}

export function tareaConServicio(t: TareaConServicioDeBase, cliente: NombreDeCliente): contrato.TareaConServicio {
  return {
    ...tareaAContrato(t),
    servicio: { id: t.servicioEnCurso.id, tipo: t.servicioEnCurso.tipo, nombre: t.servicioEnCurso.servicio.nombre },
    propiedad: propiedad(t.servicioEnCurso.property),
    cliente,
  };
}

// ---------------------------------------------------------------------------
// Servicios
// ---------------------------------------------------------------------------

export function filaParaDueno(s: FilaDeServicio, hoy: Date): contrato.ServicioFila {
  return {
    id: s.id,
    tipo: s.tipo,
    nombre: s.servicio.nombre,
    estado: s.estado,
    propiedad: propiedad(s.property),
    abiertoEl: aFechaISO(s.abiertoEl),
    cerradoEl: s.cerradoEl ? aFechaISO(s.cerradoEl) : null,
    esperando: esperandoDe(s, hoy),
  };
}

export function filaParaEquipo(s: FilaDeServicio, hoy: Date, cliente: NombreDeCliente): contrato.ServicioFilaEquipo {
  return {
    ...filaParaDueno(s, hoy),
    cliente,
    responsable: persona(s.responsable),
    porRevisar: s.porRevisar,
    porConfirmar: s.porConfirmar,
  };
}

export function itemDelTablero(
  s: FilaDeServicio,
  hoy: Date,
  cliente: NombreDeCliente,
  tareasPendientes: number,
): contrato.ServicioTableroItem {
  return {
    id: s.id,
    tipo: s.tipo,
    nombre: s.servicio.nombre,
    propiedad: propiedad(s.property),
    cliente,
    responsable: persona(s.responsable),
    esperando: esperandoDe(s, hoy),
    tareasPendientes,
    abiertoEl: aFechaISO(s.abiertoEl),
  };
}

export function servicioParaDueno(s: FichaDuenoDeBase, hoy: Date): contrato.ServicioDueno {
  return { ...filaParaDueno(s, hoy), notas: s.notas.map(notaParaDueno) };
}

// Las abiertas primero (por fecha, sin fecha al final) y después las hechas (la más reciente primero).
function ordenarTareas(tareas: TareaDeBase[]): TareaDeBase[] {
  const abiertas = tareas.filter((t) => !t.hechaEl).sort((a, b) => {
    if (a.vence && b.vence) return a.vence.getTime() - b.vence.getTime();
    return a.vence ? -1 : b.vence ? 1 : a.createdAt.getTime() - b.createdAt.getTime();
  });
  const hechas = tareas
    .filter((t) => t.hechaEl)
    .sort((a, b) => (b.hechaEl?.getTime() ?? 0) - (a.hechaEl?.getTime() ?? 0));
  return [...abiertas, ...hechas];
}

export function servicioParaEquipo(
  s: FichaEquipoDeBase,
  hoy: Date,
  cliente: NombreDeCliente,
): contrato.ServicioEquipo {
  return {
    ...filaParaDueno(s, hoy),
    cliente,
    responsable: persona(s.responsable),
    nota: s.nota,
    motivoCierre: s.motivoCierre,
    porRevisar: s.porRevisar,
    porConfirmar: s.porConfirmar,
    historialEspera: s.eventos.map((e) => ({
      fecha: aFechaHoraISO(e.fecha),
      de: esperaDeEvento(e.anterior),
      a: esperaDeEvento(e.nuevo),
      detalle: e.motivo,
      autor: persona(e.autor),
    })),
    tareas: ordenarTareas(s.tareas).map(tareaAContrato),
    notas: s.notas.map(notaParaEquipo),
  };
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export function pedidoParaDueno(p: PedidoDeBase): contrato.PedidoDueno {
  return {
    id: p.id,
    estado: p.estado,
    tipo: p.tipo,
    descripcion: p.descripcion,
    propiedad: propiedad(p.property),
    creadoEl: aFechaHoraISO(p.createdAt),
    motivoRechazo: p.motivoRechazo,
    // El servicio solo es del dueño si el pedido se aceptó: antes está «por revisar» y no lo ve.
    servicioId: p.estado === "ACEPTADA" ? p.servicioEnCursoId : null,
  };
}

export function pedidoParaEquipo(p: PedidoDeBase, cliente: NombreDeCliente): contrato.PedidoEquipo {
  return {
    ...pedidoParaDueno(p),
    servicioId: p.servicioEnCursoId,
    cliente,
    pedidoPor: { id: p.pedidaPor.id, nombre: p.pedidaPor.nombre },
  };
}
