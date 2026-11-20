// /propiedades/[id]: la ficha de una propiedad, como la ficha clínica de un paciente. La cabecera y
// las pestañas son siempre las mismas; cada pestaña pide solo lo suyo (la pestaña viaja en la
// dirección: `?pestana=documentos`). Los componentes de la ficha están en componentes/ficha/ y
// reciben un `modo`: aquí siempre «equipo»; el portal del dueño (etapa 3) usa los mismos con «dueno».
import type { Metadata } from "next";
import type {
  Cobro,
  Contrato,
  DocumentosRespuesta,
  DuenosRespuesta,
  FichaReparaciones,
  FichaResumen,
  HistorialCategoria,
  HistorialPagina,
  PropiedadAvaluo,
  PropiedadDueno,
  PropiedadUnidad,
} from "@proges/contrato";
import { CabeceraFicha } from "@/componentes/ficha/cabecera-ficha";
import { PestanaArriendo } from "@/componentes/ficha/pestana-arriendo";
import { PestanaDatos } from "@/componentes/ficha/pestana-datos";
import { PestanaDocumentos } from "@/componentes/ficha/pestana-documentos";
import { PestanaHistorial } from "@/componentes/ficha/pestana-historial";
import { PestanaReparaciones } from "@/componentes/ficha/pestana-reparaciones";
import { PestanaResumen } from "@/componentes/ficha/pestana-resumen";
import { pestanaDe } from "@/componentes/ficha/pestanas-ficha";
import { pedir } from "@/lib/api";

export const metadata: Metadata = { title: "Propiedad" };

const FILTROS_DE_HISTORIAL: HistorialCategoria[] = ["reparaciones", "papeles", "visitas", "venta-arriendo"];
const POR_PAGINA_HISTORIAL = 30;
const COBROS_A_MOSTRAR = 12;

type Consulta = Record<string, string | string[] | undefined>;
const uno = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor) || undefined;

export default async function Pagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Consulta> }) {
  const [{ id }, consulta] = await Promise.all([params, searchParams]);
  const clave = pestanaDe(consulta.pestana);
  const ruta = `/v1/propiedades/${encodeURIComponent(id)}`;
  const modo = "equipo" as const;

  // La cabecera necesita el resumen en toda pestaña; lo demás se pide según la pestaña abierta.
  const ficha = await pedir<FichaResumen>(ruta);
  const { propiedad } = ficha;

  let contenido: React.ReactNode;
  switch (clave) {
    case "resumen":
      contenido = <PestanaResumen ficha={ficha} modo={modo} />;
      break;
    case "historial": {
      const tipo = FILTROS_DE_HISTORIAL.find((f) => f === uno(consulta.tipo));
      const pagina = Math.max(1, Number.parseInt(uno(consulta.pagina) ?? "1", 10) || 1);
      const historial = await pedir<HistorialPagina>(`${ruta}/historial`, { consulta: { tipo, pagina, porPagina: POR_PAGINA_HISTORIAL } });
      contenido = <PestanaHistorial propiedadId={id} historial={historial} filtro={tipo} modo={modo} />;
      break;
    }
    case "reparaciones": {
      const reparaciones = await pedir<FichaReparaciones>(`${ruta}/reparaciones`);
      contenido = <PestanaReparaciones reparaciones={reparaciones} modo={modo} />;
      break;
    }
    case "documentos": {
      const documentos = await pedir<DocumentosRespuesta>(`${ruta}/documentos`);
      contenido = <PestanaDocumentos propiedadId={id} documentos={documentos} tieneCarpetaDrive={propiedad.tieneCarpetaDrive} modo={modo} />;
      break;
    }
    case "datos": {
      const [unidades, avaluos, duenos, delCliente] = await Promise.all([
        pedir<PropiedadUnidad[]>(`${ruta}/unidades`),
        pedir<PropiedadAvaluo[]>(`${ruta}/avaluos`),
        pedir<PropiedadDueno[]>(`${ruta}/duenos`),
        pedir<DuenosRespuesta>("/v1/duenos", { consulta: { cliente: propiedad.clienteId } }),
      ]);
      contenido = (
        <PestanaDatos propiedad={propiedad} unidades={unidades} avaluos={avaluos} duenos={duenos} duenosDelCliente={delCliente.duenos} modo={modo} />
      );
      break;
    }
    case "arriendo": {
      const [contratos, cobros] = await Promise.all([
        pedir<PaginaDeApiDe<Contrato>>("/v1/contratos", { consulta: { propiedadId: id, porPagina: 20 } }),
        pedir<PaginaDeApiDe<Cobro>>("/v1/cobros", { consulta: { propiedadId: id, porPagina: COBROS_A_MOSTRAR } }),
      ]);
      contenido = (
        <PestanaArriendo
          contratos={contratos.items}
          cobros={cobros.items}
          totalCobros={cobros.paginacion.total}
          ventasEnCurso={ficha.serviciosEnCurso.filter((s) => s.tipo === "VENTA")}
        />
      );
      break;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CabeceraFicha propiedad={propiedad} llegoEl={ficha.cifras.llegoEl} serviciosEnCurso={ficha.serviciosEnCurso.length} activa={clave} modo={modo} />
      {contenido}
    </div>
  );
}

// El contrato arma las páginas con una función (`Pagina(...)`); aquí solo hace falta su forma.
type PaginaDeApiDe<T> = { items: T[]; paginacion: { pagina: number; porPagina: number; total: number } };
