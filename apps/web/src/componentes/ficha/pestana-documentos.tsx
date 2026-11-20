// Pestaña «Documentos»: los papeles de la propiedad agrupados (dominio, municipales, planos…), cada
// uno con su estado: vigente, vence pronto, vencido o falta. Un papel que falta tiene su botón para
// subirlo. Abrir un PDF pasa por una ruta de la web que lo pide a la API con la sesión de quien
// mira (nunca hay un enlace público).
import Link from "next/link";
import type { DocumentoItem, DocumentosRespuesta } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { estiloBoton } from "@/componentes/ui/boton";
import { urlDeArchivo } from "@/lib/archivos";
import { borrarDocumento } from "./acciones";
import { BotonQuitar } from "./boton-quitar";
import { ETIQUETA_ESTADO_DOCUMENTO, ETIQUETA_PAPEL, TONO_ESTADO_DOCUMENTO } from "./etiquetas-ficha";
import { FormularioDocumento } from "./formulario-documento";
import type { ModoFicha } from "./modo";
import { hrefDePestana } from "./pestanas-ficha";

type Props = {
  propiedadId: string;
  documentos: DocumentosRespuesta;
  /** Si ya está enlazada la carpeta de Drive: sin ella no se puede subir nada. */
  tieneCarpetaDrive: boolean;
  modo: ModoFicha;
};

function Fila({ item, propiedadId, tieneCarpetaDrive, modo }: { item: DocumentoItem } & Omit<Props, "documentos">) {
  const { documento } = item;
  const nombre = documento?.nombre ?? item.papelNombre ?? (item.papel ? ETIQUETA_PAPEL[item.papel] : "Documento");
  return (
    <Tarjeta tono="item">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold break-words">{nombre}</span>
        <Insignia tono={TONO_ESTADO_DOCUMENTO[item.estado]}>{ETIQUETA_ESTADO_DOCUMENTO[item.estado]}</Insignia>
      </div>
      {documento ? (
        <>
          <span className="text-xs text-soft">
            Subido <Fecha valor={documento.subidoEl} formato="conAnio" />
            {documento.subidoPor ? ` por ${documento.subidoPor}` : ""}
            {documento.fechaVencimiento && (
              <>
                {" · vence "}
                <Fecha valor={documento.fechaVencimiento} formato="conAnio" />
              </>
            )}
          </span>
          <div className="mt-1 flex items-center gap-1">
            <a
              href={urlDeArchivo("documento", documento.id)}
              target="_blank"
              rel="noopener"
              className={estiloBoton({ variante: "suave", tamano: "chico" })}
            >
              Abrir el PDF
            </a>
            {modo === "equipo" && (
              <BotonQuitar
                titulo={`Borrar «${documento.nombre}»`}
                descripcion="Se borra de la ficha y su archivo va a la papelera de Drive."
                etiqueta={`Borrar ${documento.nombre}`}
                accion={borrarDocumento.bind(null, propiedadId, documento.id)}
              />
            )}
          </div>
        </>
      ) : (
        modo === "equipo" &&
        tieneCarpetaDrive && (
          <div className="mt-1">
            <FormularioDocumento propiedadId={propiedadId} papelInicial={item.papel ?? undefined} textoBoton="Subir este papel" />
          </div>
        )
      )}
    </Tarjeta>
  );
}

export function PestanaDocumentos({ propiedadId, documentos, tieneCarpetaDrive, modo }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-soft">
          {documentos.faltan === 0 ? "No falta ningún papel." : documentos.faltan === 1 ? "Falta 1 papel." : `Faltan ${documentos.faltan} papeles.`}{" "}
          {documentos.vencenPronto > 0 &&
            (documentos.vencenPronto === 1 ? "1 documento vence pronto o ya venció." : `${documentos.vencenPronto} documentos vencen pronto o ya vencieron.`)}
        </p>
        {modo === "equipo" && tieneCarpetaDrive && <FormularioDocumento propiedadId={propiedadId} />}
      </div>

      {modo === "equipo" && !tieneCarpetaDrive && (
        <p className="rounded-[10px] bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">
          Para subir PDF, primero enlaza la carpeta de Drive de la propiedad en{" "}
          <Link href={hrefDePestana(propiedadId, "datos")} className="underline">
            Datos y ubicación
          </Link>
          .
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {documentos.grupos.map((grupo) => (
          <Tarjeta key={grupo.grupo}>
            <TarjetaTitulo>
              {grupo.nombre}
              <span>{grupo.items.length}</span>
            </TarjetaTitulo>
            {grupo.items.length === 0 ? (
              <p className="py-2 text-sm text-soft">Todavía no hay nada en este grupo.</p>
            ) : (
              grupo.items.map((item) => (
                <Fila
                  key={item.documento?.id ?? item.papel ?? item.papelNombre}
                  item={item}
                  propiedadId={propiedadId}
                  tieneCarpetaDrive={tieneCarpetaDrive}
                  modo={modo}
                />
              ))
            )}
          </Tarjeta>
        ))}
      </div>
      <p className="text-xs text-soft">Los archivos viven en la carpeta de Drive de la propiedad; la ficha los ordena y avisa lo que falta o vence.</p>
    </div>
  );
}
