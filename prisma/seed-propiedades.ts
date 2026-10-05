// Arma las 80 propiedades del guion de ejemplo como datos puros: no escribe en
// la base. `seed.ts` toma el resultado y lo guarda.
//
// De dónde salen: las 45 reales vienen de `prisma/datos-reales.json` (ROL,
// dirección, comuna, tipo, m², avalúo y tasación; el archivo no va a GitHub) y las
// 35 restantes son inventadas, de tipos de arriendo. Si el archivo no existe,
// las 80 son inventadas.
//
// «Hoy» es HOY_FICHA (2026-10-01): todos los estados y fechas se calculan desde ahí.

import fs from "node:fs";
import path from "node:path";
import { PropertyType } from "../src/generated/prisma/enums";
import type { PropertyGoal, PropertyStatus } from "../src/generated/prisma/enums";
import {
  FUENTES, BANCOS, HOY_FICHA, N_PROPIEDADES, OWNERS, PLAN_INVENTADAS, TENANTS, UF_HOY,
  addDias, azar, addMonths, comunaInfo, date, elegir, entre, enteroEntre, mesIndice, mezclar,
  pick, planRelleno, primerDia, redondear, rolSII, ultimoDia,
  type Moneda, type PlanInventada, type TipoInventado,
} from "./seed-datos";

// ---------------------------------------------------------------------------
// Forma de cada propiedad lista para guardar
// ---------------------------------------------------------------------------

export type CobroSpec = {
  periodo: string;
  fechaVencimiento: Date;
  estado: "PENDIENTE" | "PAGADO" | "ATRASADO";
  fechaPago: Date | null;
  montoPagado: number | null;
  interesMora: number | null;
};

export type ContratoSpec = {
  tenant: number; // posición en TENANTS
  monto: number;
  moneda: Moneda;
  reajuste: "NINGUNO" | "IPC" | "UF";
  fechaInicio: Date;
  fechaTermino: Date;
  diaPago: number;
  terminado: boolean; // true: ya terminó (lleva fechaSalida)
  cobros: CobroSpec[];
};

export type GastoSpec = {
  categoria: "GASTO_COMUN" | "REPARACION" | "SEGURO";
  monto: number;
  fecha: Date;
  descripcion: string;
};

export type ContribucionSpec = {
  cuota: number;
  monto: number;
  fechaVencimiento: Date;
  estado: "PENDIENTE" | "PAGADA";
  fechaPago: Date | null;
};

export type CuentaSpec = {
  tipo: "GASTO_COMUN" | "LUZ" | "AGUA" | "GAS";
  periodo: string;
  monto: number;
  fechaVencimiento: Date;
  estado: "PENDIENTE" | "PAGADA";
  fechaPago: Date | null;
};

export type AnexoSpec = {
  tipo: "ESTACIONAMIENTO" | "BODEGA";
  numero: string;
  rolSII: string;
  avaluoFiscal: number;
};

export type PropiedadSpec = {
  real: boolean;
  rolSII: string;
  tipo: PropertyType;
  direccion: string;
  comuna: string;
  region: string;
  objetivo: PropertyGoal;
  estado: PropertyStatus;
  monedaPrincipal: Moneda;
  m2Construidos: number | null;
  m2Terreno: number | null;
  anoConstruccion: number | null;
  valorComercial: number;
  valorComercialMoneda: Moneda;
  valorComercialFecha: Date;
  valorComercialFuente: (typeof FUENTES)[number];
  compra: { fecha: Date; precio: number; moneda: Moneda } | null;
  deuda: { saldo: number; fecha: Date; banco: string; dividendo: number; termino: Date } | null;
  exentaContribuciones: boolean;
  avaluoFiscal: number; // pesos, año 2026
  updatedAt: Date | null; // solo las desocupadas: la alerta de «desocupada» la mide desde acá
  duenos: { owner: number; porcentaje: number }[]; // posición en OWNERS
  etiquetas: string[];
  anexos: AnexoSpec[];
  contrato: ContratoSpec | null;
  gastos: GastoSpec[];
  contribuciones: ContribucionSpec[];
  cuentas: CuentaSpec[];
};

// ---------------------------------------------------------------------------
// Paso 1: la base de cada propiedad (dónde está, qué es, cuánto vale)
// ---------------------------------------------------------------------------

type Real = {
  rol: string;
  direccion: string;
  comuna: string;
  region: string;
  tipo: PropertyType;
  m2Construidos: number | null;
  m2Terreno: number | null;
  avaluoFiscal: number;
  valorComercial: number | null;
};

type Base = {
  real: boolean;
  rolSII: string;
  tipo: PropertyType;
  direccion: string;
  comuna: string;
  region: string;
  m2Construidos: number | null;
  m2Terreno: number | null;
  anoConstruccion: number | null;
  valorClp: number;
  valorUF: number; // el valor en UF; en las inventadas es un número redondo
  valorEnCLP: boolean; // true: el valor se guarda en pesos sí o sí (las reales vienen en pesos)
  valorEstimado: boolean; // true: el archivo real no trae tasación y el valor se estimó desde el avalúo
  avaluoFiscal: number;
};

// Cuando a una propiedad real le falta el dato, rangos razonables según el tipo.
const M2_RELLENO: Partial<Record<PropertyType, { construidos?: [number, number]; terreno?: [number, number] }>> = {
  CASA: { construidos: [70, 220], terreno: [150, 600] },
  LOCAL: { construidos: [40, 300], terreno: [80, 500] },
  BODEGA: { construidos: [150, 1500], terreno: [300, 3000] },
  DEPARTAMENTO: { construidos: [45, 110] },
  OFICINA: { construidos: [35, 150] },
  TERRENO: { terreno: [300, 3000] },
  AGRICOLA: { terreno: [5000, 60000] },
};

const ANOS: Partial<Record<PropertyType, [number, number]>> = {
  CASA: [1950, 2015], LOCAL: [1970, 2015], BODEGA: [1980, 2018], DEPARTAMENTO: [1990, 2022],
  OFICINA: [1985, 2020], ESTACIONAMIENTO: [1990, 2022],
};

// Error de una fila del archivo real: dice la fila (contando desde 1) y el campo,
// nunca el contenido (son datos personales).
function filaInvalida(fila: number, campo: string, problema: string): never {
  throw new Error(`prisma/datos-reales.json, fila ${fila}, campo «${campo}»: ${problema}. No se tocó la base.`);
}

// Lee `datos-reales.json` y revisa todos los campos de todas las filas ANTES de
// que el guion borre nada. Sin archivo, devuelve [] (las 80 serán inventadas).
function cargarReales(): Real[] {
  const ruta = path.join(process.cwd(), "prisma", "datos-reales.json");
  if (!fs.existsSync(ruta)) return [];
  let datos: unknown;
  try {
    datos = JSON.parse(fs.readFileSync(ruta, "utf-8"));
  } catch {
    // No se muestra el detalle del error: puede traer un pedazo del contenido.
    throw new Error("prisma/datos-reales.json no es un JSON válido. No se tocó la base.");
  }
  if (!Array.isArray(datos)) throw new Error("prisma/datos-reales.json debe ser un arreglo de propiedades. No se tocó la base.");

  const tiposValidos: string[] = Object.values(PropertyType);
  const filaDeRol = new Map<string, number>();

  return datos.map((d: unknown, i): Real => {
    const fila = i + 1;
    if (typeof d !== "object" || d === null || Array.isArray(d)) filaInvalida(fila, "(toda la fila)", "debe ser un objeto");
    const o = d as Record<string, unknown>;

    const texto = (campo: string): string => {
      const v = o[campo];
      if (typeof v !== "string" || v.trim() === "") filaInvalida(fila, campo, "debe ser un texto no vacío");
      return (v as string).trim();
    };
    const esPositivo = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
    const positivo = (campo: string): number => {
      const v = o[campo];
      if (!esPositivo(v)) filaInvalida(fila, campo, "debe ser un número mayor que 0");
      return v as number;
    };
    const positivoONulo = (campo: string): number | null => {
      const v = o[campo];
      if (v === null) return null;
      if (!esPositivo(v)) filaInvalida(fila, campo, "debe ser un número mayor que 0 o null");
      return v as number;
    };

    const rol = texto("rol");
    const repetida = filaDeRol.get(rol);
    if (repetida !== undefined) filaInvalida(fila, "rol", `repite el ROL de la fila ${repetida}`);
    filaDeRol.set(rol, fila);

    const tipo = texto("tipo");
    if (!tiposValidos.includes(tipo)) filaInvalida(fila, "tipo", `no es un tipo de propiedad válido (valores: ${tiposValidos.join(", ")})`);

    return {
      rol,
      direccion: texto("direccion"),
      comuna: texto("comuna"),
      region: texto("region"),
      tipo: tipo as PropertyType,
      m2Construidos: positivoONulo("m2Construidos"),
      m2Terreno: positivoONulo("m2Terreno"),
      avaluoFiscal: positivo("avaluoFiscal"),
      valorComercial: positivoONulo("valorComercial"),
    };
  });
}

function desdeReal(r: Real): Base {
  const rango = M2_RELLENO[r.tipo];
  const anos = ANOS[r.tipo];
  // Sin tasación: el valor sale del avalúo (el comercial suele ser 1,3 a 1,9 veces el fiscal).
  const valorClp = r.valorComercial ?? redondear(r.avaluoFiscal * entre(1.3, 1.9), 100000);
  return {
    real: true,
    rolSII: r.rol,
    tipo: r.tipo,
    direccion: r.direccion,
    comuna: r.comuna,
    region: r.region,
    m2Construidos: r.m2Construidos ?? (rango?.construidos ? enteroEntre(...rango.construidos) : null),
    m2Terreno: r.m2Terreno ?? (rango?.terreno ? enteroEntre(...rango.terreno) : null),
    anoConstruccion: anos ? enteroEntre(...anos) : null,
    valorClp,
    valorUF: valorClp / UF_HOY,
    valorEnCLP: true,
    valorEstimado: r.valorComercial === null,
    avaluoFiscal: r.avaluoFiscal,
  };
}

// Superficie y precio por m² (en UF, de una comuna media) de cada tipo inventado.
const MODELO: Record<TipoInventado, { m2: [number, number]; ufM2: [number, number]; terreno?: [number, number]; anos: [number, number]; sufijo: string }> = {
  DEPARTAMENTO: { m2: [35, 110], ufM2: [55, 80], anos: [1995, 2024], sufijo: "Depto" },
  OFICINA: { m2: [30, 150], ufM2: [45, 70], anos: [1990, 2023], sufijo: "Of" },
  LOCAL: { m2: [25, 120], ufM2: [50, 90], anos: [1985, 2020], sufijo: "Local" },
  BODEGA: { m2: [30, 250], ufM2: [18, 30], anos: [1995, 2022], sufijo: "Bodega" },
  ESTACIONAMIENTO: { m2: [12, 15], ufM2: [0, 0], anos: [1990, 2022], sufijo: "Estac." },
  CASA: { m2: [120, 260], ufM2: [50, 75], terreno: [200, 450], anos: [1970, 2015], sufijo: "" },
};

function desdeInventada([tipo, nombreComuna]: PlanInventada, rolesUsados: Set<string>): Base {
  const comuna = comunaInfo(nombreComuna);
  const m = MODELO[tipo];

  // Un depto de 60 m² en Providencia vale ~4.000 a 6.000 UF.
  const m2 = tipo === "DEPARTAMENTO" && comuna.factor >= 1.3 ? enteroEntre(55, 140) : enteroEntre(...m.m2);
  const valorUF =
    tipo === "ESTACIONAMIENTO"
      ? redondear(enteroEntre(300, 550) * comuna.factor, 10)
      : redondear(m2 * entre(...m.ufM2) * comuna.factor, 10);
  const valorClp = redondear(valorUF * UF_HOY, 100000);

  // Calle real de la comuna, número inventado y número de unidad (piso + depto).
  let unidad = "";
  if (tipo === "DEPARTAMENTO") unidad = `${enteroEntre(1, 22)}${String(enteroEntre(1, 8)).padStart(2, "0")}`;
  else if (tipo === "OFICINA") unidad = `${enteroEntre(2, 15)}${String(enteroEntre(1, 9)).padStart(2, "0")}`;
  else if (tipo !== "CASA") unidad = String(enteroEntre(1, 60));
  const direccion = `${pick(comuna.calles)} ${enteroEntre(100, 4900)}${unidad ? `, ${m.sufijo} ${unidad}` : ""}`;

  // ROL inventado (NNNN-NNN), distinto de los ya usados.
  const rolNuevo = () => rolSII(enteroEntre(1000, 9000) * 100 + enteroEntre(1, 99));
  let rol = rolNuevo();
  while (rolesUsados.has(rol)) rol = rolNuevo();
  rolesUsados.add(rol);

  return {
    real: false,
    rolSII: rol,
    tipo,
    direccion,
    comuna: comuna.nombre,
    region: comuna.region,
    m2Construidos: m2,
    m2Terreno: m.terreno ? enteroEntre(...m.terreno) : null,
    anoConstruccion: enteroEntre(...m.anos),
    valorClp,
    valorUF,
    valorEnCLP: false,
    valorEstimado: false,
    avaluoFiscal: redondear(valorClp * entre(0.55, 0.8), 1000),
  };
}

// ---------------------------------------------------------------------------
// Paso 2: estados exactos (56 arrendadas, 9 disponibles, 4 desocupadas,
// 7 en venta, 4 uso propio)
// ---------------------------------------------------------------------------

const CUPOS = { EN_VENTA: 7, DISPONIBLE: 9, DESOCUPADA: 4, USO_PROPIO: 4 } as const;

function repartirEstados(bases: Base[]): PropertyStatus[] {
  const estados: PropertyStatus[] = bases.map(() => "ARRENDADA");
  const cupo: Record<keyof typeof CUPOS, number> = { ...CUPOS };

  // Un terreno nunca va arrendado: alternan EN_VENTA y DISPONIBLE.
  let nTerrenos = 0;
  bases.forEach((b, i) => {
    if (b.tipo !== "TERRENO") return;
    const e = nTerrenos++ % 2 === 0 ? "EN_VENTA" : "DISPONIBLE";
    estados[i] = e;
    cupo[e]--;
  });

  // El resto: reales e inventadas por separado, cada grupo con su parte de cada
  // estado, para que ningún estado sea solo de un origen.
  const resto = bases.map((_, i) => i).filter((i) => bases[i].tipo !== "TERRENO");
  const reales = mezclar(resto.filter((i) => bases[i].real));
  const inventadas = mezclar(resto.filter((i) => !bases[i].real));
  const total = resto.length;
  for (const e of Object.keys(cupo) as (keyof typeof CUPOS)[]) {
    if (cupo[e] < 0) throw new Error(`seed-propiedades: hay demasiados terrenos para el cupo de ${e}.`);
    const nReales = Math.round((cupo[e] * reales.length) / total);
    const elegidas = [...reales.splice(0, nReales), ...inventadas.splice(0, cupo[e] - nReales)];
    if (elegidas.length !== cupo[e]) throw new Error(`seed-propiedades: no alcanzan propiedades para ${e}.`);
    for (const i of elegidas) estados[i] = e;
  }
  return estados;
}

// ---------------------------------------------------------------------------
// Paso 3: contratos y cobros
// ---------------------------------------------------------------------------

const MES_HOY = mesIndice(2026, 10);
const MES_PRIMER_COBRO = mesIndice(2025, 11);

// Fechas del contrato en meses corridos: el contrato empieza el día 1 de
// `inicioMi` y termina el último día de `terminoMi`.
type Meses = { inicioMi: number; terminoMi: number };

// Contrato vigente: inicio entre 2022-01 y 2026-09. Si el término ya pasó, se
// renovó (se corre hacia adelante de a 12 meses). `porVencer` fija el mes de
// término de los contratos que deben salir en la alerta; ningún otro termina en
// octubre ni noviembre de 2026.
function mesesVigente(duracion: number, porVencer: number | null): Meses {
  if (porVencer !== null) return { inicioMi: porVencer - duracion + 1, terminoMi: porVencer };
  const inicioMi = mesIndice(2022, 1) + enteroEntre(0, 56);
  let terminoMi = inicioMi + duracion - 1;
  while (terminoMi < MES_HOY) terminoMi += 12;
  if (terminoMi === MES_HOY || terminoMi === MES_HOY + 1) terminoMi += 12;
  return { inicioMi, terminoMi };
}

function periodoDe(mi: number): string {
  return `${Math.floor(mi / 12)}-${String((mi % 12) + 1).padStart(2, "0")}`;
}

// Cobros de 2025-11 a 2026-10, solo los meses dentro del contrato. Hasta
// septiembre: pagados, salvo los últimos `atrasados` meses, que quedan
// ATRASADO. Octubre: pendiente, con vencimiento posterior a «hoy» para que la
// app (alerts.ts) no lo cuente como atrasado.
function armarCobros(monto: number, moneda: Moneda, diaPago: number, m: Meses, atrasados: number): CobroSpec[] {
  const cobros: CobroSpec[] = [];
  for (let mi = Math.max(m.inicioMi, MES_PRIMER_COBRO); mi <= Math.min(m.terminoMi, MES_HOY); mi++) {
    const venc = date(Math.floor(mi / 12), (mi % 12) + 1, diaPago);
    const base = { periodo: periodoDe(mi), fechaVencimiento: venc };
    if (mi === MES_HOY) {
      cobros.push({ ...base, estado: "PENDIENTE", fechaPago: null, montoPagado: null, interesMora: null });
    } else if (mi > MES_HOY - 1 - atrasados) {
      const mora = moneda === "UF" ? +(monto * 0.03).toFixed(2) : Math.round(monto * 0.03);
      cobros.push({ ...base, estado: "ATRASADO", fechaPago: null, montoPagado: null, interesMora: mora });
    } else {
      cobros.push({ ...base, estado: "PAGADO", fechaPago: addDias(venc, enteroEntre(0, 8)), montoPagado: monto, interesMora: null });
    }
  }
  return cobros;
}

// ---------------------------------------------------------------------------
// Paso 4: gastos, contribuciones y cuentas
// ---------------------------------------------------------------------------

// Los últimos 12 meses: de 2025-10 a 2026-09.
const MESES_GASTO = Array.from({ length: 12 }, (_, k) => mesIndice(2025, 10) + k);

const REPARACIONES = ["Reparación gasfitería", "Pintura", "Arreglo eléctrico", "Cambio de artefactos", "Cambio de cerradura", "Impermeabilización"];

function armarGastos(tipo: PropertyType, m2: number | null, conGastoComun: boolean, conSeguro: boolean): GastoSpec[] {
  const gastos: GastoSpec[] = [];
  if (conGastoComun) {
    const porM2 = tipo === "OFICINA" ? enteroEntre(1500, 2500) : tipo === "LOCAL" ? enteroEntre(1200, 2000) : enteroEntre(1000, 1900);
    const mensual = redondear((m2 ?? 60) * porM2, 1000);
    for (const mi of MESES_GASTO) {
      gastos.push({ categoria: "GASTO_COMUN", monto: mensual, fecha: addDias(primerDia(mi), 4), descripcion: "Gasto común" });
    }
  }
  if (conSeguro) {
    gastos.push({
      categoria: "SEGURO",
      monto: redondear(enteroEntre(150000, 650000), 1000),
      fecha: addDias(primerDia(pick(MESES_GASTO)), pick([9, 14, 19])),
      descripcion: "Seguro anual",
    });
  }
  // Reparaciones ocasionales: ~35 % de las propiedades tiene una, y algunas dos.
  const sorteo = azar();
  const nReparaciones = sorteo < 0.1 ? 2 : sorteo < 0.35 ? 1 : 0;
  for (let r = 0; r < nReparaciones; r++) {
    gastos.push({
      categoria: "REPARACION",
      monto: redondear(enteroEntre(80000, 1500000), 1000),
      fecha: addDias(primerDia(pick(MESES_GASTO)), pick([2, 11, 20, 26])),
      descripcion: pick(REPARACIONES),
    });
  }
  return gastos;
}

const CUOTAS = [
  { cuota: 1, mes: 4, dia: 30 },
  { cuota: 2, mes: 6, dia: 30 },
  { cuota: 3, mes: 9, dia: 30 },
  { cuota: 4, mes: 11, dia: 30 },
];

// Contribuciones 2026: 0,8 % del avalúo al año, repartido en 4 cuotas. Cuotas 1
// y 2 pagadas; la 3 pagada salvo `impaga`; la 4 pendiente.
function armarContribuciones(avaluo: number, impaga: boolean): ContribucionSpec[] {
  const monto = Math.round((avaluo * 0.008) / 4);
  return CUOTAS.map(({ cuota, mes, dia }) => {
    const venc = date(2026, mes, dia);
    const pagada = cuota <= 2 || (cuota === 3 && !impaga);
    return {
      cuota,
      monto,
      fechaVencimiento: venc,
      estado: pagada ? "PAGADA" : "PENDIENTE",
      fechaPago: pagada ? addDias(venc, -enteroEntre(1, 10)) : null,
    };
  });
}

// Las 6 cuentas por pagar: dos vencidas, dos por vencer, una lejana y una pagada.
const CUENTAS: CuentaSpec[] = [
  { tipo: "GASTO_COMUN", periodo: "2026-09", monto: 95000, fechaVencimiento: date(2026, 9, 21), estado: "PENDIENTE", fechaPago: null },
  { tipo: "LUZ", periodo: "2026-09", monto: 42000, fechaVencimiento: date(2026, 10, 4), estado: "PENDIENTE", fechaPago: null },
  { tipo: "AGUA", periodo: "2026-08", monto: 18500, fechaVencimiento: date(2026, 9, 10), estado: "PAGADA", fechaPago: date(2026, 9, 8) },
  { tipo: "GAS", periodo: "2026-09", monto: 27000, fechaVencimiento: date(2026, 10, 7), estado: "PENDIENTE", fechaPago: null },
  { tipo: "GASTO_COMUN", periodo: "2026-09", monto: 118000, fechaVencimiento: date(2026, 9, 27), estado: "PENDIENTE", fechaPago: null },
  { tipo: "LUZ", periodo: "2026-10", monto: 36500, fechaVencimiento: date(2026, 11, 10), estado: "PENDIENTE", fechaPago: null },
];

// ---------------------------------------------------------------------------
// Todo junto
// ---------------------------------------------------------------------------

const TIPOS_EMPRESA: PropertyType[] = ["OFICINA", "LOCAL", "BODEGA", "ESTACIONAMIENTO"];

export function armarPropiedades(): PropiedadSpec[] {
  const reales = cargarReales();
  if (reales.length === 0) {
    console.log("ℹ️   No hay prisma/datos-reales.json: las 80 propiedades son inventadas.");
  }
  if (reales.length > N_PROPIEDADES) throw new Error(`datos-reales.json trae ${reales.length} propiedades y el guion arma ${N_PROPIEDADES}.`);

  // Base de cada una: las reales primero y luego las inventadas.
  const rolesUsados = new Set(reales.map((r) => r.rol));
  const plan = [...PLAN_INVENTADAS, ...planRelleno()].slice(0, N_PROPIEDADES - reales.length);
  const ordenado = [...reales.map(desdeReal), ...plan.map((p) => desdeInventada(p, rolesUsados))];
  const estadosOrdenados = repartirEstados(ordenado);

  // Se mezclan para que reales e inventadas queden revueltas en la lista.
  const orden = mezclar(ordenado.map((_, i) => i));
  const bases = orden.map((i) => ordenado[i]);
  const estados = orden.map((i) => estadosOrdenados[i]);
  const n = bases.length;

  const todos = bases.map((_, i) => i);
  const idx = (fn: (i: number) => boolean) => todos.filter(fn);
  const conEstado = (e: PropertyStatus) => idx((i) => estados[i] === e);
  const deTipo = (...t: PropertyType[]) => idx((i) => t.includes(bases[i].tipo));

  // Moneda del arriendo: UF en oficinas, locales y bodegas, y en ~30 % de los deptos.
  const deptos = deTipo("DEPARTAMENTO");
  const deptosUF = new Set(elegir(deptos, Math.round(deptos.length * 0.3), 7));
  const monedaRenta = (i: number): Moneda =>
    ["OFICINA", "LOCAL", "BODEGA"].includes(bases[i].tipo) || deptosUF.has(i) ? "UF" : "CLP";

  // --- Valor comercial: fecha y fuente. 8 propiedades con más de 12 meses.
  const viejas = new Set(elegir(todos, 8, 17));
  const fuentesInventadas = ["TASACION", "CORREDOR", "ESTIMACION_PROPIA", "TASACION", "CORREDOR"] as const;
  let contadorInventadas = 0;

  // --- Compra (~52): la mitad en UF y la mitad en pesos; 3 con plusvalía negativa.
  const forzadas = [conEstado("USO_PROPIO")[0], conEstado("EN_VENTA")[0]].filter((i) => i !== undefined);
  const conCompra = elegir(todos, Math.round(n * 0.65), 11, forzadas);
  const compraEnUF = new Set(conCompra.filter((_, k) => k % 2 === 0));
  const compraCara = new Set(conCompra.filter((i) => !forzadas.includes(i)).slice(2, 5));

  // --- Deuda (~24): propiedades con compra, de tipos que se financian.
  const financiables = conCompra.filter((i) => !["BODEGA", "ESTACIONAMIENTO", "TERRENO", "AGRICOLA"].includes(bases[i].tipo));
  const conDeuda = elegir(financiables, Math.round(n * 0.3), 13);

  // --- Contribuciones: exenta si el avalúo no supera ~45 millones.
  const exenta = (i: number) => bases[i].avaluoFiscal < 45_000_000;
  const sinImpaga = idx((i) => !exenta(i));
  const conCuotaImpaga = new Set(elegir(sinImpaga, Math.round(sinImpaga.length * 0.15), 19));

  // --- Gastos: gasto común en deptos y oficinas, y en un tercio de los locales.
  const locales = deTipo("LOCAL");
  const localesConGC = new Set(elegir(locales, Math.ceil(locales.length / 3), 9));
  const conSeguro = new Set(elegir(todos, Math.round(n * 0.4), 21));

  // --- Contratos de las arrendadas: duración, mes de término y quién llega tarde.
  const arrendadas = conEstado("ARRENDADA");
  const porVencer = elegir(arrendadas, 6, 13);
  const mesesDe = new Map<number, Meses>();
  for (const i of arrendadas) {
    const duracion = pick([12, 12, 24, 24, 36]);
    const k = porVencer.indexOf(i);
    mesesDe.set(i, mesesVigente(duracion, k < 0 ? null : MES_HOY + (k % 2)));
  }
  // ~10 % de las arrendadas con cobros atrasados (1 a 3 meses), de contratos que
  // ya llevaban al menos 3 meses.
  const candidatosAtraso = arrendadas.filter((i) => !porVencer.includes(i) && (mesesDe.get(i)?.inicioMi ?? 0) <= mesIndice(2026, 6));
  const conAtraso = elegir(candidatosAtraso, 6, 11);
  const mesesAtraso = [1, 2, 3, 1, 2, 1];

  // --- Disponibles y desocupadas: un contrato terminado entre 2026-03 y 2026-09
  // (las desocupadas, hace más de 3 meses: de marzo a junio).
  const terminados = new Map<number, Meses>();
  conEstado("DESOCUPADA").forEach((i, k) => {
    const terminoMi = mesIndice(2026, [3, 4, 5, 6][k % 4]);
    terminados.set(i, { inicioMi: terminoMi - pick([12, 24, 36]) + 1, terminoMi });
  });
  conEstado("DISPONIBLE").forEach((i, k) => {
    const terminoMi = mesIndice(2026, [3, 4, 5, 6, 7, 8, 9][(k * 3) % 7]);
    terminados.set(i, { inicioMi: terminoMi - pick([12, 24, 36]) + 1, terminoMi });
  });

  // Arrendatarios: personas para deptos y casas, empresas para el resto.
  const poolPersonas = mezclar(TENANTS.map((_, i) => i).filter((i) => !TENANTS[i].esEmpresa));
  const poolEmpresas = mezclar(TENANTS.map((_, i) => i).filter((i) => TENANTS[i].esEmpresa));
  let usadasP = 0;
  let usadasE = 0;
  const tenantPara = (tipo: PropertyType): number =>
    TIPOS_EMPRESA.includes(tipo) ? poolEmpresas[usadasE++ % poolEmpresas.length] : poolPersonas[usadasP++ % poolPersonas.length];

  // --- Dueños: el Grupo Vildósola concentra casi todo; 4 copropiedades.
  const idxOwners = (fn: (o: (typeof OWNERS)[number]) => boolean) => OWNERS.map((_, i) => i).filter((i) => fn(OWNERS[i]));
  const vildosola = idxOwners((o) => o.grupo === "Grupo Vildósola");
  const andes = idxOwners((o) => o.grupo === "Grupo Andes" && o.tipo === "SOCIEDAD");
  const andesPersona = idxOwners((o) => o.grupo === "Grupo Andes" && o.tipo === "PERSONA")[0];
  const terceros = idxOwners((o) => o.grupo === null);
  const duenosDe = (i: number): { owner: number; porcentaje: number }[] => {
    if (i === 0) return [{ owner: vildosola[0], porcentaje: 60 }, { owner: vildosola[1], porcentaje: 40 }];
    if (i === 15) return [{ owner: vildosola[2], porcentaje: 50 }, { owner: vildosola[3], porcentaje: 50 }];
    if (i === 33) return [{ owner: andes[0], porcentaje: 70 }, { owner: andesPersona, porcentaje: 30 }];
    if (i === 47) return [{ owner: terceros[0], porcentaje: 50 }, { owner: terceros[3], porcentaje: 50 }];
    const r = i % 10;
    if (r <= 6) return [{ owner: vildosola[i % vildosola.length], porcentaje: 100 }];
    if (r <= 8) return [{ owner: andes[i % andes.length], porcentaje: 100 }];
    return [{ owner: terceros[Math.floor(i / 10) % terceros.length], porcentaje: 100 }];
  };

  // --- Anexos: estacionamiento (y a veces bodega) en deptos y oficinas inventados.
  const candidatosAnexo = idx((i) => !bases[i].real && ["DEPARTAMENTO", "OFICINA"].includes(bases[i].tipo));
  const conEstac = elegir(candidatosAnexo, 8, 3);
  const conBodega = new Set(conEstac.filter((_, k) => k % 2 === 0));

  // --- Cuentas por pagar: 6 propiedades con departamento, oficina, casa o local.
  const conCuenta = elegir(deTipo("DEPARTAMENTO", "OFICINA", "CASA", "LOCAL"), CUENTAS.length, 7);

  // --- Etiquetas con sentido: las más caras, las hipotecadas, las de cobros atrasados.
  const premium = new Set([...todos].sort((a, b) => bases[b].valorClp - bases[a].valorClp).slice(0, 6));
  const herencia = new Set(elegir(idx((i) => bases[i].real && bases[i].tipo === "CASA"), 5, 7));
  const remodelada = new Set(elegir(todos, 5, 23));

  return todos.map((i): PropiedadSpec => {
    const b = bases[i];
    const estado = estados[i];
    const moneda = monedaRenta(i);
    const enUF = moneda === "UF";
    const valorMoneda: Moneda = b.valorEnCLP || !enUF ? "CLP" : "UF";

    // Valor comercial, con fecha y fuente.
    const mesesAtras = viejas.has(i) ? enteroEntre(14, 30) : enteroEntre(1, 11);
    const valorFecha = addDias(addMonths(HOY_FICHA, -mesesAtras), enteroEntre(0, 27));
    // Las reales con tasación en el archivo: TASACION. Las que no la traen y se estimaron desde el avalúo: ESTIMACION_PROPIA.
    const fuente = b.real
      ? b.valorEstimado ? "ESTIMACION_PROPIA" : "TASACION"
      : fuentesInventadas[contadorInventadas++ % fuentesInventadas.length];

    // Renta mensual a partir del valor: bruta anual de 4,5 a 6,5 % (6 a 8 % en locales y bodegas).
    const rentabilidad = b.tipo === "LOCAL" || b.tipo === "BODEGA" ? entre(0.06, 0.08) : entre(0.045, 0.065);
    const rentaClp = (b.valorClp * rentabilidad) / 12;
    const monto = enUF ? +(rentaClp / UF_HOY).toFixed(2) : redondear(rentaClp, 1000);

    // Contrato: vigente en las arrendadas, terminado en disponibles y desocupadas.
    // Va antes que la compra: la compra no puede ser posterior a su inicio.
    let contrato: ContratoSpec | null = null;
    const meses = mesesDe.get(i) ?? terminados.get(i);
    if (meses) {
      const vigente = estado === "ARRENDADA";
      const diaPago = pick([5, 5, 10, 10, 15]); // nunca el 1: el cobro de octubre aún no vence
      const kAtraso = conAtraso.indexOf(i);
      contrato = {
        tenant: tenantPara(b.tipo),
        monto,
        moneda,
        reajuste: enUF ? "NINGUNO" : pick(["IPC", "IPC", "NINGUNO", "UF"] as const),
        fechaInicio: primerDia(meses.inicioMi),
        fechaTermino: ultimoDia(meses.terminoMi),
        diaPago,
        terminado: !vigente,
        // Vigentes y terminados: cobros pagados mes a mes dentro del contrato (los terminados, hasta que se fueron).
        cobros: armarCobros(monto, moneda, diaPago, meses, kAtraso < 0 ? 0 : mesesAtraso[kAtraso]),
      };
    }

    // Compra: entre 2005 y 2024; no antes del año de construcción (si hay) ni
    // después del inicio del contrato. Si el rango queda vacío, se adelanta el año
    // de construcción para que calce.
    let compra: PropiedadSpec["compra"] = null;
    let anoConstruccion = b.anoConstruccion;
    if (conCompra.includes(i)) {
      const caro = compraCara.has(i);
      const finDe2024 = date(2024, 12, 31);
      const tope = contrato && contrato.fechaInicio < finDe2024 ? contrato.fechaInicio : finDe2024;
      if (anoConstruccion !== null && anoConstruccion > tope.getUTCFullYear()) {
        anoConstruccion = tope.getUTCFullYear() - enteroEntre(0, 3);
      }
      const piso = caro ? date(2022, 1, 1) : date(2005, 1, 1);
      const desde = anoConstruccion !== null && date(anoConstruccion, 1, 1) > piso ? date(anoConstruccion, 1, 1) : piso;
      if (desde > tope) throw new Error("seed-propiedades: no hay fecha de compra posible para una propiedad (revisa los rangos).");
      const fecha = addDias(desde, enteroEntre(0, Math.round((tope.getTime() - desde.getTime()) / 86400000)));
      const anios = (HOY_FICHA.getTime() - fecha.getTime()) / (365.25 * 86400000);
      // Plusvalía de 10 a 90 % según los años; las 3 «caras» compraron sobre el valor de hoy.
      const plusvalia = caro ? -entre(0.05, 0.2) : Math.min(0.9, Math.max(0.1, anios * 0.045 * entre(0.7, 1.3)));
      const uf = compraEnUF.has(i);
      compra = {
        fecha,
        moneda: uf ? "UF" : "CLP",
        precio: uf ? +(b.valorUF / (1 + plusvalia)).toFixed(2) : redondear(b.valorClp / (1 + plusvalia), 100000),
      };
    }

    // Deuda hipotecaria, siempre en UF y bajo el valor de la propiedad.
    let deuda: PropiedadSpec["deuda"] = null;
    if (conDeuda.includes(i)) {
      const saldo = +(b.valorUF * entre(0.2, 0.6)).toFixed(2);
      const dividendo = +entre(12, 45).toFixed(2);
      const fecha = date(2026, enteroEntre(1, 9), 5);
      // El último dividendo sale de cuántos faltan, dentro de 2030-2045.
      const termino = addMonths(fecha, Math.round((saldo / dividendo) * 1.25));
      deuda = {
        saldo,
        dividendo,
        fecha,
        banco: BANCOS[conDeuda.indexOf(i) % BANCOS.length],
        termino: new Date(Math.min(Math.max(termino.getTime(), date(2030, 1, 5).getTime()), date(2045, 12, 5).getTime())),
      };
    }

    // Anexos.
    const anexos: AnexoSpec[] = [];
    if (conEstac.includes(i)) {
      const [bloque, unidad] = b.rolSII.split("-");
      anexos.push({
        tipo: "ESTACIONAMIENTO",
        numero: `E-${enteroEntre(10, 199)}`,
        rolSII: `${bloque}-${String(Number(unidad) + 1).padStart(3, "0")}`,
        avaluoFiscal: redondear(enteroEntre(5_000_000, 15_000_000), 100000),
      });
      if (conBodega.has(i)) {
        anexos.push({
          tipo: "BODEGA",
          numero: `B-${enteroEntre(1, 60)}`,
          rolSII: `${bloque}-${String(Number(unidad) + 2).padStart(3, "0")}`,
          avaluoFiscal: redondear(enteroEntre(2_000_000, 6_000_000), 100000),
        });
      }
    }

    const etiquetas: string[] = [];
    if (premium.has(i)) etiquetas.push("premium");
    if (conAtraso.includes(i)) etiquetas.push("riesgo alto");
    if (herencia.has(i)) etiquetas.push("herencia");
    if (deuda) etiquetas.push("hipotecada");
    if (remodelada.has(i)) etiquetas.push("remodelada");

    const kCuenta = conCuenta.indexOf(i);
    const conGastoComun =
      b.tipo === "DEPARTAMENTO" || b.tipo === "OFICINA" || (b.tipo === "LOCAL" && localesConGC.has(i));
    const esExenta = exenta(i);

    return {
      real: b.real,
      rolSII: b.rolSII,
      tipo: b.tipo,
      direccion: b.direccion,
      comuna: b.comuna,
      region: b.region,
      objetivo: estado === "EN_VENTA" ? "VENTA" : estado === "USO_PROPIO" ? "USO_PROPIO" : "INVERSION",
      estado,
      monedaPrincipal: moneda,
      m2Construidos: b.m2Construidos,
      m2Terreno: b.m2Terreno,
      anoConstruccion,
      valorComercial: valorMoneda === "UF" ? b.valorUF : b.valorClp,
      valorComercialMoneda: valorMoneda,
      valorComercialFecha: valorFecha,
      valorComercialFuente: fuente,
      compra,
      deuda,
      exentaContribuciones: esExenta,
      avaluoFiscal: b.avaluoFiscal,
      // Una desocupada se actualizó por última vez al irse el arrendatario.
      updatedAt: estado === "DESOCUPADA" && contrato ? contrato.fechaTermino : null,
      duenos: duenosDe(i),
      etiquetas,
      anexos,
      contrato,
      gastos: armarGastos(b.tipo, b.m2Construidos, conGastoComun, conSeguro.has(i)),
      contribuciones: esExenta ? [] : armarContribuciones(b.avaluoFiscal, conCuotaImpaga.has(i)),
      cuentas: kCuenta < 0 ? [] : [CUENTAS[kCuenta]],
    };
  });
}
