// Los filtros de Resultados: período y cliente. Es un formulario común que manda los datos por la
// dirección (?desde=…&hasta=…&cliente=…), así la pantalla se puede copiar, guardar y compartir.
import Link from "next/link";
import type { ClienteBasico } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { Boton, estiloBoton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { PERIODOS_RAPIDOS, periodoHastaHoy } from "./periodo";

function direccion(desde: string, hasta: string, cliente: string | undefined): string {
  const consulta = new URLSearchParams({ desde, hasta });
  if (cliente) consulta.set("cliente", cliente);
  return `/resultados?${consulta.toString()}`;
}

export function Filtros({
  desde,
  hasta,
  cliente,
  clientes,
}: {
  desde: string | undefined;
  hasta: string | undefined;
  cliente: string | undefined;
  clientes: ClienteBasico[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-3.5">
      <form method="get" action="/resultados" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <CampoFormulario etiqueta="Desde">
          <CampoTexto type="date" name="desde" defaultValue={desde} />
        </CampoFormulario>
        <CampoFormulario etiqueta="Hasta">
          <CampoTexto type="date" name="hasta" defaultValue={hasta} />
        </CampoFormulario>
        {clientes.length > 0 && (
          <CampoFormulario etiqueta="Cliente">
            <Select name="cliente" defaultValue={cliente ?? ""}>
              <option value="">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </CampoFormulario>
        )}
        <Boton type="submit">Ver resultados</Boton>
      </form>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-soft">
        <span className="font-bold">Rápido:</span>
        {PERIODOS_RAPIDOS.map((p) => {
          const rango = periodoHastaHoy(p.dias);
          return (
            <Link key={p.dias} href={direccion(rango.desde, rango.hasta, cliente)} className={estiloBoton({ variante: "suave", tamano: "chico" })}>
              Últimos {p.etiqueta}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
