// Inicio del dueño autónomo: cómo va el mes, lo que vence pronto y el camino a su cartera y a
// pedirle algo a Proges. Pide a la API en paralelo; si falla una pieza, esa pieza avisa y el resto
// se ve igual.
import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import type { PropiedadesPagina, ResumenCartera, VencimientosRespuesta } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { estiloBoton } from "@/componentes/ui/boton";
import { ErrorDeApi, pedir, yo } from "@/lib/api";
import { FilaVencimiento } from "./autonomo/fila-vencimiento";
import { losMasCercanos } from "./autonomo/orden-vencimientos";
import { TarjetasDelMes } from "./autonomo/tarjetas-del-mes";

// Pide algo que puede fallar sin tumbar la pantalla: devuelve el dato o el mensaje de la API.
// (`pedir` ya manda a la pantalla que corresponde cuando es un problema de sesión o de permiso.)
async function intentar<T>(trabajo: Promise<T>): Promise<{ dato: T } | { error: string }> {
  try {
    return { dato: await trabajo };
  } catch (error) {
    if (error instanceof ErrorDeApi) return { error: error.mensaje };
    throw error;
  }
}

export async function InicioAutonomo() {
  const [quien, resumen, vencimientos, propiedades] = await Promise.all([
    yo(),
    intentar(pedir<ResumenCartera>("/v1/cartera/resumen")),
    intentar(pedir<VencimientosRespuesta>("/v1/vencimientos")),
    intentar(pedir<PropiedadesPagina>("/v1/propiedades", { consulta: { porPagina: 1 } })),
  ]);
  const nombre = quien.tipo === "usuario" ? quien.usuario.nombre : (quien.cliente?.nombre ?? "");
  const cuantas = "dato" in propiedades ? propiedades.dato.paginacion.total : null;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoDePagina
        titulo={`Hola, ${nombre}`}
        subtitulo={
          cuantas === null
            ? "Tú llevas tu cartera; Proges te ayuda cuando se lo pides."
            : `${cuantas} ${cuantas === 1 ? "propiedad" : "propiedades"} · las llevas tú, Proges te ayuda cuando se lo pides`
        }
      >
        <Link href="/mi/cartera" className={estiloBoton({ variante: "contorno" })}>
          <Wallet aria-hidden />
          Mi cartera
        </Link>
        <Link href="/mi/pedir" className={estiloBoton()}>
          Pedir a Proges
        </Link>
      </EncabezadoDePagina>

      {"dato" in resumen ? <TarjetasDelMes resumen={resumen.dato} /> : <ErrorDeCarga mensaje={resumen.error} />}

      <Seccion
        titulo="Lo que viene"
        derecha={
          <Link href="/mi/vencimientos" className="inline-flex items-center gap-1 text-xs font-bold text-ink">
            Ver todos
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
      >
        {"error" in vencimientos ? (
          <ErrorDeCarga mensaje={vencimientos.error} />
        ) : vencimientos.dato.items.length === 0 ? (
          <Vacio texto="No tienes nada por vencer ni atrasado. Todo al día." />
        ) : (
          <div className="flex flex-col gap-2">
            {losMasCercanos(vencimientos.dato.items, 5).map((item) => (
              <FilaVencimiento key={item.clave} item={item} />
            ))}
          </div>
        )}
      </Seccion>
    </div>
  );
}
