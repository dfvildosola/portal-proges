// El panel de la obra de un servicio: la orden de Odoo, las partidas con su avance y su recepción,
// los presupuestos y las facturas de los maestros, las cuentas y el cierre (ADR 0014 y 0015).
// Lo usan la ficha del servicio del equipo y, en la etapa 3, la del dueño: por eso recibe `modo`.
//
//  - modo «equipo»: todo, con los formularios. Aprobar presupuestos y cerrar la obra solo los ve
//    quien tiene la marca de jefatura (la API además lo exige).
//  - modo «dueno»: solo lo que la API le entrega al dueño (la orden, el avance y la recepción).
//    Nada del maestro: ni el componente lo dibuja ni la API lo manda.
//
// Es un Server Component: pide sus propios datos a la API. Los formularios son componentes de
// cliente que guardan con las acciones de `acciones.ts`.
import type { EquipoRespuesta, MaestrosRespuesta, ObraRespuesta } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Seccion } from "@/componentes/comunes/seccion";
import { Insignia } from "@/componentes/ui/insignia";
import { ErrorDeApi, pedir, yo } from "@/lib/api";
import { CierreObra } from "./cierre-obra";
import { CuentasObra } from "./cuentas-obra";
import { FacturasObra } from "./facturas-obra";
import { OrdenObra } from "./orden-obra";
import { PartidasObra } from "./partidas-obra";
import { PresupuestosObra } from "./presupuestos-obra";
import { ResumenObra } from "./resumen-obra";
import { VistaObraDueno } from "./vista-obra-dueno";

export async function PanelObra({ servicioId, modo }: { servicioId: string; modo: "equipo" | "dueno" }) {
  const ruta = `/v1/servicios/${encodeURIComponent(servicioId)}/obra`;
  let obra: ObraRespuesta;
  try {
    obra = await pedir<ObraRespuesta>(ruta);
  } catch (error) {
    if (error instanceof ErrorDeApi) return <ErrorDeCarga mensaje={error.mensaje} />;
    throw error;
  }

  // La API decide qué le entrega a cada quien: lo que llega como «dueno» se dibuja recortado.
  if (obra.vista === "dueno") return <VistaObraDueno obra={obra} />;
  if (modo === "dueno") {
    return <ErrorDeCarga mensaje="La vista del dueño solo se arma con lo que la API le entrega al dueño." />;
  }

  // Lo que solo el equipo necesita para elegir (maestros, responsables) y si es jefatura. Se pide
  // después de saber que la vista es del equipo: a un dueño estas rutas le dan 403.
  let maestros: MaestrosRespuesta, equipo: EquipoRespuesta;
  try {
    [maestros, equipo] = await Promise.all([pedir<MaestrosRespuesta>("/v1/maestros"), pedir<EquipoRespuesta>("/v1/equipo")]);
  } catch (error) {
    if (error instanceof ErrorDeApi) return <ErrorDeCarga mensaje={error.mensaje} />;
    throw error;
  }
  const quien = await yo();
  const esJefatura = quien.tipo === "usuario" && quien.marcas.jefatura;

  const editable = obra.estado === "ABIERTO";
  const maestrosActivos = maestros.items.filter((m) => m.activo).map(({ id, nombre }) => ({ id, nombre }));
  const personas = equipo.items.map(({ id, nombre }) => ({ id, nombre }));

  return (
    <Seccion
      titulo="Obra"
      derecha={
        obra.estado === "ABIERTO" ? (
          <span className="text-xs text-soft">solo equipo</span>
        ) : (
          <Insignia tono={obra.estado === "TERMINADO" ? "ok" : "neutro"}>{obra.estado === "TERMINADO" ? "Cerrada" : "Cancelada"}</Insignia>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {obra.odooError && <ErrorDeCarga mensaje={`No se pudo leer Odoo: ${obra.odooError} Las facturas se muestran sin su estado.`} />}
        <ResumenObra obra={obra} editable={editable} />
        <OrdenObra servicioId={obra.servicioId} orden={obra.orden} editable={editable} />
        <PartidasObra servicioId={obra.servicioId} partidas={obra.partidas} maestros={maestrosActivos} equipo={personas} editable={editable} />
        <PresupuestosObra
          servicioId={obra.servicioId}
          presupuestos={obra.presupuestos}
          partidas={obra.partidas}
          maestros={maestrosActivos}
          esJefatura={esJefatura}
          editable={editable}
        />
        <FacturasObra servicioId={obra.servicioId} facturas={obra.facturas} maestros={maestrosActivos} editable={editable} />
        <CuentasObra obra={obra} />
        <CierreObra
          servicioId={obra.servicioId}
          estado={obra.estado}
          sePuedeCerrar={obra.sePuedeCerrar}
          recepcion={obra.recepcion}
          esJefatura={esJefatura}
        />
      </div>
    </Seccion>
  );
}
