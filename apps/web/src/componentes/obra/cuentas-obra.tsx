// Las cuentas de la obra: lo que se le cobra al dueño, lo que cuestan los maestros (aprobado,
// facturado, pagado), lo planificado contra lo real y el margen. Todo llega calculado por la API
// (un número vive en un solo lugar): aquí solo se escribe, sin sumar ni restar plata.
import type { Monto as MontoDeApi, ObraEquipo } from "@proges/contrato";
import { Monto } from "@/componentes/comunes/monto";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { cn } from "@/lib/utils";
import { signoDeMonto } from "./etiquetas-obra";
import { LineaVacia } from "./linea-vacia";

function Fila({ etiqueta, children, fuerte = false }: { etiqueta: string; children: React.ReactNode; fuerte?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 border-b border-line py-1.5 text-[13px] last:border-b-0", fuerte && "font-bold")}>
      <dt className={fuerte ? "" : "text-soft"}>{etiqueta}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

// Una diferencia de costo: en rojo si costó más de lo planificado, en verde si costó menos.
function DiferenciaDeCosto({ valor }: { valor: MontoDeApi }) {
  const signo = signoDeMonto(valor.valor);
  return <Monto valor={valor} className={signo > 0 ? "text-bad" : signo < 0 ? "text-ok" : undefined} />;
}

function DiferenciaDeDias({ dias }: { dias: number | null }) {
  if (dias === null) return <span className="text-soft">—</span>;
  const texto = dias === 0 ? "justo en plazo" : dias > 0 ? `${dias} días de más` : `${-dias} días de menos`;
  return <span className={dias > 0 ? "text-bad" : dias < 0 ? "text-ok" : undefined}>{texto}</span>;
}

// ¿Todos los montos que trae la obra son cero o no existen? Solo mira lo que la API ya calculó
// (`signoDeMonto` lee el texto, sin sumar nada). El plazo planificado también cuenta como dato:
// viene de un presupuesto aprobado, y esconderlo sería esconder algo que ya se cargó.
function sinMontos({ cuentas, planContraReal: plan, margen, orden }: ObraEquipo): boolean {
  const montos = [
    orden?.total,
    ...Object.values(cuentas),
    plan.costo.planificado,
    plan.costo.real,
    plan.costo.diferencia,
    margen?.precioDueno,
    margen?.planificado,
    margen?.real,
  ];
  const todosEnCero = montos.every((m) => !m || signoDeMonto(m.valor) === 0);
  return todosEnCero && plan.plazo.planificado === null;
}

export function CuentasObra({ obra }: { obra: ObraEquipo }) {
  const { cuentas, planContraReal: plan, margen, orden } = obra;
  const abierta = obra.estado === "ABIERTO";
  // Con todo en cero, una lista de «$ 0» y «—» no dice nada: mejor una sola línea que explique por qué.
  if (sinMontos(obra)) {
    return (
      <LineaVacia
        titulo="Plata"
        texto="todavía no hay montos: aparecen cuando se enlaza la orden de Odoo y se cargan presupuestos o facturas."
      />
    );
  }
  return (
    <Tarjeta>
      <TarjetaTitulo>Plata</TarjetaTitulo>
      <dl>
        <Fila etiqueta="Al dueño (orden de Odoo)">
          <Monto valor={orden?.total} />
        </Fila>
        <Fila etiqueta="Maestros: aprobado"><Monto valor={cuentas.aprobado} /></Fila>
        <Fila etiqueta="Maestros: adicionales aprobados"><Monto valor={cuentas.adicionales} /></Fila>
        <Fila etiqueta="Maestros: facturado"><Monto valor={cuentas.facturado} /></Fila>
        <Fila etiqueta="Maestros: pagado"><Monto valor={cuentas.pagado} /></Fila>
        <Fila etiqueta="Falta pagarles" fuerte><Monto valor={cuentas.saldo} /></Fila>
      </dl>

      <TarjetaTitulo className="mt-2">Lo planificado contra lo real</TarjetaTitulo>
      <dl>
        <Fila etiqueta="Costo planificado"><Monto valor={plan.costo.planificado} /></Fila>
        <Fila etiqueta="Costo real (facturado)"><Monto valor={plan.costo.real} /></Fila>
        <Fila etiqueta="Diferencia de costo"><DiferenciaDeCosto valor={plan.costo.diferencia} /></Fila>
        <Fila etiqueta="Plazo planificado">{plan.plazo.planificado !== null ? `${plan.plazo.planificado} días` : <span className="text-soft">—</span>}</Fila>
        <Fila etiqueta={abierta ? "Días desde el inicio" : "Días que tomó"}>
          {plan.plazo.real !== null ? `${plan.plazo.real} días` : <span className="text-soft">falta la fecha de inicio</span>}
        </Fila>
        <Fila etiqueta="Diferencia de plazo"><DiferenciaDeDias dias={plan.plazo.diferencia} /></Fila>
        <Fila etiqueta="Partidas conformes">
          {plan.partidas.conformes} de {plan.partidas.total}
        </Fila>
      </dl>

      <TarjetaTitulo className="mt-2">Margen</TarjetaTitulo>
      {margen ? (
        <dl>
          <Fila etiqueta="Precio al dueño"><Monto valor={margen.precioDueno} /></Fila>
          <Fila etiqueta="Margen esperado" fuerte><Monto valor={margen.planificado} /></Fila>
          <Fila etiqueta={abierta ? "Margen real (provisorio)" : "Margen real"} fuerte><Monto valor={margen.real} /></Fila>
        </dl>
      ) : (
        <p className="text-sm text-soft">El margen aparece cuando la orden está enlazada y en pesos.</p>
      )}
    </Tarjeta>
  );
}
