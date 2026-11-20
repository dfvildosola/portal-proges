// El tablero de servicios: quién tiene la pelota en cada servicio abierto y qué está trabado.
// Los filtros viajan en la dirección (?cliente=…&tipo=…&responsable=…); esta página los pasa a la
// API, que es la que filtra.
import type { Metadata } from "next";
import type { EquipoRespuesta, ServicioTableroItem, ServiciosRespuesta, ServiciosTablero } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { FiltrosDelTablero } from "@/componentes/servicio/filtros-del-tablero";
import { TableroDeServicios } from "@/componentes/servicio/tablero-de-servicios";
import { pedir } from "@/lib/api";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";

export const metadata: Metadata = { title: "Servicios" };

type Consulta = { [clave: string]: string | string[] | undefined };

// Un filtro de la dirección: solo el primer valor, y vacío si no viene.
function filtro(consulta: Consulta, clave: string): string | undefined {
  const valor = consulta[clave];
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return texto ? texto : undefined;
}

async function pedirTablero(filtros: Record<string, string | undefined>): Promise<ServiciosTablero> {
  const respuesta = await pedir<ServiciosRespuesta>("/v1/servicios", { consulta: { vista: "tablero", ...filtros } });
  if (respuesta.vista !== "tablero") throw new Error("La API devolvió una lista donde se esperaba el tablero.");
  return respuesta;
}

function todos(tablero: ServiciosTablero): ServicioTableroItem[] {
  return [...tablero.nuevo, ...tablero.nosToca, ...tablero.esperando, ...tablero.porEntregar];
}

export default async function Pagina({ searchParams }: { searchParams: Promise<Consulta> }) {
  const consulta = await searchParams;
  const tipo = filtro(consulta, "tipo");
  const filtros = {
    cliente: filtro(consulta, "cliente"),
    // Un tipo que no existe se ignora en vez de hacer fallar la pantalla.
    tipo: tipo && tipo in ETIQUETA_TIPO_SERVICIO ? tipo : undefined,
    responsable: filtro(consulta, "responsable"),
  };
  const hayFiltro = Object.values(filtros).some(Boolean);

  // Sin filtros, un solo pedido sirve para el tablero y para las opciones de cliente. Con filtros,
  // las opciones salen del tablero completo (si no, al filtrar un cliente desaparecerían los demás).
  const [equipo, completo] = await Promise.all([pedir<EquipoRespuesta>("/v1/equipo"), pedirTablero({})]);
  const tablero = hayFiltro ? await pedirTablero(filtros) : completo;

  const clientes = new Map<string, string>();
  for (const s of todos(completo)) clientes.set(s.cliente.id, s.cliente.nombre);
  const opcionesDeCliente = [...clientes].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const personas = equipo.items.map((p) => ({ id: p.id, nombre: p.nombre }));
  const total = todos(tablero).length;
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoDePagina
        titulo="Servicios"
        subtitulo={`${total} ${total === 1 ? "servicio abierto" : "servicios abiertos"}, ordenados por quién tiene la pelota`}
      />
      <FiltrosDelTablero clientes={opcionesDeCliente} personas={personas} />
      <TableroDeServicios tablero={tablero} personas={personas} />
    </div>
  );
}
