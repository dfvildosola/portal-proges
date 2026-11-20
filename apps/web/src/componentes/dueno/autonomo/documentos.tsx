// La pestaña «Documentos» de la cartera: por propiedad, qué papeles faltan o están por vencer. Aquí
// solo se mira; los documentos se suben en la ficha de cada propiedad (pestaña Documentos), que es
// donde vive el archivo.
import Link from "next/link";
import { Download } from "lucide-react";
import type { DocumentoItem, DocumentosRespuesta } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Fecha } from "@/componentes/comunes/fecha";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { estiloBoton } from "@/componentes/ui/boton";
import { Insignia, type TonoDeInsignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ErrorDeApi, pedir } from "@/lib/api";
import { urlDeArchivo } from "@/lib/archivos";
import { propiedadesDelDueno } from "./datos";

const ESTADO: Record<DocumentoItem["estado"], { texto: string; tono: TonoDeInsignia }> = {
  vigente: { texto: "Al día", tono: "ok" },
  vence: { texto: "Vence pronto", tono: "warn" },
  vencido: { texto: "Vencido", tono: "bad" },
  falta: { texto: "Falta", tono: "bad" },
};

function nombreDe(item: DocumentoItem): string {
  return item.papelNombre ?? item.documento?.nombre ?? "Documento";
}

function FilaDeDocumento({ item }: { item: DocumentoItem }) {
  const estado = ESTADO[item.estado];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{nombreDe(item)}</p>
        <p className="text-xs text-soft">
          {item.documento?.fechaVencimiento ? (
            <>
              Vence el <Fecha valor={item.documento.fechaVencimiento} formato="conAnio" />
            </>
          ) : item.estado === "falta" ? (
            "No está cargado"
          ) : (
            "Sin fecha de vencimiento"
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Insignia tono={estado.tono}>{estado.texto}</Insignia>
        {item.documento && (
          <a
            href={urlDeArchivo("documento", item.documento.id)}
            className={estiloBoton({ variante: "fantasma", tamano: "chico" })}
            aria-label={`Ver ${nombreDe(item)}`}
          >
            <Download aria-hidden />
            Ver
          </a>
        )}
      </div>
    </div>
  );
}

export async function Documentos() {
  let datos;
  try {
    const propiedades = await propiedadesDelDueno();
    const documentos = await Promise.all(
      propiedades.items.map((p) => pedir<DocumentosRespuesta>(`/v1/propiedades/${p.id}/documentos`)),
    );
    datos = propiedades.items.map((propiedad, i) => ({ propiedad, documentos: documentos[i] }));
  } catch (error) {
    if (error instanceof ErrorDeApi) return <ErrorDeCarga mensaje={error.mensaje} />;
    throw error;
  }

  if (datos.length === 0) {
    return (
      <Vacio texto="Aún no tienes propiedades. Cuando las agregues, aquí verás qué papeles tiene cada una y cuáles faltan.">
        <Link href="/mi/propiedades" className="text-sm font-bold text-ink">
          Ir a Propiedades
        </Link>
      </Vacio>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {datos.map(({ propiedad, documentos }) => {
        const items = documentos.grupos.flatMap((g) => g.items);
        const conAtencion = items.filter((i) => i.estado !== "vigente");
        const alDia = items.filter((i) => i.estado === "vigente");
        return (
          <Seccion
            key={propiedad.id}
            titulo={`${propiedad.direccion}, ${propiedad.comuna}`}
            derecha={
              <Link
                href={`/mi/propiedades/${propiedad.id}?pestana=documentos`}
                className={estiloBoton({ variante: "contorno", tamano: "chico" })}
              >
                Subir documentos
              </Link>
            }
          >
            <Tarjeta className="gap-1">
              <p className="text-xs text-soft">
                {documentos.faltan === 0 && documentos.vencenPronto === 0
                  ? "Todo al día."
                  : [
                      documentos.faltan > 0 && `${documentos.faltan} ${documentos.faltan === 1 ? "papel falta" : "papeles faltan"}`,
                      documentos.vencenPronto > 0 &&
                        `${documentos.vencenPronto} ${documentos.vencenPronto === 1 ? "vence o venció" : "vencen o vencieron"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
              </p>
              {conAtencion.map((item) => (
                <FilaDeDocumento key={`${item.papel ?? item.documento?.id}`} item={item} />
              ))}
              {alDia.length > 0 && (
                <details className="pt-1">
                  <summary className="cursor-pointer text-xs font-bold text-soft">Documentos al día ({alDia.length})</summary>
                  <div className="mt-1">
                    {alDia.map((item) => (
                      <FilaDeDocumento key={`${item.papel ?? item.documento?.id}`} item={item} />
                    ))}
                  </div>
                </details>
              )}
              {items.length === 0 && <p className="text-sm text-soft">Esta propiedad todavía no tiene documentos.</p>}
            </Tarjeta>
          </Seccion>
        );
      })}
    </div>
  );
}
