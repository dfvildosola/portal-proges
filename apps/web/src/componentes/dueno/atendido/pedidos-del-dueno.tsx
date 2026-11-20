// «Tus pedidos»: lo que el dueño le ha pedido a Proges y en qué va cada cosa (GET /v1/pedidos), de
// lo más nuevo a lo más antiguo. Un pedido aceptado enlaza al seguimiento de su servicio; uno
// rechazado dice el motivo que escribió el equipo.
import Link from "next/link";
import type { Pedidos } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Fecha } from "@/componentes/comunes/fecha";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ErrorDeApi, pedir } from "@/lib/api";
import { ESTADO_DEL_PEDIDO, nombreDelServicio } from "./etiquetas-atendido";

export async function PedidosDelDueno() {
  let datos: Pedidos;
  try {
    datos = await pedir<Pedidos>("/v1/pedidos");
  } catch (error) {
    if (error instanceof ErrorDeApi) {
      return (
        <Seccion titulo="Tus pedidos">
          <ErrorDeCarga mensaje={error.mensaje} />
        </Seccion>
      );
    }
    throw error;
  }

  return (
    <Seccion titulo="Tus pedidos">
      {datos.items.length === 0 ? (
        <Vacio texto="Todavía no has hecho ningún pedido." />
      ) : (
        <ul className="flex max-w-xl flex-col gap-2">
          {datos.items.map((p) => {
            const estado = ESTADO_DEL_PEDIDO[p.estado];
            return (
              <li key={p.id}>
                <Tarjeta className="gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-extrabold break-words">
                      {nombreDelServicio(p.tipo)} · {p.propiedad.direccion}
                    </span>
                    <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                  </div>
                  <p className="text-[13px] break-words">{p.descripcion}</p>
                  <p className="text-xs text-soft">
                    Pedido <Fecha valor={p.creadoEl} formato="relativa" />
                  </p>
                  {p.estado === "RECHAZADA" && p.motivoRechazo && (
                    <p className="rounded-[10px] bg-scr px-3 py-2 text-[13px]">
                      <span className="font-bold">Por qué: </span>
                      {p.motivoRechazo}
                    </p>
                  )}
                  {p.estado === "ACEPTADA" && p.servicioId && (
                    <Link href={`/mi/servicios/${encodeURIComponent(p.servicioId)}`} className="w-fit text-xs font-bold text-ink hover:underline">
                      Ver cómo va
                    </Link>
                  )}
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      )}
    </Seccion>
  );
}
