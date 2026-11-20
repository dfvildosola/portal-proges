// Anotar: dejar una nota (con fotos) en un servicio, en dos pasos y con una mano.
// Esta página solo junta lo que el formulario necesita: los servicios donde tengo tareas hoy (la
// API los propone) y la lista de servicios abiertos, para poder buscar otro.
import type { Metadata } from "next";
import type { ServicioTipo, ServiciosRespuesta, ServiciosSugeridos } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { ErrorDeApi, pedir } from "@/lib/api";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { FormularioDeNota } from "./formulario-de-nota";
import type { OpcionDeServicio } from "./tipos";

export const metadata: Metadata = { title: "Anotar" };

export default async function Pagina({ searchParams }: { searchParams: Promise<{ servicio?: string }> }) {
  const [{ servicio: servicioPedido }, sugeridos, abiertos] = await Promise.all([
    searchParams,
    pedir<ServiciosSugeridos>("/v1/servicios/sugeridos"),
    pedirAbiertos(),
  ]);

  const deSugeridos = sugeridos.items.map((s) => aOpcion(s, true));
  const idsSugeridos = new Set(deSugeridos.map((o) => o.id));
  const deLosDemas = (abiertos.items ?? []).filter((s) => !idsSugeridos.has(s.id)).map((s) => aOpcion(s, false));
  const opciones = [...deSugeridos, ...deLosDemas];

  // Si se llegó desde la ficha de un servicio (/anotar?servicio=ID), ese queda elegido; si no, el
  // primero que la API propone.
  const elegidoAlInicio = opciones.find((o) => o.id === servicioPedido)?.id ?? deSugeridos[0]?.id ?? null;

  // Anotar se piensa para el celular y una mano: en computador va en una columna angosta, no a lo ancho.
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <EncabezadoDePagina titulo="Anotar" subtitulo="Una nota con fotos, para que quede en la bitácora del servicio." />
      <FormularioDeNota opciones={opciones} elegidoAlInicio={elegidoAlInicio} errorDeBusqueda={abiertos.error} />
    </div>
  );
}

// Lo que tienen en común un servicio sugerido y uno del tablero: con eso se arma la opción.
function aOpcion(
  s: { id: string; tipo: ServicioTipo; nombre: string; propiedad: { direccion: string; comuna: string }; cliente: { nombre: string } },
  sugerido: boolean,
): OpcionDeServicio {
  return {
    id: s.id,
    titulo: s.propiedad.direccion,
    detalle: `${s.nombre || ETIQUETA_TIPO_SERVICIO[s.tipo]} · ${s.propiedad.comuna} · ${s.cliente.nombre}`,
    sugerido,
  };
}

// La lista de servicios abiertos solo sirve para buscar «otro» servicio: si falla (por ejemplo,
// algo del servidor), la pantalla sigue funcionando con los sugeridos y avisa por qué no se puede
// buscar. Los problemas de sesión y permiso los resuelve `pedir` (redirige).
async function pedirAbiertos(): Promise<{ items: ServiciosTableroItems | null; error: string | null }> {
  try {
    const respuesta = await pedir<ServiciosRespuesta>("/v1/servicios", { consulta: { vista: "tablero" } });
    if (respuesta.vista !== "tablero") throw new Error(`Anotar esperaba la vista «tablero» y llegó «${respuesta.vista}».`);
    return { items: [...respuesta.nuevo, ...respuesta.nosToca, ...respuesta.esperando, ...respuesta.porEntregar], error: null };
  } catch (error) {
    if (error instanceof ErrorDeApi) return { items: null, error: error.mensaje };
    throw error;
  }
}

type ServiciosTableroItems = Extract<ServiciosRespuesta, { vista: "tablero" }>["nuevo"];
