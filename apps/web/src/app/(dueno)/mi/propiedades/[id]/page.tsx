// /mi/propiedades/[id]: la ficha de la propiedad, como la ve el dueño. La cabecera, el resumen y el
// historial son del portal del dueño (sus enlaces van a /mi/…); reparaciones, documentos y datos son
// los mismos componentes de la ficha del equipo (componentes/ficha) con modo="dueno": la API ya le
// recorta lo que no debe ver y esos componentes no dibujan botones de edición. La pestaña viaja
// en la dirección: `?pestana=historial`.
import type { Metadata } from "next";
import type {
  DocumentosRespuesta,
  FichaReparaciones,
  FichaResumen,
  HistorialCategoria,
  HistorialPagina,
  PropiedadAvaluo,
  PropiedadDueno,
  PropiedadUnidad,
} from "@proges/contrato";
import { CabeceraDelDueno, HistorialDelDueno, pestanaDelDueno, ResumenDelDueno } from "@/componentes/dueno/atendido/ficha-del-dueno";
import { PestanaDatos } from "@/componentes/ficha/pestana-datos";
import { PestanaDocumentos } from "@/componentes/ficha/pestana-documentos";
import { PestanaReparaciones } from "@/componentes/ficha/pestana-reparaciones";
import { pedir } from "@/lib/api";

export const metadata: Metadata = { title: "Propiedad" };

const FILTROS_DE_HISTORIAL: HistorialCategoria[] = ["reparaciones", "papeles", "visitas", "venta-arriendo"];
const POR_PAGINA_HISTORIAL = 30;

type Consulta = Record<string, string | string[] | undefined>;
const uno = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor) || undefined;

export default async function Pagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Consulta> }) {
  const [{ id }, consulta] = await Promise.all([params, searchParams]);
  const clave = pestanaDelDueno(uno(consulta.pestana));
  const ruta = `/v1/propiedades/${encodeURIComponent(id)}`;
  const modo = "dueno" as const;

  // La cabecera necesita el resumen en toda pestaña; lo demás se pide según la pestaña abierta.
  const ficha = await pedir<FichaResumen>(ruta);
  const { propiedad } = ficha;

  let contenido: React.ReactNode;
  switch (clave) {
    case "resumen":
      contenido = <ResumenDelDueno ficha={ficha} />;
      break;
    case "historial": {
      const tipo = FILTROS_DE_HISTORIAL.find((f) => f === uno(consulta.tipo));
      const pagina = Math.max(1, Number.parseInt(uno(consulta.pagina) ?? "1", 10) || 1);
      const historial = await pedir<HistorialPagina>(`${ruta}/historial`, { consulta: { tipo, pagina, porPagina: POR_PAGINA_HISTORIAL } });
      contenido = <HistorialDelDueno propiedadId={id} historial={historial} filtro={tipo} />;
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
      const [unidades, avaluos, duenos] = await Promise.all([
        pedir<PropiedadUnidad[]>(`${ruta}/unidades`),
        pedir<PropiedadAvaluo[]>(`${ruta}/avaluos`),
        pedir<PropiedadDueno[]>(`${ruta}/duenos`),
      ]);
      // La lista de «dueños del cliente» solo sirve para elegir a quién agregar, y el dueño no edita.
      contenido = <PestanaDatos propiedad={propiedad} unidades={unidades} avaluos={avaluos} duenos={duenos} duenosDelCliente={[]} modo={modo} />;
      break;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CabeceraDelDueno propiedad={propiedad} llegoEl={ficha.cifras.llegoEl} serviciosEnCurso={ficha.serviciosEnCurso.length} activa={clave} />
      {contenido}
    </div>
  );
}
