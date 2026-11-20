"use server";
// Las acciones de la obra: lo que el navegador le pide al servidor para guardar algo. Cada una
// llama a la API (que revisa quién eres y qué puedes hacer) y, si sale bien, refresca la ficha del
// servicio para que muestre lo nuevo. Si la API rechaza, no lanza: devuelve su mensaje para
// escribirlo en pantalla (patrón de lib/acciones.ts).
import type {
  FacturasOdooRespuesta,
  OrdenActualizada,
  OrdenRespuesta,
} from "@proges/contrato";
import { archivoDe, casillaDe, ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

/** Como `ResultadoAccion`, pero con lo que la API contestó (por ejemplo, la revisión de una orden). */
export type ResultadoConDatos<T> = { ok: true; datos: T } | { ok: false; error: string };

const fichaDe = (servicioId: string) => [`/servicios/${servicioId}`];
const idEnRuta = encodeURIComponent;

// Una acción que además de guardar (o leer) necesita devolver lo que la API contestó.
async function conDatos<T>(trabajo: () => Promise<T>, revalidar: string[] = []): Promise<ResultadoConDatos<T>> {
  let datos: T | undefined;
  const resultado = await ejecutar(
    async () => {
      datos = await trabajo();
    },
    { revalidar },
  );
  return resultado.ok ? { ok: true, datos: datos as T } : { ok: false, error: resultado.error };
}

// «1.500.000» o «$ 1500000» → «1500000». A una persona le sale natural escribir con puntos de miles.
// Un punto o coma seguido de 1 o 2 dígitos («920000.00», lo que Odoo entrega) es decimal, no de miles:
// los pesos no llevan decimales, así que se descarta en vez de pegar los ceros al número.
function soloDigitos(texto: string | undefined): string {
  const limpio = (texto ?? "").replace(/[\s$]/g, "");
  const conDecimales = /^(\d+)[.,]\d{1,2}$/.exec(limpio);
  if (conDecimales) return conDecimales[1];
  return limpio.replace(/[^\d]/g, "");
}

// ---------------------------------------------------------------------------
// La orden de Odoo
// ---------------------------------------------------------------------------

/** Paso 1: mira la orden en Odoo y dice qué se enlazaría. No guarda nada. */
export async function revisarOrden(servicioId: string, numero: string): Promise<ResultadoConDatos<OrdenRespuesta>> {
  return conDatos(() =>
    llamar<OrdenRespuesta>("POST", `/v1/servicios/${idEnRuta(servicioId)}/orden`, { cuerpo: { numero, confirmar: false } }),
  );
}

/** Paso 2: el equipo ya confirmó que la orden es de esta unidad; se guarda y se crean las partidas. */
export async function enlazarOrden(servicioId: string, numero: string): Promise<ResultadoConDatos<OrdenRespuesta>> {
  return conDatos(
    () => llamar<OrdenRespuesta>("POST", `/v1/servicios/${idEnRuta(servicioId)}/orden`, { cuerpo: { numero, confirmar: true } }),
    fichaDe(servicioId),
  );
}

/** Vuelve a traer la orden: agrega las partidas nuevas y marca las que Odoo ya no trae. */
export async function actualizarOrden(servicioId: string): Promise<ResultadoConDatos<OrdenActualizada>> {
  return conDatos(
    () => llamar<OrdenActualizada>("POST", `/v1/servicios/${idEnRuta(servicioId)}/orden/actualizar`),
    fichaDe(servicioId),
  );
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

export async function guardarFechas(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  // Un campo vacío manda null: así se borra la fecha.
  return ejecutar(
    () =>
      llamar("PATCH", `/v1/servicios/${idEnRuta(servicioId ?? "")}/obra/fechas`, {
        cuerpo: { inicioObra: textoDe(datos, "inicioObra") ?? null, fechaComprometida: textoDe(datos, "fechaComprometida") ?? null },
      }),
    { revalidar: fichaDe(servicioId ?? "") },
  );
}

// ---------------------------------------------------------------------------
// Partidas: avance, maestro y recepción
// ---------------------------------------------------------------------------

/** Cambia el avance y/o el maestro de una partida. Lo que no se manda no cambia. */
export async function cambiarPartida(
  servicioId: string,
  partidaId: string,
  cambio: { avance?: number; maestroId?: string | null },
): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("PATCH", `/v1/partidas/${idEnRuta(partidaId)}`, { cuerpo: cambio }), { revalidar: fichaDe(servicioId) });
}

/** Marca el avance de todas las partidas de un recinto (`recinto: null`: las que no tienen recinto). */
export async function avanceDeRecinto(servicioId: string, recinto: string | null, avance: number): Promise<ResultadoAccion> {
  return ejecutar(
    () => llamar("PATCH", `/v1/servicios/${idEnRuta(servicioId)}/obra/avance`, { cuerpo: { recinto, avance } }),
    { revalidar: fichaDe(servicioId) },
  );
}

export async function recibirPartida(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId") ?? "";
  const partidaId = textoDe(datos, "partidaId") ?? "";
  const resultado = textoDe(datos, "resultado") ?? "";

  // Se arma un formulario nuevo con lo que la API espera (las fotos van como archivos).
  const cuerpo = new FormData();
  cuerpo.set("resultado", resultado);
  const observacion = textoDe(datos, "observacion");
  if (observacion) cuerpo.set("observacion", observacion);
  const responsable = textoDe(datos, "responsableId");
  if (resultado === "OBSERVADA" && responsable) cuerpo.set("responsableId", responsable);
  for (const foto of datos.getAll("fotos")) {
    if (foto instanceof File && foto.size > 0) cuerpo.append("fotos", foto);
  }
  return ejecutar(() => llamar("POST", `/v1/partidas/${idEnRuta(partidaId)}/recepcion`, { cuerpo }), { revalidar: fichaDe(servicioId) });
}

// ---------------------------------------------------------------------------
// Presupuestos de maestros
// ---------------------------------------------------------------------------

export async function cargarPresupuesto(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId") ?? "";
  // Multipart: los números van como texto y las partidas se repiten, un campo por partida.
  const cuerpo = new FormData();
  cuerpo.set("maestroId", textoDe(datos, "maestroId") ?? "");
  cuerpo.set("tipo", textoDe(datos, "tipo") ?? "");
  cuerpo.set("total", soloDigitos(textoDe(datos, "total")));
  const plazo = textoDe(datos, "plazoDias");
  if (plazo) cuerpo.set("plazoDias", plazo);
  for (const id of datos.getAll("partidaIds")) {
    if (typeof id === "string" && id) cuerpo.append("partidaIds", id);
  }
  const nota = textoDe(datos, "nota");
  if (nota) cuerpo.set("nota", nota);
  const pdf = archivoDe(datos, "pdf");
  if (pdf) cuerpo.set("pdf", pdf);
  return ejecutar(() => llamar("POST", `/v1/servicios/${idEnRuta(servicioId)}/presupuestos`, { cuerpo }), { revalidar: fichaDe(servicioId) });
}

export async function aprobarPresupuesto(servicioId: string, presupuestoId: string): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("POST", `/v1/presupuestos/${idEnRuta(presupuestoId)}/aprobar`), { revalidar: fichaDe(servicioId) });
}

export async function rechazarPresupuesto(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId") ?? "";
  const presupuestoId = textoDe(datos, "presupuestoId") ?? "";
  return ejecutar(
    () => llamar("POST", `/v1/presupuestos/${idEnRuta(presupuestoId)}/rechazar`, { cuerpo: { motivo: textoDe(datos, "motivo") ?? "" } }),
    { revalidar: fichaDe(servicioId) },
  );
}

// ---------------------------------------------------------------------------
// Facturas de maestros
// ---------------------------------------------------------------------------

/** Las facturas de un maestro en Odoo, para elegir cuál asignar. Solo lee: no guarda ni refresca nada. */
export async function facturasDeOdoo(maestroId: string): Promise<ResultadoConDatos<FacturasOdooRespuesta>> {
  return conDatos(() => llamar<FacturasOdooRespuesta>("GET", `/v1/maestros/${idEnRuta(maestroId)}/facturas-odoo`));
}

export async function asignarFactura(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId") ?? "";
  return ejecutar(
    () =>
      llamar("POST", `/v1/servicios/${idEnRuta(servicioId)}/obra/facturas`, {
        cuerpo: {
          maestroId: textoDe(datos, "maestroId") ?? "",
          odooMoveId: Number(textoDe(datos, "odooMoveId") ?? 0),
          monto: { valor: soloDigitos(textoDe(datos, "monto")), moneda: "CLP" },
        },
      }),
    { revalidar: fichaDe(servicioId) },
  );
}

export async function anotarFactura(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId") ?? "";
  return ejecutar(
    () =>
      llamar("POST", `/v1/servicios/${idEnRuta(servicioId)}/obra/facturas/manual`, {
        cuerpo: {
          maestroId: textoDe(datos, "maestroId") ?? "",
          numero: textoDe(datos, "numero"),
          fecha: textoDe(datos, "fecha") ?? "",
          monto: { valor: soloDigitos(textoDe(datos, "monto")), moneda: "CLP" },
          pagada: casillaDe(datos, "pagada"),
          nota: textoDe(datos, "nota"),
        },
      }),
    { revalidar: fichaDe(servicioId) },
  );
}

export async function quitarFactura(servicioId: string, facturaId: string): Promise<ResultadoAccion> {
  return ejecutar(
    () => llamar("DELETE", `/v1/servicios/${idEnRuta(servicioId)}/obra/facturas/${idEnRuta(facturaId)}`),
    { revalidar: fichaDe(servicioId) },
  );
}

// ---------------------------------------------------------------------------
// Cierre
// ---------------------------------------------------------------------------

export async function cerrarObra(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId") ?? "";
  return ejecutar(
    () => llamar("POST", `/v1/servicios/${idEnRuta(servicioId)}/obra/cierre`, { cuerpo: { motivo: textoDe(datos, "motivo") } }),
    // El servicio queda terminado: también cambia el tablero.
    { revalidar: [...fichaDe(servicioId), "/servicios"] },
  );
}
