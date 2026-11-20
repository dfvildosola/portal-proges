"use server";
// Las acciones del panel de venta: cada una recibe el formulario, llama a la API de corretaje y
// devuelve si salió bien o el mensaje de la API. Después refresca la ficha del servicio para que
// muestre lo nuevo.
import type { VentaAnuncioEstado } from "@proges/contrato";
import { ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";
import { enteroDe, montoDe } from "./leer-formulario";

const SERVICIO_FALTA = "No se supo de qué servicio es esto. Recarga la página e intenta de nuevo.";

function fallo(error: string, campos: Record<string, string> = {}): ResultadoAccion {
  return { ok: false, error, campos };
}

// La ficha del servicio es donde vive el panel; si la ruta cambia, se cambia aquí.
const fichaDe = (servicioId: string) => [`/servicios/${servicioId}`];

export async function cambiarPrecio(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) return fallo(SERVICIO_FALTA);
  const monto = montoDe(datos, "monto", "montoMoneda");
  if ("error" in monto) return fallo(monto.error, { monto: monto.error });
  return ejecutar(
    () =>
      llamar("POST", `/v1/servicios/${encodeURIComponent(servicioId)}/precio`, {
        cuerpo: {
          monto: monto.monto,
          origen: datos.get("origen") === "SUGERIDO_PROGES" ? "SUGERIDO_PROGES" : "PROPIETARIO",
          motivo: textoDe(datos, "motivo"),
        },
      }),
    { revalidar: fichaDe(servicioId) },
  );
}

export async function crearAnuncio(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) return fallo(SERVICIO_FALTA);
  return ejecutar(
    () =>
      llamar("POST", `/v1/servicios/${encodeURIComponent(servicioId)}/anuncios`, {
        cuerpo: {
          portal: textoDe(datos, "portal") ?? "",
          url: textoDe(datos, "url"),
          desde: textoDe(datos, "desde") ?? "",
        },
      }),
    { revalidar: fichaDe(servicioId) },
  );
}

/** Pausar, reactivar o bajar un anuncio. No es un formulario: se llama directo desde un menú. */
export async function cambiarEstadoDeAnuncio(
  servicioId: string,
  anuncioId: string,
  estado: VentaAnuncioEstado,
): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("PATCH", `/v1/anuncios/${encodeURIComponent(anuncioId)}`, { cuerpo: { estado } }), {
    revalidar: fichaDe(servicioId),
  });
}

export async function anotarCifras(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  const anuncioId = textoDe(datos, "anuncioId");
  const semana = textoDe(datos, "semana");
  if (!servicioId || !anuncioId || !semana) return fallo(SERVICIO_FALTA);
  const vistas = enteroDe(datos, "vistas");
  const consultas = enteroDe(datos, "consultas");
  if (vistas === null) return fallo("Las vistas son un número entero.", { vistas: "Escribe un número entero." });
  if (consultas === null) return fallo("Las consultas son un número entero.", { consultas: "Escribe un número entero." });
  if (vistas === undefined && consultas === undefined) {
    return fallo("Anota las vistas, las consultas o las dos.", { vistas: "Falta al menos una cifra." });
  }
  return ejecutar(
    () =>
      llamar("PUT", `/v1/anuncios/${encodeURIComponent(anuncioId)}/cifras/${encodeURIComponent(semana)}`, {
        cuerpo: { vistas, consultas },
      }),
    { revalidar: fichaDe(servicioId) },
  );
}

export async function anotarVisita(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) return fallo(SERVICIO_FALTA);
  const evaluacion = enteroDe(datos, "evaluacion");
  if (evaluacion === null) return fallo("La evaluación va de 1 a 5.", { evaluacion: "Elige de 1 a 5." });
  return ejecutar(
    () =>
      llamar("POST", `/v1/servicios/${encodeURIComponent(servicioId)}/visitas`, {
        cuerpo: {
          fecha: textoDe(datos, "fecha") ?? "",
          realizadaPorId: textoDe(datos, "realizadaPorId"),
          interesadoNombre: textoDe(datos, "interesadoNombre"),
          interesadoContacto: textoDe(datos, "interesadoContacto"),
          evaluacion,
          comentario: textoDe(datos, "comentario"),
        },
      }),
    { revalidar: fichaDe(servicioId) },
  );
}

export async function registrarOferta(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) return fallo(SERVICIO_FALTA);
  const monto = montoDe(datos, "monto", "montoMoneda");
  if ("error" in monto) return fallo(monto.error, { monto: monto.error });
  return ejecutar(
    () =>
      llamar("POST", `/v1/servicios/${encodeURIComponent(servicioId)}/ofertas`, {
        cuerpo: {
          fecha: textoDe(datos, "fecha"),
          monto: monto.monto,
          oferente: textoDe(datos, "oferente") ?? "",
          nota: textoDe(datos, "nota"),
        },
      }),
    { revalidar: fichaDe(servicioId) },
  );
}

export async function mostrarOferta(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  const ofertaId = textoDe(datos, "ofertaId");
  if (!servicioId || !ofertaId) return fallo(SERVICIO_FALTA);
  return ejecutar(
    () =>
      llamar("POST", `/v1/ofertas/${encodeURIComponent(ofertaId)}/mostrar`, {
        cuerpo: { recomendacion: textoDe(datos, "recomendacion") },
      }),
    { revalidar: fichaDe(servicioId) },
  );
}
