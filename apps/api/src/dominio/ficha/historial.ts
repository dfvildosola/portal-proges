// La línea de tiempo de una propiedad: todo lo que ha pasado en ella, de lo más nuevo a lo más
// antiguo, en una sola lista. Junta servicios abiertos y cerrados, notas de la bitácora, cambios
// de precio y de «esperando a», visitas, ofertas, documentos subidos, presupuestos aprobados y
// recepciones de partidas.
//
// Es una función pura: la ruta lee las tablas (solo lectura) y se las pasa. Aquí se decide qué
// entra y con qué texto. Lo que sale hacia un dueño o una llave (`dueno: true`) se recorta:
// solo las notas marcadas para el dueño, nada de nombres de interesados ni de quien ofertó, ni
// plata de los maestros, ni servicios por revisar o cancelados, ni ofertas que Proges todavía
// no le mostró.
import type { EsperandoA, OfertaEstado, Papel, RecepcionPartida, ServicioEstado, ServicioTipo } from "@proges/db/enums";
import type { HistorialCategoria, HistorialItem } from "@proges/contrato";
import { formatMoney } from "../../util/format";
import { papelLabels } from "../comun/domain";

type Valor = { toString(): string };

export type ServicioParaHistorial = {
  id: string;
  tipo: ServicioTipo;
  estado: ServicioEstado;
  abiertoEl: Date;
  cerradoEl: Date | null;
  motivoCierre: string | null;
  porRevisar: boolean;
  porConfirmar: boolean;
  servicio: { nombre: string };
};

export type DatosDeHistorial = {
  servicios: ServicioParaHistorial[];
  notas: { id: string; servicioEnCursoId: string; texto: string; paraDueno: boolean; createdAt: Date; autor: { nombre: string } }[];
  eventos: {
    id: string;
    servicioEnCursoId: string;
    tipo: "PRECIO" | "ESPERA";
    anterior: string | null;
    nuevo: string;
    moneda: "CLP" | "UF" | null;
    motivo: string | null;
    fecha: Date;
  }[];
  visitas: {
    id: string;
    servicioEnCursoId: string;
    fecha: Date;
    evaluacion: number | null;
    comentario: string | null;
    interesadoNombre: string | null;
  }[];
  ofertas: {
    id: string;
    servicioEnCursoId: string;
    fecha: Date;
    monto: Valor;
    moneda: "CLP" | "UF";
    oferente: string;
    estado: OfertaEstado;
    mostradaAlDuenoEl: Date | null;
  }[];
  documentos: { id: string; nombre: string; papel: Papel | null; createdAt: Date }[];
  presupuestos: {
    id: string;
    servicioEnCursoId: string;
    tipo: "ORIGINAL" | "ADICIONAL";
    total: Valor;
    resueltoEl: Date | null;
    createdAt: Date;
    maestro: { nombre: string };
  }[];
  partidas: {
    id: string;
    servicioEnCursoId: string;
    recinto: string | null;
    descripcion: string;
    recepcion: RecepcionPartida;
    recibidaEl: Date | null;
    observacion: string | null;
  }[];
};

const ESPERANDO_A: Record<EsperandoA, string> = {
  CONSERVADOR: "el conservador",
  NOTARIA: "la notaría",
  MUNICIPALIDAD: "la municipalidad",
  MAESTRO: "el maestro",
  DUENO: "el dueño",
  BANCO: "el banco",
  OTRO: "otro",
};

const ESTADO_OFERTA: Record<OfertaEstado, string> = {
  RECIBIDA: "recibida",
  ACEPTADA: "aceptada",
  RECHAZADA: "rechazada",
  CAIDA: "caída",
  CONTRAOFERTADA: "contraofertada",
};

const dinero = (v: Valor, moneda: "CLP" | "UF" | null) =>
  moneda === "UF" ? formatMoney(v, "UF") : `$${formatMoney(v)}`;

function esperandoA(valor: string | null): string | null {
  return valor && valor in ESPERANDO_A ? ESPERANDO_A[valor as EsperandoA] : null;
}

// Las obras son «reparaciones»; la venta y el arriendo, «venta-arriendo»; los otros tipos de
// servicio no tienen filtro propio (solo salen sin filtro).
export function categoriaDeServicio(tipo: ServicioTipo): HistorialCategoria | null {
  if (tipo === "OBRA") return "reparaciones";
  return tipo === "VENTA" || tipo === "ARRIENDO" ? "venta-arriendo" : null;
}

export function construirHistorial(datos: DatosDeHistorial, dueno: boolean): HistorialItem[] {
  // Para un dueño solo cuentan los servicios que él puede ver (los cancelados, los por revisar
  // y los sin confirmar no existen para él), y todo lo que cuelga de uno oculto también se va.
  const visibles = datos.servicios.filter((s) => !dueno || (s.estado !== "CANCELADO" && !s.porRevisar && !s.porConfirmar));
  const servicio = new Map(visibles.map((s) => [s.id, s]));
  const categoriaDe = (servicioId: string) => {
    const s = servicio.get(servicioId);
    return s ? categoriaDeServicio(s.tipo) : null;
  };
  const items: HistorialItem[] = [];

  for (const s of visibles) {
    const categoria = categoriaDeServicio(s.tipo);
    items.push({
      id: `servicio-abierto:${s.id}`,
      tipo: "servicio",
      categoria,
      fecha: s.abiertoEl.toISOString(),
      titulo: `Servicio abierto: ${s.servicio.nombre}`,
      detalle: null,
      servicioId: s.id,
    });
    if (s.cerradoEl) {
      items.push({
        id: `servicio-cerrado:${s.id}`,
        tipo: "servicio",
        categoria,
        fecha: s.cerradoEl.toISOString(),
        titulo: `Servicio ${s.estado === "TERMINADO" ? "terminado" : "cancelado"}: ${s.servicio.nombre}`,
        detalle: dueno ? null : s.motivoCierre,
        servicioId: s.id,
      });
    }
  }

  for (const n of datos.notas) {
    if (!servicio.has(n.servicioEnCursoId)) continue;
    if (dueno && !n.paraDueno) continue;
    items.push({
      id: `nota:${n.id}`,
      tipo: "nota",
      categoria: categoriaDe(n.servicioEnCursoId),
      fecha: n.createdAt.toISOString(),
      titulo: dueno ? "Nota en la bitácora" : `Nota de ${n.autor.nombre}${n.paraDueno ? "" : " (solo equipo)"}`,
      detalle: n.texto,
      servicioId: n.servicioEnCursoId,
    });
  }

  for (const e of datos.eventos) {
    if (!servicio.has(e.servicioEnCursoId)) continue;
    if (e.tipo === "PRECIO") {
      items.push({
        id: `precio:${e.id}`,
        tipo: "precio",
        categoria: "venta-arriendo",
        fecha: e.fecha.toISOString(),
        titulo: e.anterior
          ? `Precio: de ${dinero(e.anterior, e.moneda)} a ${dinero(e.nuevo, e.moneda)}`
          : `Precio fijado en ${dinero(e.nuevo, e.moneda)}`,
        detalle: dueno ? null : e.motivo,
        servicioId: e.servicioEnCursoId,
      });
    } else {
      const ahora = esperandoA(e.nuevo);
      const antes = esperandoA(e.anterior);
      items.push({
        id: `espera:${e.id}`,
        tipo: "espera",
        categoria: categoriaDe(e.servicioEnCursoId),
        fecha: e.fecha.toISOString(),
        titulo: ahora ? `Se espera a ${ahora}` : antes ? `Se dejó de esperar a ${antes}` : "Cambió a quién se espera",
        detalle: dueno ? null : e.motivo,
        servicioId: e.servicioEnCursoId,
      });
    }
  }

  for (const v of datos.visitas) {
    if (!servicio.has(v.servicioEnCursoId)) continue;
    const evaluacion = v.evaluacion ? `Evaluación ${v.evaluacion} de 5.` : null;
    items.push({
      id: `visita:${v.id}`,
      tipo: "visita",
      categoria: "visitas",
      fecha: v.fecha.toISOString(),
      titulo: !dueno && v.interesadoNombre ? `Visita de ${v.interesadoNombre}` : "Visita",
      detalle: [evaluacion, v.comentario].filter(Boolean).join(" ") || null,
      servicioId: v.servicioEnCursoId,
    });
  }

  for (const o of datos.ofertas) {
    if (!servicio.has(o.servicioEnCursoId)) continue;
    // Una oferta se le muestra al dueño con un botón: antes de eso no la ve.
    if (dueno && !o.mostradaAlDuenoEl) continue;
    items.push({
      id: `oferta:${o.id}`,
      tipo: "oferta",
      categoria: "venta-arriendo",
      fecha: o.fecha.toISOString(),
      titulo: dueno ? `Oferta por ${dinero(o.monto, o.moneda)}` : `Oferta de ${o.oferente} por ${dinero(o.monto, o.moneda)}`,
      detalle: `Estado: ${ESTADO_OFERTA[o.estado]}.`,
      servicioId: o.servicioEnCursoId,
    });
  }

  for (const d of datos.documentos) {
    items.push({
      id: `documento:${d.id}`,
      tipo: "documento",
      categoria: "papeles",
      fecha: d.createdAt.toISOString(),
      titulo: `Documento subido: ${d.nombre}`,
      detalle: d.papel ? papelLabels[d.papel] : null,
      servicioId: null,
    });
  }

  // La plata de los maestros nunca sale hacia un dueño.
  if (!dueno) {
    for (const p of datos.presupuestos) {
      if (!servicio.has(p.servicioEnCursoId)) continue;
      items.push({
        id: `presupuesto:${p.id}`,
        tipo: "presupuesto",
        categoria: "reparaciones",
        fecha: (p.resueltoEl ?? p.createdAt).toISOString(),
        titulo: `Presupuesto ${p.tipo === "ADICIONAL" ? "adicional " : ""}aprobado: ${p.maestro.nombre}, $${formatMoney(p.total)}`,
        detalle: null,
        servicioId: p.servicioEnCursoId,
      });
    }
  }

  for (const p of datos.partidas) {
    if (!servicio.has(p.servicioEnCursoId) || !p.recibidaEl || p.recepcion === "PENDIENTE") continue;
    items.push({
      id: `recepcion:${p.id}`,
      tipo: "recepcion",
      categoria: "reparaciones",
      fecha: p.recibidaEl.toISOString(),
      titulo: `Partida recibida ${p.recepcion === "CONFORME" ? "conforme" : "con observaciones"}: ${p.recinto ? `${p.recinto}, ` : ""}${p.descripcion}`,
      detalle: dueno ? null : p.observacion,
      servicioId: p.servicioEnCursoId,
    });
  }

  return items.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id));
}

export function filtrarHistorial(items: HistorialItem[], tipo: HistorialCategoria | undefined): HistorialItem[] {
  return tipo ? items.filter((i) => i.categoria === tipo) : items;
}
