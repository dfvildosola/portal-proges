// Resultados: cómo vamos, dónde se va el tiempo y la plata. Solo la jefatura y el administrador
// (la API responde 403 a los demás y aquí se dice con claridad). Todo se calcula en la API al
// mirar; esta pantalla solo lo dibuja.
import type { Metadata } from "next";
import type { ClienteBasico, ClientesActivos, Resultados } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { ErrorDeApi, irSegunElError, llamar } from "@/lib/api";
import { fechaConAnio } from "@/lib/formato";
import { Cifras } from "./cifras";
import { DiasPorTipo } from "./dias-por-tipo";
import { Filtros } from "./filtros";
import { GraficoSemanas } from "./grafico-semanas";
import { ObrasResultados } from "./obras-resultados";
import { TareasPersonas } from "./tareas-personas";

export const metadata: Metadata = { title: "Resultados" };

type Busqueda = Promise<Record<string, string | string[] | undefined>>;

const textoDe = (valor: string | string[] | undefined) => (typeof valor === "string" && valor !== "" ? valor : undefined);

type Carga = { ok: true; datos: Resultados } | { ok: false; mensaje: string };

// Un error de la API (período mal escrito, falta de permiso) se muestra en la pantalla con su
// mensaje; solo la sesión caída manda a entrar. Lo inesperado sube.
async function cargarResultados(consulta: Record<string, string | undefined>): Promise<Carga> {
  try {
    return { ok: true, datos: await llamar<Resultados>("GET", "/v1/resultados", { consulta }) };
  } catch (error) {
    if (!(error instanceof ErrorDeApi)) throw error;
    if (error.status === 401) irSegunElError(error);
    return { ok: false, mensaje: error.mensaje };
  }
}

// Los clientes activos para el filtro: los ve todo el equipo. Un error de la API se muestra igual
// que el de Resultados; solo la sesión caída manda a entrar.
async function clientesParaElFiltro(): Promise<ClienteBasico[]> {
  try {
    const { items } = await llamar<ClientesActivos>("GET", "/v1/clientes/activos");
    return items;
  } catch (error) {
    if (!(error instanceof ErrorDeApi)) throw error;
    if (error.status === 401) irSegunElError(error);
    throw error;
  }
}

export default async function Pagina({ searchParams }: { searchParams: Busqueda }) {
  const params = await searchParams;
  const desde = textoDe(params.desde);
  const hasta = textoDe(params.hasta);
  const cliente = textoDe(params.cliente);

  const [carga, clientes] = await Promise.all([cargarResultados({ desde, hasta, cliente }), clientesParaElFiltro()]);
  const periodo = carga.ok ? carga.datos : null;

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoDePagina
        titulo="Resultados"
        subtitulo={periodo ? `Del ${fechaConAnio(periodo.desde)} al ${fechaConAnio(periodo.hasta)}` : "¿Cómo vamos? ¿Dónde se va el tiempo y la plata?"}
      />
      <Filtros desde={periodo?.desde ?? desde} hasta={periodo?.hasta ?? hasta} cliente={cliente} clientes={clientes} />

      {!carga.ok ? (
        <ErrorDeCarga mensaje={carga.mensaje} />
      ) : (
        <>
          <Cifras cifras={carga.datos.cifras} />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Tarjeta>
              <TarjetaTitulo>Servicios que entran y que se cierran, por semana</TarjetaTitulo>
              <GraficoSemanas semanas={carga.datos.serviciosPorSemana} />
            </Tarjeta>
            <Tarjeta>
              <TarjetaTitulo>Días promedio por tipo de servicio</TarjetaTitulo>
              <DiasPorTipo tipos={carga.datos.diasPorTipo} />
            </Tarjeta>
            <Tarjeta>
              <TarjetaTitulo>Obras: lo aprobado contra lo facturado</TarjetaTitulo>
              <ObrasResultados obras={carga.datos.obras} />
            </Tarjeta>
            <Tarjeta>
              <TarjetaTitulo>Tareas hechas a tiempo, por persona</TarjetaTitulo>
              <TareasPersonas personas={carga.datos.tareas} />
            </Tarjeta>
          </div>
        </>
      )}
    </div>
  );
}
