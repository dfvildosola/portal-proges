"use server";
// Las acciones del portal del cliente atendido: responder una oferta y pedirle un servicio a Proges.
//
// Responder una oferta: acepta, contraoferta o rechaza. No refresca la pantalla sola:
// el diálogo primero le muestra al dueño que se avisó al corredor y recién al cerrarlo la
// pantalla se actualiza (si se refrescara antes, la oferta desaparecería de la lista y el aviso
// con ella).
import type { PedidoNuevo, VentaOfertaResponder } from "@proges/contrato";
import { ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";
import { valorDeMonto } from "@/componentes/venta/leer-formulario";

const fallo = (error: string, campos: Record<string, string> = {}): ResultadoAccion => ({ ok: false, error, campos });

export async function responderOferta(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const ofertaId = textoDe(datos, "ofertaId");
  const respuesta = textoDe(datos, "respuesta");
  if (!ofertaId) return fallo("No se supo a qué oferta responder. Recarga la página e intenta de nuevo.");
  if (respuesta !== "ACEPTA" && respuesta !== "CONTRAOFERTA" && respuesta !== "RECHAZA") {
    return fallo("No se entendió tu respuesta. Recarga la página e intenta de nuevo.");
  }

  const cuerpo: VentaOfertaResponder = { respuesta };
  if (respuesta === "CONTRAOFERTA") {
    const texto = textoDe(datos, "monto");
    if (!texto) return fallo("Escribe cuánto quieres pedir.", { monto: "Escribe cuánto quieres pedir." });
    const valor = valorDeMonto(texto);
    if (valor === null) {
      const error = "Escribe el monto solo con números (por ejemplo 14.900 o 14900,5).";
      return fallo(error, { monto: error });
    }
    // La contraoferta va en la misma moneda de la oferta (la API lo exige).
    cuerpo.monto = { valor, moneda: datos.get("moneda") === "CLP" ? "CLP" : "UF" };
  }

  return ejecutar(() => llamar("POST", `/v1/ofertas/${encodeURIComponent(ofertaId)}/responder`, { cuerpo }));
}


export async function pedirServicio(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const tipo = textoDe(datos, "tipo") as PedidoNuevo["tipo"] | undefined;
  if (!tipo) return fallo("Elige qué necesitas.", { tipo: "Elige qué necesitas." });

  const base = { tipo, descripcion: textoDe(datos, "descripcion") ?? "" };
  let cuerpo: PedidoNuevo;
  if (textoDe(datos, "propiedad") === "nueva") {
    cuerpo = {
      ...base,
      propiedadNueva: {
        direccion: textoDe(datos, "direccion") ?? "",
        comuna: textoDe(datos, "comuna") ?? "",
        tipo: (textoDe(datos, "tipoPropiedad") ?? "DEPARTAMENTO") as NonNullable<PedidoNuevo["propiedadNueva"]>["tipo"],
      },
    };
  } else {
    const propiedadId = textoDe(datos, "propiedad");
    if (!propiedadId) return fallo("Elige la propiedad.", { propiedadId: "Elige la propiedad." });
    cuerpo = { ...base, propiedadId };
  }

  // Se refresca la lista de pedidos de esta pantalla, el inicio y (si se creó una propiedad) la lista de propiedades.
  return ejecutar(() => llamar("POST", "/v1/pedidos", { cuerpo }), { revalidar: ["/mi/pedir", "/mi", "/mi/propiedades"] });
}
