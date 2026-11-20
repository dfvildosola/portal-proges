// El panel de venta (corretaje) de un servicio: precio y su historia, anuncios, visitas y ofertas.
// Lo usa la ficha del servicio del equipo y, en la etapa 3, el reporte del dueño: por eso recibe
// `modo`. Es un Server Component: pide sus propios datos a la API.
//
// - modo "equipo": todo, con los nombres de interesados y oferentes, y los botones para anotar.
// - modo "dueno": el reporte tal como la API se lo entrega a un dueño (sin nombres, contacto ni
//   notas internas) y sin botones. La respuesta del dueño a una oferta es de la etapa 3.
import type { EquipoRespuesta, VentaReporte, VentaReporteEquipo } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Seccion } from "@/componentes/comunes/seccion";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { ErrorDeApi, pedir, yo } from "@/lib/api";
import { hoyChile } from "@/lib/formato";
import { AnunciosVenta } from "./anuncios-venta";
import { CabeceraDeTarjeta } from "./cabecera-de-tarjeta";
import { FormularioAnuncio, FormularioOferta, FormularioPrecio, FormularioVisita } from "./formularios-venta";
import { GraficoSemanas } from "./grafico-semanas";
import { HistoriaPrecio } from "./historia-precio";
import { IndicadoresVenta } from "./indicadores-venta";
import { OfertasVenta } from "./ofertas-venta";
import { ultimosLunes } from "./semana";
import { VisitasVenta } from "./visitas-venta";

const SEMANAS_PARA_ANOTAR = 8;

// La lista de personas del equipo sirve para elegir «quién mostró». Si no carga, el formulario de
// visita simplemente no pregunta (la API toma a quien anota): se avisa en el registro del servidor
// y no se tumba el panel por eso.
async function personasDelEquipo(): Promise<{ id: string; nombre: string }[] | null> {
  try {
    const { items } = await pedir<EquipoRespuesta>("/v1/equipo");
    return items.map((p) => ({ id: p.id, nombre: p.nombre }));
  } catch (error) {
    if (error instanceof ErrorDeApi) {
      console.error("[web] No se pudo cargar el equipo para el formulario de visita:", error.mensaje);
      return null;
    }
    throw error;
  }
}

export async function PanelVenta({ servicioId, modo }: { servicioId: string; modo: "equipo" | "dueno" }) {
  const ruta = `/v1/servicios/${encodeURIComponent(servicioId)}/venta`;
  let reporte: VentaReporte | VentaReporteEquipo;
  let equipo: { id: string; nombre: string }[] | null = null;
  let yoId: string | null = null;
  try {
    if (modo === "equipo") {
      const [datos, personas, quien] = await Promise.all([
        pedir<VentaReporteEquipo>(ruta),
        personasDelEquipo(),
        yo(),
      ]);
      reporte = datos;
      equipo = personas;
      yoId = quien.tipo === "usuario" ? quien.usuario.id : null;
    } else {
      reporte = await pedir<VentaReporte>(ruta);
    }
  } catch (error) {
    if (error instanceof ErrorDeApi) return <ErrorDeCarga mensaje={error.mensaje} />;
    throw error;
  }

  const hoy = hoyChile();
  const esArriendo = reporte.tipo === "ARRIENDO";
  const palabraOferta = esArriendo ? "postulaciones" : "ofertas";
  // La API no deja escribir en un servicio cerrado: sin botones, con un aviso.
  const abierto = reporte.estado === "ABIERTO";
  const puedeEscribir = modo === "equipo" && abierto;
  const monedaPorDefecto = reporte.precio?.moneda ?? "UF";

  return (
    <Seccion titulo={esArriendo ? "Arriendo" : "Venta"}>
      <div className="flex flex-col gap-3">
        {modo === "equipo" && !abierto && (
          <p className="rounded-[10px] bg-scr px-3 py-2 text-sm text-soft">
            El servicio está cerrado: se puede mirar todo, pero ya no se anota nada nuevo.
          </p>
        )}

        <IndicadoresVenta reporte={reporte} modo={modo} palabraOferta={palabraOferta} />

        {reporte.recomendacion && (
          <Tarjeta>
            <TarjetaTitulo>{modo === "dueno" ? "Lo que te recomendamos" : "Recomendación al dueño"}</TarjetaTitulo>
            <p className="text-sm">{reporte.recomendacion.texto}</p>
          </Tarjeta>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Tarjeta>
            <CabeceraDeTarjeta
              titulo="Precio publicado"
              accion={
                puedeEscribir && (
                  <FormularioPrecio
                    servicioId={servicioId}
                    monedaPorDefecto={monedaPorDefecto}
                    hayPrecio={reporte.precio !== null}
                  />
                )
              }
            />
            <HistoriaPrecio historia={reporte.historiaPrecio} />
          </Tarjeta>
          <Tarjeta>
            <TarjetaTitulo>Consultas y visitas por semana</TarjetaTitulo>
            <GraficoSemanas semanas={reporte.porSemana} />
          </Tarjeta>
        </div>

        <Tarjeta>
          <CabeceraDeTarjeta
            titulo="Anuncios"
            accion={puedeEscribir && <FormularioAnuncio servicioId={servicioId} hoy={hoy} />}
          />
          <AnunciosVenta
            anuncios={reporte.anuncios}
            conEnlace={modo === "equipo"}
            edicion={puedeEscribir ? { servicioId, lunes: ultimosLunes(hoy, SEMANAS_PARA_ANOTAR) } : null}
          />
        </Tarjeta>

        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Tarjeta>
            <CabeceraDeTarjeta
              titulo={`Visitas · ${reporte.totales.visitas}`}
              accion={
                puedeEscribir && <FormularioVisita servicioId={servicioId} hoy={hoy} equipo={equipo} yoId={yoId} />
              }
            />
            <VisitasVenta visitas={reporte.visitas} />
          </Tarjeta>
          <Tarjeta>
            <CabeceraDeTarjeta
              titulo={esArriendo ? "Postulaciones" : "Ofertas"}
              accion={
                puedeEscribir && (
                  <FormularioOferta
                    servicioId={servicioId}
                    hoy={hoy}
                    monedaPorDefecto={monedaPorDefecto}
                    textoDelBoton={esArriendo ? "Registrar postulación" : "Registrar oferta"}
                  />
                )
              }
            />
            <OfertasVenta
              ofertas={reporte.ofertas}
              servicioId={servicioId}
              puedeMostrar={puedeEscribir}
              modo={modo}
              palabra={palabraOferta}
            />
          </Tarjeta>
        </div>
      </div>
    </Seccion>
  );
}
