// Repartir: la mesa de la jefatura para decidir quién hace qué. De arriba abajo: los pedidos de
// clientes por revisar, los servicios sin responsable y el tablero de tareas de la semana por
// persona. Todo se pide a la vez y cada bloque se guarda con su propia acción.
import type { Metadata } from "next";
import type {
  Catalogo,
  EquipoRespuesta,
  PedidoEquipo,
  Pedidos,
  PropiedadesPagina,
  ServiciosTablero,
  TareasRespuesta,
} from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Seccion } from "@/componentes/comunes/seccion";
import { pedir } from "@/lib/api";
import { fechaDelDia, hoyChile } from "@/lib/formato";
import { DialogoAbrirServicio } from "./dialogo-abrir-servicio";
import { DialogoNuevaTarea } from "./dialogo-nueva-tarea";
import { PedidosPorRevisar } from "./pedidos-por-revisar";
import { ServiciosSinResponsable } from "./servicios-sin-responsable";
import { TableroDeTareas } from "./tablero-de-tareas";

type TareasSemana = Extract<TareasRespuesta, { vista: "semana" }>;

export const metadata: Metadata = { title: "Repartir" };

export default async function Pagina() {
  const [semana, tablero, pedidos, equipo, catalogo, propiedades] = await Promise.all([
    pedir<TareasSemana>("/v1/tareas", { consulta: { vista: "semana" } }),
    pedir<ServiciosTablero>("/v1/servicios", { consulta: { vista: "tablero" } }),
    pedir<Pedidos>("/v1/pedidos"),
    pedir<EquipoRespuesta>("/v1/equipo"),
    pedir<Catalogo>("/v1/catalogo"),
    pedir<PropiedadesPagina>("/v1/propiedades", { consulta: { porPagina: 100 } }),
  ]);

  const personas = equipo.items;
  // La bandeja del equipo trae pedidos con cliente; se descartan por tipo los que no lo traen.
  const pedidosDelEquipo = pedidos.items.filter((p): p is PedidoEquipo => "cliente" in p);
  // «Nuevo» mezcla tres cosas (pedidos sin aceptar, por confirmar y sin responsable). Los pedidos
  // sin aceptar se reparten al aceptar el pedido, arriba; todo lo demás ya es un servicio y se
  // ve aquí o en las tareas. Los sin responsable están en cualquier columna, sobre todo en «Nuevo».
  const abiertos = [...tablero.nuevo, ...tablero.nosToca, ...tablero.esperando, ...tablero.porEntregar].filter(
    (s) => !s.porRevisar,
  );
  const sinResponsable = abiertos.filter((s) => s.responsable === null);
  const hoy = hoyChile();

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoDePagina titulo="Repartir" subtitulo={`Tareas de hoy a 7 días · hoy es ${fechaDelDia(hoy)}`}>
        <DialogoAbrirServicio propiedades={propiedades.items} catalogo={catalogo.items} personas={personas} />
        <DialogoNuevaTarea servicios={abiertos} personas={personas} />
      </EncabezadoDePagina>

      <PedidosPorRevisar pedidos={pedidosDelEquipo} catalogo={catalogo.items} personas={personas} />
      <ServiciosSinResponsable servicios={sinResponsable} personas={personas} />

      <Seccion titulo="Tareas de la semana por persona">
        <TableroDeTareas semana={semana} personas={personas} hoy={hoy} />
      </Seccion>
    </div>
  );
}
