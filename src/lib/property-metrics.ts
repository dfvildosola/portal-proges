// Cálculos de la ficha de propiedad. Funciones puras: reciben lo que la página ya
// cargó y devuelven números y textos; no tocan la base.
//
// Fechas: las del dominio se guardan a medianoche UTC, así que todo se compara y
// se calcula en UTC (nunca en hora local).
import type { Currency, MovementCategory } from "@/generated/prisma/enums";
import type {
  Document as DocumentoDB,
  LeaseContract,
  Movement,
  PropertyAssessment,
  PropertyTax,
  RentCharge,
} from "@/generated/prisma/client";
import { toCLP } from "@/lib/currency";

const MS_DIA = 24 * 60 * 60 * 1000;

// Medianoche UTC del día de una fecha, en milisegundos.
function inicioDelDiaUTC(fecha: Date): number {
  return Date.UTC(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
  );
}

// ---------------------------------------------------------------------------
// Renta mensual
// ---------------------------------------------------------------------------

export type RentaMensual = { monto: number; moneda: Currency };

// Monto y moneda del contrato VIGENTE; null si no hay. Si hubiera más de uno
// vigente (no debería), toma el primero.
export function rentaMensual(
  contratos: Pick<LeaseContract, "estado" | "monto" | "moneda">[],
): RentaMensual | null {
  const vigente = contratos.find((c) => c.estado === "VIGENTE");
  if (!vigente) return null;
  return { monto: Number(vigente.monto), moneda: vigente.moneda };
}

// Renta anual en CLP: suma de TODOS los contratos VIGENTE × 12, como /resumen.
// null si no hay ninguno vigente o si alguno no se puede pasar a CLP (UF sin
// valor): /resumen lo descarta en silencio; aquí se devuelve null para no mostrar
// una rentabilidad calculada con la renta incompleta.
export function rentaAnualCLP(
  contratos: Pick<LeaseContract, "estado" | "monto" | "moneda">[],
  uf: number | null,
): number | null {
  const vigentes = contratos.filter((c) => c.estado === "VIGENTE");
  if (vigentes.length === 0) return null;
  let anual = 0;
  for (const c of vigentes) {
    const clp = toCLP(c.monto, c.moneda, uf);
    if (clp === null) return null;
    anual += clp * 12;
  }
  return anual;
}

// ---------------------------------------------------------------------------
// Costo
// ---------------------------------------------------------------------------

export type Costo = {
  // Cuotas de contribuciones con vencimiento dentro del período (CLP).
  contribuciones: number;
  // Gastos del período por categoría (CLP), de mayor a menor.
  // Sin la categoría IMPUESTO, para no contar dos veces las contribuciones.
  gastosPorCategoria: { categoria: MovementCategory; monto: number }[];
  // Contribuciones + todos los gastos (CLP).
  total: number;
  // Gastos en UF que no se pudieron pasar a CLP por no haber valor UF.
  // Si es mayor que 0, el total queda corto.
  sinConvertir: number;
};

type EntradaCosto = {
  taxes: Pick<PropertyTax, "monto" | "fechaVencimiento">[];
  movements: Pick<
    Movement,
    "tipo" | "categoria" | "monto" | "moneda" | "fecha"
  >[];
  uf: number | null;
};

// Costo en CLP entre `desde` y `hasta` (ambos incluidos): contribuciones
// (PropertyTax con monto y fechaVencimiento en el período) + gastos (Movement
// GASTO en el período, sin IMPUESTO). Las cuentas (PropertyBill) no entran:
// pagarlas no crea Movement. Las cuotas de contribuciones no tienen moneda: son CLP.
export function costoEnPeriodo({
  taxes,
  movements,
  uf,
  desde,
  hasta,
}: EntradaCosto & { desde: Date; hasta: Date }): Costo {
  const enVentana = (fecha: Date) => fecha >= desde && fecha <= hasta;

  let contribuciones = 0;
  for (const t of taxes) {
    if (t.monto === null || !enVentana(t.fechaVencimiento)) continue;
    contribuciones += Number(t.monto);
  }

  const porCategoria = new Map<MovementCategory, number>();
  let sinConvertir = 0;
  for (const m of movements) {
    if (m.tipo !== "GASTO" || m.categoria === "IMPUESTO") continue;
    if (!enVentana(m.fecha)) continue;
    const clp = toCLP(m.monto, m.moneda, uf);
    if (clp === null) {
      sinConvertir++;
      continue;
    }
    porCategoria.set(m.categoria, (porCategoria.get(m.categoria) ?? 0) + clp);
  }

  const gastosPorCategoria = [...porCategoria.entries()]
    .map(([categoria, monto]) => ({ categoria, monto }))
    .sort((a, b) => b.monto - a.monto);
  const gastos = gastosPorCategoria.reduce((suma, g) => suma + g.monto, 0);

  return {
    contribuciones,
    gastosPorCategoria,
    total: contribuciones + gastos,
    sinConvertir,
  };
}

// Costo de los últimos 12 meses: desde la medianoche UTC del día siguiente a
// hoy hace un año, hasta `now`. Así la ventana tiene 365 días y no cuenta dos
// veces la cuota o el gasto mensual que vence justo hoy.
export function costoAnual({
  taxes,
  movements,
  uf,
  now,
}: EntradaCosto & { now: Date }): Costo {
  const desde = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return costoEnPeriodo({ taxes, movements, uf, desde, hasta: now });
}

// ---------------------------------------------------------------------------
// Rentabilidad
// ---------------------------------------------------------------------------

export type Rentabilidad = { bruta: number; neta: number };

// Rentabilidad en %: bruta = renta anual ÷ valor × 100 (igual que /resumen);
// neta = (renta anual − costo anual) ÷ valor × 100. null si no hay renta o si el
// valor falta, es 0 o es negativo.
export function rentabilidad({
  rentaAnualCLP,
  costoAnualCLP,
  valorCLP,
}: {
  rentaAnualCLP: number | null;
  costoAnualCLP: number;
  valorCLP: number | null;
}): Rentabilidad | null {
  if (rentaAnualCLP === null || valorCLP === null || valorCLP <= 0) return null;
  return {
    bruta: (rentaAnualCLP / valorCLP) * 100,
    neta: ((rentaAnualCLP - costoAnualCLP) / valorCLP) * 100,
  };
}

// ---------------------------------------------------------------------------
// Días sin contrato
// ---------------------------------------------------------------------------

// Días corridos desde la fechaTermino del contrato que terminó más tarde. null
// si nunca tuvo contrato o si hay uno VIGENTE. Nunca negativo (un contrato
// terminado antes de tiempo, con fecha de término futura, cuenta 0).
export function diasSinContrato(
  contratos: Pick<LeaseContract, "estado" | "fechaTermino">[],
  now: Date,
): number | null {
  if (contratos.length === 0) return null;
  if (contratos.some((c) => c.estado === "VIGENTE")) return null;
  const ultimoTermino = Math.max(
    ...contratos.map((c) => inicioDelDiaUTC(c.fechaTermino)),
  );
  const dias = Math.floor((inicioDelDiaUTC(now) - ultimoTermino) / MS_DIA);
  return Math.max(0, dias);
}

// ---------------------------------------------------------------------------
// Tira de pagos
// ---------------------------------------------------------------------------

export type EstadoPago = "PAGADO" | "ATRASADO" | "PENDIENTE" | "SIN_COBRO";
export type PuntoDePago = { periodo: string; estado: EstadoPago };

// De más grave a menos grave: si un mes tiene más de un cobro, manda el peor.
const GRAVEDAD: Record<Exclude<EstadoPago, "SIN_COBRO">, number> = {
  ATRASADO: 3,
  PENDIENTE: 2,
  PAGADO: 1,
};

// Un punto por mes (los últimos `meses` hasta el mes de `now`, del más antiguo al
// más reciente) con su estado. Un cobro es ATRASADO si su estado es ATRASADO o si
// está PENDIENTE con fechaVencimiento < now (misma regla que alerts.ts). Un mes
// sin cobros es SIN_COBRO.
export function tiraDePagos(
  charges: Pick<RentCharge, "periodo" | "estado" | "fechaVencimiento">[],
  now: Date,
  meses = 12,
): PuntoDePago[] {
  const peorPorPeriodo = new Map<
    string,
    Exclude<EstadoPago, "SIN_COBRO">
  >();
  for (const c of charges) {
    const estado: Exclude<EstadoPago, "SIN_COBRO"> =
      c.estado === "ATRASADO" ||
      (c.estado === "PENDIENTE" && c.fechaVencimiento < now)
        ? "ATRASADO"
        : c.estado;
    const actual = peorPorPeriodo.get(c.periodo);
    if (!actual || GRAVEDAD[estado] > GRAVEDAD[actual]) {
      peorPorPeriodo.set(c.periodo, estado);
    }
  }

  const puntos: PuntoDePago[] = [];
  for (let atras = meses - 1; atras >= 0; atras--) {
    const mes = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - atras, 1),
    );
    const periodo = `${mes.getUTCFullYear()}-${String(mes.getUTCMonth() + 1).padStart(2, "0")}`;
    puntos.push({ periodo, estado: peorPorPeriodo.get(periodo) ?? "SIN_COBRO" });
  }
  return puntos;
}

// ---------------------------------------------------------------------------
// Datos al día
// ---------------------------------------------------------------------------

export type Chequeo = {
  clave: "avaluo" | "contribuciones" | "documentos";
  texto: string;
  estado: "ok" | "falta" | "vencido";
};

// Tres chequeos de la ficha: avalúo del año en curso, las 4 cuotas de
// contribuciones del año (todas con monto) y documentos vencidos (los que tienen
// fechaVencimiento anterior a now; sin fecha no se consideran).
export function datosAlDia({
  assessments,
  taxes,
  documents,
  now,
}: {
  assessments: Pick<PropertyAssessment, "anio">[];
  taxes: Pick<PropertyTax, "anio" | "cuota" | "monto">[];
  documents: Pick<DocumentoDB, "nombre" | "fechaVencimiento">[];
  now: Date;
}): Chequeo[] {
  const anio = now.getUTCFullYear();

  const hayAvaluo = assessments.some((a) => a.anio === anio);
  const avaluo: Chequeo = hayAvaluo
    ? { clave: "avaluo", texto: `Avalúo fiscal ${anio} cargado`, estado: "ok" }
    : {
        clave: "avaluo",
        texto: `Falta el avalúo fiscal ${anio}`,
        estado: "falta",
      };

  const cuotasDelAnio = taxes.filter((t) => t.anio === anio);
  const faltantes = [1, 2, 3, 4].filter(
    (n) => !cuotasDelAnio.some((t) => t.cuota === n),
  );
  const sinMonto = cuotasDelAnio.filter((t) => t.monto === null).length;
  const problemas: string[] = [];
  if (faltantes.length === 1) {
    problemas.push(`falta la cuota ${faltantes[0]}`);
  } else if (faltantes.length > 1) {
    const lista = new Intl.ListFormat("es", { type: "conjunction" }).format(
      faltantes.map(String),
    );
    problemas.push(`faltan las cuotas ${lista}`);
  }
  if (sinMonto > 0) {
    problemas.push(`${sinMonto} sin monto`);
  }
  const contribuciones: Chequeo =
    problemas.length === 0
      ? {
          clave: "contribuciones",
          texto: `Contribuciones ${anio}: las 4 cuotas, con monto`,
          estado: "ok",
        }
      : {
          clave: "contribuciones",
          texto: `Contribuciones ${anio}: ${problemas.join("; ")}`,
          estado: "falta",
        };

  const vencidos = documents.filter(
    (d) => d.fechaVencimiento !== null && d.fechaVencimiento < now,
  );
  const documentos: Chequeo =
    vencidos.length === 0
      ? { clave: "documentos", texto: "Sin documentos vencidos", estado: "ok" }
      : {
          clave: "documentos",
          texto: `${vencidos.length === 1 ? "1 documento vencido" : `${vencidos.length} documentos vencidos`}: ${vencidos.map((d) => d.nombre).join(", ")}`,
          estado: "vencido",
        };

  return [avaluo, contribuciones, documentos];
}
