// La pestaña «Arriendos» de la cartera: los contratos, los arrendatarios y los cobros del mes.
// Pide todo a la API en paralelo; si algo falla, muestra el mensaje de la API en lugar de la lista.
import Link from "next/link";
import type { Arrendatario, Cobro, Contrato } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ErrorDeApi, pedir } from "@/lib/api";
import { mesConAnio } from "@/lib/formato";
import { BotonGenerarCobros } from "./boton-generar-cobros";
import { propiedadesDelDueno, type ListaDeApi } from "./datos";
import { FilaCobro } from "./fila-cobro";
import { FormularioArrendatario } from "./formulario-arrendatario";
import { FormularioContrato } from "./formulario-contrato";
import { TarjetaContrato } from "./tarjeta-contrato";

const GRANDE = { porPagina: 100 };

export async function Arriendos({ hoy }: { hoy: string }) {
  const mes = hoy.slice(0, 7);
  let datos;
  try {
    datos = await Promise.all([
      pedir<ListaDeApi<Contrato>>("/v1/contratos", { consulta: GRANDE }),
      pedir<ListaDeApi<Arrendatario>>("/v1/arrendatarios", { consulta: GRANDE }),
      pedir<ListaDeApi<Cobro>>("/v1/cobros", { consulta: { ...GRANDE, mes } }),
      pedir<ListaDeApi<Cobro>>("/v1/cobros/atrasados", { consulta: GRANDE }),
      propiedadesDelDueno(),
    ]);
  } catch (error) {
    if (error instanceof ErrorDeApi) return <ErrorDeCarga mensaje={error.mensaje} />;
    throw error;
  }
  const [contratos, arrendatarios, delMes, atrasados, propiedades] = datos;

  // Los atrasados de cualquier mes primero (los más viejos arriba) y después lo del mes; sin repetir
  // el cobro que está en las dos listas.
  const idsAtrasados = new Set(atrasados.items.map((c) => c.id));
  const cobros = [...atrasados.items, ...delMes.items.filter((c) => !idsAtrasados.has(c.id))];

  const activos = contratos.items.filter((c) => c.estado !== "TERMINADO");
  const terminados = contratos.items.filter((c) => c.estado === "TERMINADO");
  const sinPropiedades = propiedades.items.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <Seccion titulo={`Cobros · ${mesConAnio(mes)}`} derecha={<BotonGenerarCobros mes={mes} />}>
        {cobros.length === 0 ? (
          <Vacio texto="Todavía no hay cobros. Cuando tengas un contrato vigente, prepara los cobros del mes para ir marcando los pagos." />
        ) : (
          <div className="flex flex-col gap-2">
            {cobros.map((cobro) => (
              <FilaCobro key={cobro.id} cobro={cobro} hoy={hoy} />
            ))}
          </div>
        )}
      </Seccion>

      <Seccion
        titulo="Contratos"
        derecha={
          sinPropiedades || arrendatarios.items.length === 0 ? undefined : (
            <FormularioContrato
              hoy={hoy}
              propiedades={propiedades.items.map((p) => ({ id: p.id, nombre: `${p.direccion}, ${p.comuna}` }))}
              arrendatarios={arrendatarios.items.map((a) => ({ id: a.id, nombre: a.nombre }))}
            />
          )
        }
      >
        {sinPropiedades ? (
          <Vacio texto="Para hacer un contrato primero necesitas una propiedad.">
            <Link href="/mi/propiedades" className="text-sm font-bold text-ink">
              Ir a Propiedades
            </Link>
          </Vacio>
        ) : arrendatarios.items.length === 0 ? (
          <Vacio texto="Para hacer un contrato primero agrega a quien arrienda (abajo, en «Arrendatarios»)." />
        ) : activos.length === 0 ? (
          <Vacio texto="No tienes contratos vigentes." />
        ) : (
          <div className="flex flex-col gap-2">
            {activos.map((contrato) => (
              <TarjetaContrato key={contrato.id} contrato={contrato} hoy={hoy} />
            ))}
          </div>
        )}
        {terminados.length > 0 && (
          <details className="rounded-xl border border-line bg-card p-3">
            <summary className="cursor-pointer text-sm font-bold">Contratos terminados ({terminados.length})</summary>
            <div className="mt-3 flex flex-col gap-2">
              {terminados.map((contrato) => (
                <TarjetaContrato key={contrato.id} contrato={contrato} hoy={hoy} />
              ))}
            </div>
          </details>
        )}
      </Seccion>

      <Seccion titulo="Arrendatarios" derecha={<FormularioArrendatario />}>
        {arrendatarios.items.length === 0 ? (
          <Vacio texto="Aún no has anotado a nadie que arriende." />
        ) : (
          <Tarjeta className="gap-0 p-0">
            {arrendatarios.items.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{a.nombre}</p>
                  <p className="text-xs break-words text-soft">
                    {[a.rut, a.email, a.telefono].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <FormularioArrendatario arrendatario={a} />
              </div>
            ))}
          </Tarjeta>
        )}
      </Seccion>
    </div>
  );
}
