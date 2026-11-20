// Pedir un servicio a Proges. La dirección puede traer lo ya elegido: `?propiedad=<id>` (la ficha
// de una propiedad) y `?tipo=OBRA` (por ejemplo, un vencimiento que Proges puede resolver).
import type { Metadata } from "next";
import type { PropiedadesPagina, ServicioTipo } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { SERVICIOS_QUE_SE_PUEDEN_PEDIR } from "@/componentes/dueno/atendido/etiquetas-atendido";
import { FormularioPedido } from "@/componentes/dueno/atendido/formulario-pedido";
import { PedidosDelDueno } from "@/componentes/dueno/atendido/pedidos-del-dueno";
import { pedir } from "@/lib/api";

export const metadata: Metadata = { title: "Pedir a Proges" };

type Consulta = Record<string, string | string[] | undefined>;
const uno = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor) || undefined;

export default async function Pagina({ searchParams }: { searchParams: Promise<Consulta> }) {
  const consulta = await searchParams;
  const lista = await pedir<PropiedadesPagina>("/v1/propiedades", { consulta: { porPagina: 100 } });
  const propiedades = lista.items.map((p) => ({ id: p.id, direccion: p.direccion, comuna: p.comuna }));

  // Lo que viene en la dirección solo se usa si existe: una propiedad ajena o un tipo inventado se ignoran.
  const propiedad = uno(consulta.propiedad);
  const propiedadInicial = propiedades.some((p) => p.id === propiedad) ? propiedad : undefined;
  const tipo = uno(consulta.tipo);
  const tipoInicial = SERVICIOS_QUE_SE_PUEDEN_PEDIR.find((s) => s.tipo === tipo)?.tipo as ServicioTipo | undefined;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoDePagina
        titulo="Pedir a Proges"
        subtitulo="Elige la propiedad y cuéntanos qué necesitas. Lo revisamos y te avisamos."
      />
      <FormularioPedido propiedades={propiedades} propiedadInicial={propiedadInicial} tipoInicial={tipoInicial} />
      <PedidosDelDueno />
    </div>
  );
}
