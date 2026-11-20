// «Trabado»: lo que la jefatura tiene que destrabar. Tres cosas: servicios que llevan más de 10
// días esperando a otro, tareas atrasadas y presupuestos de maestros sin aprobar. Cada ítem lleva
// a su servicio. Los presupuestos solo traen la cuenta (la API no dice cuáles), por eso no tienen
// enlace.
import type { InicioEquipo } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { ETIQUETA_ESPERANDO_A } from "@/lib/etiquetas";
import { diasEntre } from "@/lib/formato";
import { ItemDelInicio } from "./item-con-enlace";

export function PanelTrabado({ trabado, hoy }: { trabado: InicioEquipo["trabado"]; hoy: string }) {
  const { esperandoMasDe10Dias, tareasAtrasadas, presupuestosPorAprobar } = trabado;
  const total = esperandoMasDe10Dias.length + tareasAtrasadas.length + (presupuestosPorAprobar > 0 ? 1 : 0);

  return (
    <Tarjeta>
      <TarjetaTitulo>
        <span>Trabado</span>
        <span>{total}</span>
      </TarjetaTitulo>
      {total === 0 && <Vacio texto="Nada trabado. Todo se está moviendo." className="py-6" />}

      {esperandoMasDe10Dias.map((s) => {
        const espera = s.esperando;
        const a = espera ? (espera.a === "OTRO" && espera.detalle ? espera.detalle : ETIQUETA_ESPERANDO_A[espera.a].toLowerCase()) : "";
        return (
          <ItemDelInicio
            key={s.id}
            href={`/servicios/${s.id}`}
            titulo={`${s.nombre} · ${s.propiedad.direccion}`}
            detalle={`esperando a ${a}`}
            derecha={espera && <Insignia tono="bad">{espera.dias} d</Insignia>}
          />
        );
      })}

      {tareasAtrasadas.map((t) => {
        const dias = t.vence ? diasEntre(t.vence, hoy) : 0;
        return (
          <ItemDelInicio
            key={t.id}
            href={`/servicios/${t.servicio.id}`}
            titulo={t.que}
            detalle={`${t.responsable?.nombre ?? "Sin responsable"} · ${t.propiedad.direccion}`}
            derecha={<Insignia tono="bad">{dias} d atrasada</Insignia>}
          />
        );
      })}

      {presupuestosPorAprobar > 0 && (
        <ItemDelInicio
          titulo={
            presupuestosPorAprobar === 1
              ? "1 presupuesto de maestro por aprobar"
              : `${presupuestosPorAprobar} presupuestos de maestros por aprobar`
          }
          detalle="Se aprueban en la ficha de cada obra"
          derecha={<Insignia tono="ink">plata</Insignia>}
        />
      )}
    </Tarjeta>
  );
}
