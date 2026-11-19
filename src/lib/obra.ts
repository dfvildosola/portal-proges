// Las cuentas de una obra, como funciones puras: reciben datos simples y devuelven números.
//
// No tocan la base ni Odoo (quien llama les pasa lo que leyó), así la pantalla de la obra, la
// del cierre y las pruebas usan LA MISMA cuenta: un número vive en un solo lugar. Y no se
// guardan: se calculan cada vez que se mira.
//
// Plata: la base guarda Decimal; acá entra como `number` (pesos, con a lo más dos decimales) y
// cada resultado se redondea a centavos para que sumar muchas facturas no arrastre error de
// coma flotante. Todo en pesos chilenos: el presupuesto del maestro y sus facturas son CLP.

// ---- Lo que entra ----------------------------------------------------------

export type PresupuestoCuenta = {
  tipo: "ORIGINAL" | "ADICIONAL";
  estado: "RECIBIDO" | "APROBADO" | "RECHAZADO";
  total: number;
  plazoDias?: number | null;
};

// Una factura del maestro asignada al proyecto, de una de dos clases:
//  - de Odoo: el portal guardó solo cuánto asignó; el total, el estado y lo pendiente de pago
//    se leyeron de Odoo al mirar (nunca hay dos versiones de lo mismo);
//  - manual: una factura «fuera de Odoo» que el equipo anotó a mano, con su casilla «pagada».
export type FacturaCuenta =
  | {
      origen: "odoo";
      montoAsignado: number;
      total: number;
      pendiente: number;
      estado: "borrador" | "publicada" | "anulada";
    }
  | { origen: "manual"; montoAsignado: number; pagada: boolean };

export type PartidaCuenta = {
  avance: number; // 0 a 100
  precioDueno?: number | null;
  recepcion: "PENDIENTE" | "CONFORME" | "OBSERVADA";
  // Una línea que Odoo ya no trae: no cuenta para el avance ni para recibir la obra.
  quitadaEnOdoo?: boolean;
};

// ---- Utilidades ------------------------------------------------------------

const centavos = (n: number) => Math.round(n * 100) / 100;
const suma = (numeros: number[]) => centavos(numeros.reduce((a, b) => a + b, 0));

const vigentes = (partidas: PartidaCuenta[]) => partidas.filter((p) => !p.quitadaEnOdoo);

// ---- Plata -----------------------------------------------------------------

// Lo aprobado del presupuesto original (lo que se acordó con el maestro).
export function aprobado(presupuestos: PresupuestoCuenta[]): number {
  return suma(presupuestos.filter((p) => p.estado === "APROBADO" && p.tipo === "ORIGINAL").map((p) => p.total));
}

// Lo aprobado como cambio de alcance durante la obra.
export function adicionales(presupuestos: PresupuestoCuenta[]): number {
  return suma(presupuestos.filter((p) => p.estado === "APROBADO" && p.tipo === "ADICIONAL").map((p) => p.total));
}

// Lo que los maestros han facturado a este proyecto: la suma de lo asignado.
export function facturado(facturas: FacturaCuenta[]): number {
  return suma(facturas.map((f) => f.montoAsignado));
}

// Lo que ya se pagó. Solo cuenta lo que realmente se pagó:
//  - una factura de Odoo cuenta la parte pagada (total − pendiente), en la proporción de lo
//    asignado a este proyecto (si se asignó la mitad de la factura, cuenta la mitad de su
//    pago). Si está en borrador o anulada no hay nada pagado, aunque Odoo muestre un saldo;
//  - una manual cuenta todo lo asignado si el equipo la marcó pagada.
export function pagado(facturas: FacturaCuenta[]): number {
  return suma(
    facturas.map((f) => {
      if (f.origen === "manual") return f.pagada ? f.montoAsignado : 0;
      if (f.estado !== "publicada" || f.total <= 0) return 0;
      const pagadoEnOdoo = Math.min(Math.max(f.total - f.pendiente, 0), f.total);
      return (f.montoAsignado * pagadoEnOdoo) / f.total;
    }),
  );
}

// Lo que falta pagarle a los maestros: lo aprobado más los adicionales, menos lo pagado.
export function saldo(presupuestos: PresupuestoCuenta[], facturas: FacturaCuenta[]): number {
  return centavos(aprobado(presupuestos) + adicionales(presupuestos) - pagado(facturas));
}

// Cuánto de una factura de Odoo se puede asignar todavía a un proyecto: su total menos lo ya
// asignado en otros proyectos (o en este mismo). La suma asignada nunca pasa el total.
export function asignableRestante(totalFactura: number, yaAsignado: number): number {
  return Math.max(centavos(totalFactura - yaAsignado), 0);
}

// Las cuentas juntas, para la pantalla.
export type CuentasObra = {
  aprobado: number;
  adicionales: number;
  facturado: number;
  pagado: number;
  saldo: number;
};

export function cuentasDeObra(presupuestos: PresupuestoCuenta[], facturas: FacturaCuenta[]): CuentasObra {
  return {
    aprobado: aprobado(presupuestos),
    adicionales: adicionales(presupuestos),
    facturado: facturado(facturas),
    pagado: pagado(facturas),
    saldo: saldo(presupuestos, facturas),
  };
}

// ---- Avance y recepción ----------------------------------------------------

// El avance de toda la obra (0 a 100, con un decimal): cada partida pesa según su precio al
// dueño, porque terminar el 100 % de una partida grande vale más que el de una chica. Si
// ninguna partida tiene precio, es el promedio simple. Las partidas sin precio no pesan cuando
// otras sí lo tienen. Sin partidas, 0.
export function avancePonderado(partidas: PartidaCuenta[]): number {
  const lista = vigentes(partidas);
  if (lista.length === 0) return 0;
  const conPrecio = lista.filter((p) => (p.precioDueno ?? 0) > 0);
  const resultado =
    conPrecio.length === 0
      ? lista.reduce((a, p) => a + p.avance, 0) / lista.length
      : conPrecio.reduce((a, p) => a + p.avance * (p.precioDueno ?? 0), 0) /
        conPrecio.reduce((a, p) => a + (p.precioDueno ?? 0), 0);
  return Math.round(resultado * 10) / 10;
}

export type ResumenRecepcion = { conformes: number; observadas: number; pendientes: number; total: number };

export function resumenRecepcion(partidas: PartidaCuenta[]): ResumenRecepcion {
  const lista = vigentes(partidas);
  return {
    conformes: lista.filter((p) => p.recepcion === "CONFORME").length,
    observadas: lista.filter((p) => p.recepcion === "OBSERVADA").length,
    pendientes: lista.filter((p) => p.recepcion === "PENDIENTE").length,
    total: lista.length,
  };
}

// Una obra solo se cierra con todas sus partidas conformes (d16): ninguna pendiente ni observada.
export function obraSePuedeCerrar(partidas: PartidaCuenta[]): boolean {
  const r = resumenRecepcion(partidas);
  return r.pendientes === 0 && r.observadas === 0;
}

// ---- Plan contra real ------------------------------------------------------

// El plazo que se planificó: el del maestro que más se demora entre los presupuestos aprobados
// (los maestros trabajan a la vez, no uno después de otro). null si ninguno trae plazo.
export function plazoPlanificadoDias(presupuestos: PresupuestoCuenta[]): number | null {
  const plazos = presupuestos
    .filter((p) => p.estado === "APROBADO" && p.plazoDias != null)
    .map((p) => p.plazoDias as number);
  return plazos.length === 0 ? null : Math.max(...plazos);
}

// Días entre dos fechas civiles (medianoche UTC), sin que la hora local cambie el resultado.
function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / 86_400_000);
}

export type PlanContraReal = {
  costo: { planificado: number; real: number; diferencia: number }; // diferencia > 0: costó más
  plazo: { planificado: number | null; real: number | null; diferencia: number | null }; // días
  partidas: ResumenRecepcion;
};

// Lo planificado contra lo real, para el cierre de la obra:
//  - costo: lo aprobado + adicionales contra lo facturado por los maestros;
//  - plazo: el plazo planificado contra los días reales desde `inicioObra` hasta `hasta` (hoy,
//    o el día del cierre). Sin fecha de inicio, el plazo real no se puede calcular;
//  - partidas: cuántas quedaron conformes, observadas o pendientes.
export function planContraReal(entrada: {
  presupuestos: PresupuestoCuenta[];
  facturas: FacturaCuenta[];
  partidas: PartidaCuenta[];
  inicioObra: Date | null;
  hasta: Date;
}): PlanContraReal {
  const planificado = centavos(aprobado(entrada.presupuestos) + adicionales(entrada.presupuestos));
  const real = facturado(entrada.facturas);
  const plazoPlan = plazoPlanificadoDias(entrada.presupuestos);
  const plazoReal = entrada.inicioObra ? diasEntre(entrada.inicioObra, entrada.hasta) : null;
  return {
    costo: { planificado, real, diferencia: centavos(real - planificado) },
    plazo: {
      planificado: plazoPlan,
      real: plazoReal,
      diferencia: plazoPlan !== null && plazoReal !== null ? plazoReal - plazoPlan : null,
    },
    partidas: resumenRecepcion(entrada.partidas),
  };
}
