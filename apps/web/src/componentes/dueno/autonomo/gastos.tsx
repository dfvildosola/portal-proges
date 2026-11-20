// La pestaña «Gastos y contribuciones» de la cartera: las cuentas que el dueño paga por sus
// propiedades (luz, agua, gasto común…) y las cuotas del impuesto territorial. Lo por pagar va
// arriba; lo ya pagado queda recogido para no tapar lo que importa.
import Link from "next/link";
import type { Contribucion, Gasto } from "@proges/contrato";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { ErrorDeApi, pedir } from "@/lib/api";
import { propiedadesDelDueno, type ListaDeApi } from "./datos";
import { FilaCuota } from "./fila-cuota";
import { FilaGasto } from "./fila-gasto";
import { FormularioContribucion } from "./formulario-contribucion";
import { FormularioCuotasDelAnio } from "./formulario-cuotas-del-anio";
import { FormularioGasto } from "./formulario-gasto";

const GRANDE = { porPagina: 100 };

export async function Gastos({ hoy }: { hoy: string }) {
  let datos;
  try {
    datos = await Promise.all([
      pedir<ListaDeApi<Gasto>>("/v1/gastos", { consulta: GRANDE }),
      pedir<ListaDeApi<Contribucion>>("/v1/contribuciones", { consulta: GRANDE }),
      propiedadesDelDueno(),
    ]);
  } catch (error) {
    if (error instanceof ErrorDeApi) return <ErrorDeCarga mensaje={error.mensaje} />;
    throw error;
  }
  const [gastos, cuotas, propiedades] = datos;

  const opciones = propiedades.items.map((p) => ({ id: p.id, nombre: `${p.direccion}, ${p.comuna}` }));
  const direccionDe = (id: string) => propiedades.items.find((p) => p.id === id)?.direccion ?? "Propiedad";
  const sinPropiedades = opciones.length === 0;

  const gastosPorPagar = gastos.items.filter((g) => g.estado === "PENDIENTE");
  const gastosPagados = gastos.items.filter((g) => g.estado === "PAGADA");
  // Las cuotas vienen de la más nueva a la más antigua; por pagar se leen mejor de la más próxima a la más lejana.
  const cuotasPorPagar = cuotas.items.filter((c) => c.estado === "PENDIENTE").sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  const cuotasPagadas = cuotas.items.filter((c) => c.estado === "PAGADA");

  const sinPropiedad = (
    <Vacio texto="Para anotar algo primero necesitas una propiedad.">
      <Link href="/mi/propiedades" className="text-sm font-bold text-ink">
        Ir a Propiedades
      </Link>
    </Vacio>
  );

  return (
    <div className="flex flex-col gap-6">
      <Seccion titulo="Cuentas de las propiedades" derecha={sinPropiedades ? undefined : <FormularioGasto propiedades={opciones} hoy={hoy} />}>
        {sinPropiedades ? (
          sinPropiedad
        ) : gastos.items.length === 0 ? (
          <Vacio texto="Aún no has anotado cuentas (gasto común, luz, agua, gas)." />
        ) : (
          <>
            {gastosPorPagar.length === 0 ? (
              <Vacio texto="No tienes cuentas por pagar." />
            ) : (
              <div className="flex flex-col gap-2">
                {gastosPorPagar.map((g) => (
                  <FilaGasto key={g.id} gasto={g} direccion={direccionDe(g.propiedadId)} hoy={hoy} />
                ))}
              </div>
            )}
            {gastosPagados.length > 0 && (
              <details className="rounded-xl border border-line bg-card p-3">
                <summary className="cursor-pointer text-sm font-bold">Cuentas ya pagadas ({gastosPagados.length})</summary>
                <div className="mt-3 flex flex-col gap-2">
                  {gastosPagados.map((g) => (
                    <FilaGasto key={g.id} gasto={g} direccion={direccionDe(g.propiedadId)} hoy={hoy} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </Seccion>

      <Seccion
        titulo="Contribuciones"
        derecha={
          sinPropiedades ? undefined : (
            <div className="flex flex-wrap items-center justify-end gap-1">
              <FormularioCuotasDelAnio propiedades={opciones} hoy={hoy} />
              <FormularioContribucion propiedades={opciones} hoy={hoy} />
            </div>
          )
        }
      >
        {sinPropiedades ? (
          sinPropiedad
        ) : cuotas.items.length === 0 ? (
          <Vacio texto="Aún no has anotado cuotas de contribuciones. Puedes crear las cuatro del año de una vez." />
        ) : (
          <>
            {cuotasPorPagar.length === 0 ? (
              <Vacio texto="No tienes cuotas por pagar." />
            ) : (
              <div className="flex flex-col gap-2">
                {cuotasPorPagar.map((c) => (
                  <FilaCuota key={c.id} cuota={c} direccion={direccionDe(c.propiedadId)} hoy={hoy} />
                ))}
              </div>
            )}
            {cuotasPagadas.length > 0 && (
              <details className="rounded-xl border border-line bg-card p-3">
                <summary className="cursor-pointer text-sm font-bold">Cuotas ya pagadas ({cuotasPagadas.length})</summary>
                <div className="mt-3 flex flex-col gap-2">
                  {cuotasPagadas.map((c) => (
                    <FilaCuota key={c.id} cuota={c} direccion={direccionDe(c.propiedadId)} hoy={hoy} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </Seccion>
    </div>
  );
}
