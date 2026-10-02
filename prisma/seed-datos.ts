// Listas, plantillas y helpers del guion de datos de ejemplo (`seed.ts`).
// Todo lo que sale de acá es inventado: los nombres, RUT y empresas no
// corresponden a personas reales.
//
// Qué hay: constantes del guion («hoy», UF), helpers (azar con semilla, RUT,
// fechas), comunas con sus calles, nombres de dueños y arrendatarios, y el
// plan de las propiedades inventadas.

import type { PropertyType } from "../src/generated/prisma/enums";

export type Moneda = "CLP" | "UF";

export const ORG = "org_proges";

// «Hoy» de todos los datos del guion: 2026-10-01. Nada usa la fecha real del
// computador, así los datos son los mismos cada vez que se corre.
export const HOY_FICHA = new Date(Date.UTC(2026, 9, 1));

// UF de «hoy». Los valores de los meses anteriores se calculan hacia atrás
// (ver `valoresUF` en seed.ts).
export const UF_HOY = 39400;

export const N_PROPIEDADES = 80;

export const BANCOS = ["Banco de Chile", "BancoEstado", "Santander", "BCI", "Scotiabank"];
export const FUENTES = ["TASACION", "CORREDOR", "ESTIMACION_PROPIA"] as const;

// ---------------------------------------------------------------------------
// Azar con semilla: el mismo número de semilla da siempre los mismos datos.
// Lo que ves en pantalla es lo que se probó, y los conteos no cambian entre
// corridas (algoritmo mulberry32).
// ---------------------------------------------------------------------------

let semilla = 20261001;

export function azar(): number {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(azar() * arr.length)];
}

// Entero entre `min` y `max`, ambos incluidos.
export function enteroEntre(min: number, max: number): number {
  return min + Math.floor(azar() * (max - min + 1));
}

export function entre(min: number, max: number): number {
  return min + azar() * (max - min);
}

// Copia del arreglo en otro orden (Fisher-Yates con el azar de arriba).
export function mezclar<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function redondear(n: number, paso: number): number {
  return Math.round(n / paso) * paso;
}

export function rut(base: number): string {
  const digits = String(base);
  const reversed = digits.split("").reverse().map(Number);
  const series = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7];
  const sum = reversed.reduce((acc, d, i) => acc + d * series[i], 0);
  const remainder = 11 - (sum % 11);
  const dv = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  const fmt = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${fmt}-${dv}`;
}

// ROL del SII inventado, con el formato NNNN-NNN.
export function rolSII(num: number): string {
  const block = String(Math.floor(num / 100)).padStart(4, "0");
  const unit = String(num % 100).padStart(3, "0");
  return `${block}-${unit}`;
}

export function date(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

export function addMonths(dt: Date, n: number): Date {
  const d = new Date(dt);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

export function addDias(dt: Date, n: number): Date {
  return new Date(dt.getTime() + n * 86400000);
}

export function periodoStr(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Un mes se maneja como un número corrido (año × 12 + mes − 1): así sumar y
// restar meses es sumar y restar números, sin líos de fin de mes.
export function mesIndice(anio: number, mes: number): number {
  return anio * 12 + mes - 1;
}
export function primerDia(mi: number): Date {
  return date(Math.floor(mi / 12), (mi % 12) + 1, 1);
}
export function ultimoDia(mi: number): Date {
  return date(Math.floor(mi / 12), (mi % 12) + 2, 0);
}

// Elige `n` índices del `pool` para repartir un dato entre las 80 propiedades:
// primero los obligatorios y después los demás en un orden repartido (`paso`
// es coprimo con 80: impar y no múltiplo de 5). Así los conteos son fijos aunque
// tipo y estado sean al azar.
export function elegir(pool: number[], n: number, paso: number, obligatorios: number[] = []): number[] {
  const orden = [...pool].sort((a, b) => ((a * paso) % N_PROPIEDADES) - ((b * paso) % N_PROPIEDADES));
  const out = [...obligatorios];
  for (const i of orden) {
    if (out.length >= n) break;
    if (!out.includes(i)) out.push(i);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Comunas y calles reales (la dirección completa es inventada: número y unidad)
// ---------------------------------------------------------------------------

// `factor` encarece o abarata el metro cuadrado respecto de una comuna media.
export type ComunaInfo = { nombre: string; region: string; factor: number; calles: string[] };

const RM = "Región Metropolitana";

export const COMUNAS: ComunaInfo[] = [
  { nombre: "Providencia", region: RM, factor: 1.2, calles: ["Av. Providencia", "Av. Nueva Providencia", "Av. 11 de Septiembre", "Av. Pedro de Valdivia", "Av. Manuel Montt", "Av. Ricardo Lyon"] },
  { nombre: "Las Condes", region: RM, factor: 1.35, calles: ["Av. Apoquindo", "Av. Las Condes", "Av. Kennedy", "Av. Isidora Goyenechea", "Av. El Bosque Norte", "Av. Presidente Riesco"] },
  { nombre: "Vitacura", region: RM, factor: 1.5, calles: ["Av. Vitacura", "Av. Nueva Costanera", "Av. Alonso de Córdova", "Av. Bicentenario", "Av. Luis Pasteur"] },
  { nombre: "Ñuñoa", region: RM, factor: 0.95, calles: ["Av. Irarrázaval", "Av. Grecia", "Av. Pedro de Valdivia", "Av. José Pedro Alessandri", "Av. Jorge Washington", "Av. Chile España"] },
  { nombre: "Santiago", region: RM, factor: 0.75, calles: ["Av. Libertador Bernardo O'Higgins", "Huérfanos", "Agustinas", "Bandera", "Morandé", "Av. Matta"] },
  { nombre: "San Miguel", region: RM, factor: 0.72, calles: ["Gran Avenida José Miguel Carrera", "Av. Departamental", "Av. Santa Rosa", "Av. Llano Subercaseaux", "Av. Lo Ovalle"] },
  { nombre: "La Florida", region: RM, factor: 0.65, calles: ["Av. Vicuña Mackenna", "Av. La Florida", "Av. Walker Martínez", "Av. Departamental", "Av. Froilán Roa", "Av. Rojas Magallanes"] },
  { nombre: "Macul", region: RM, factor: 0.7, calles: ["Av. Macul", "Av. Quilín", "Av. Departamental", "Av. Exequiel Fernández", "Av. Rodrigo de Araya"] },
  { nombre: "Estación Central", region: RM, factor: 0.7, calles: ["Av. Libertador Bernardo O'Higgins", "Av. Ecuador", "Av. Las Rejas", "Av. Padre Alberto Hurtado", "Av. Exposición"] },
  { nombre: "Independencia", region: RM, factor: 0.7, calles: ["Av. Independencia", "Av. Vivaceta", "Av. La Paz", "Av. Zañartu", "Av. Santa María"] },
];

export function comunaInfo(nombre: string): ComunaInfo {
  const c = COMUNAS.find((x) => x.nombre === nombre);
  if (!c) throw new Error(`seed-datos: la comuna «${nombre}» no está en COMUNAS`);
  return c;
}

// ---------------------------------------------------------------------------
// Plan de las propiedades inventadas: [tipo, comuna]. Son tipos de arriendo.
// ---------------------------------------------------------------------------

export type TipoInventado = Extract<
  PropertyType,
  "DEPARTAMENTO" | "OFICINA" | "LOCAL" | "BODEGA" | "ESTACIONAMIENTO" | "CASA"
>;
export type PlanInventada = [TipoInventado, string];

// Las 35 que acompañan a las 45 reales: 12 deptos, 7 oficinas, 6 locales,
// 5 bodegas, 3 estacionamientos y 2 casas.
export const PLAN_INVENTADAS: PlanInventada[] = [
  ["DEPARTAMENTO", "Providencia"], ["DEPARTAMENTO", "Providencia"], ["DEPARTAMENTO", "Providencia"],
  ["DEPARTAMENTO", "Las Condes"], ["DEPARTAMENTO", "Las Condes"], ["DEPARTAMENTO", "Vitacura"],
  ["DEPARTAMENTO", "Ñuñoa"], ["DEPARTAMENTO", "Ñuñoa"], ["DEPARTAMENTO", "Santiago"],
  ["DEPARTAMENTO", "San Miguel"], ["DEPARTAMENTO", "La Florida"], ["DEPARTAMENTO", "Macul"],
  ["OFICINA", "Providencia"], ["OFICINA", "Providencia"], ["OFICINA", "Las Condes"],
  ["OFICINA", "Las Condes"], ["OFICINA", "Santiago"], ["OFICINA", "Santiago"], ["OFICINA", "Vitacura"],
  ["LOCAL", "Providencia"], ["LOCAL", "Santiago"], ["LOCAL", "Santiago"],
  ["LOCAL", "Ñuñoa"], ["LOCAL", "Las Condes"], ["LOCAL", "Independencia"],
  ["BODEGA", "Estación Central"], ["BODEGA", "Estación Central"], ["BODEGA", "San Miguel"],
  ["BODEGA", "Macul"], ["BODEGA", "Independencia"],
  ["ESTACIONAMIENTO", "Providencia"], ["ESTACIONAMIENTO", "Las Condes"], ["ESTACIONAMIENTO", "Santiago"],
  ["CASA", "Ñuñoa"], ["CASA", "La Florida"],
];

// Si falta `datos-reales.json`, las 80 son inventadas: a las 35 de arriba se les
// suman 45 más (14 deptos, 10 casas, 8 locales, 5 oficinas, 6 bodegas, 2 estac.).
export function planRelleno(): PlanInventada[] {
  const cupos: [TipoInventado, number][] = [
    ["DEPARTAMENTO", 14], ["CASA", 10], ["LOCAL", 8], ["OFICINA", 5], ["BODEGA", 6], ["ESTACIONAMIENTO", 2],
  ];
  const out: PlanInventada[] = [];
  for (const [tipo, n] of cupos) {
    for (let k = 0; k < n; k++) out.push([tipo, COMUNAS[(k * 3 + out.length) % COMUNAS.length].nombre]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Etiquetas
// ---------------------------------------------------------------------------

export const ETIQUETAS = ["premium", "riesgo alto", "herencia", "hipotecada", "remodelada"];

// ---------------------------------------------------------------------------
// Dueños y grupos
// ---------------------------------------------------------------------------

export const NOMBRES_PERSONA = [
  "Carlos Andrés Vidal Soto", "María Elena Fuentes Rojas", "Jorge Luis Pereira Núñez",
  "Patricia Alejandra Morales Lagos", "Roberto Antonio Herrera Cáceres",
  "Ana Cecilia Muñoz Bravo", "Francisco Javier Ortiz Pérez", "Claudia Andrea Ramos Torres",
  "Rodrigo Sebastián Espinoza Vera", "Daniela Paz Castro Montoya",
  "Andrés Felipe Gutiérrez Silva", "Marcela Soledad Vargas Díaz",
];

export type GrupoPlantilla = { nombre: string; rut: string };

export const GRUPOS: GrupoPlantilla[] = [
  { nombre: "Grupo Vildósola", rut: rut(11222333) },
  { nombre: "Grupo Andes", rut: rut(10888999) },
];

export type OwnerPlantilla = {
  nombre: string;
  rut: string;
  tipo: "PERSONA" | "SOCIEDAD";
  grupo: string | null; // nombre del grupo; null = sin grupo
};

// Mayoría sociedades. El Grupo Vildósola concentra casi toda la cartera; el
// Grupo Andes tiene una parte menor; los terceros, pocas propiedades.
export const OWNERS: OwnerPlantilla[] = [
  { nombre: "Inversiones Vildósola SpA", rut: rut(76543210), tipo: "SOCIEDAD", grupo: "Grupo Vildósola" },
  { nombre: "Inmobiliaria VF Ltda.", rut: rut(76012345), tipo: "SOCIEDAD", grupo: "Grupo Vildósola" },
  { nombre: "Rentas Vildósola SpA", rut: rut(77111222), tipo: "SOCIEDAD", grupo: "Grupo Vildósola" },
  { nombre: "Constructora VF S.A.", rut: rut(96333444), tipo: "SOCIEDAD", grupo: "Grupo Vildósola" },
  { nombre: "Servicios Patrimoniales VF SpA", rut: rut(76222333), tipo: "SOCIEDAD", grupo: "Grupo Vildósola" },
  { nombre: "Inmobiliaria Cordillera Ltda.", rut: rut(76444555), tipo: "SOCIEDAD", grupo: "Grupo Vildósola" },
  { nombre: "Inmobiliaria Andes SpA", rut: rut(76998877), tipo: "SOCIEDAD", grupo: "Grupo Andes" },
  { nombre: "Rentas Andes Ltda.", rut: rut(77555666), tipo: "SOCIEDAD", grupo: "Grupo Andes" },
  { nombre: NOMBRES_PERSONA[2], rut: rut(9876543), tipo: "PERSONA", grupo: "Grupo Andes" },
  { nombre: NOMBRES_PERSONA[0], rut: rut(12345678), tipo: "PERSONA", grupo: null },
  { nombre: NOMBRES_PERSONA[1], rut: rut(15678234), tipo: "PERSONA", grupo: null },
  { nombre: NOMBRES_PERSONA[3], rut: rut(18234567), tipo: "PERSONA", grupo: null },
  { nombre: "Inversiones Pacífico SpA", rut: rut(76777888), tipo: "SOCIEDAD", grupo: null },
];

// ---------------------------------------------------------------------------
// Arrendatarios: personas para deptos y casas, empresas para oficinas, locales
// y bodegas.
// ---------------------------------------------------------------------------

const NOMBRES_TENANT = [
  "Sofía Isabel Araya Ponce", "Ignacio Hernán Rojas Saavedra", "Valentina Nicole Flores Contreras",
  "Matías Esteban Soto Guerrero", "Camila Javiera Mendez Alcaíno", "Felipe Andrés Torres Leiva",
  "Natalia Cristina Vega Villalobos", "Sebastián Alberto Mora Poblete", "Catalina Andrea Ríos Acevedo",
  "Diego Ignacio Reyes Jara", "Carla Valentina Sepúlveda Muñoz", "Marco Antonio Alvarez Reyes",
  "Daniela Francisca Concha Salinas", "Pablo Rodrigo Fuentes Espinoza", "Javiera Alejandra Bravo Cáceres",
  "Gonzalo Enrique Molina Herrera", "Constanza Beatriz Ibarra Rojas", "Cristóbal Ernesto Saavedra Lagos",
  "Francisca Paz Núñez Vidal", "Tomás Andrés Carrasco Morales", "Isidora Renata Espinoza Fuentes",
  "Álvaro Nicolás Pinto Ramos", "Verónica Soledad Gutiérrez Torres", "Agustín Rafael Castro Ortiz",
  "Montserrat Elena Pereira Díaz", "Héctor Guillermo Vargas Vega", "Lorena Patricia Soto Contreras",
  "Emilio Rodrigo Flores Guerrero", "Pilar Fernanda Arenas Alcaíno", "Bruno Alejandro Muñoz Leiva",
  "Valentina Paz Rojas Villalobos", "Maximiliano José Herrera Poblete", "Marcela Andrea Reyes Acevedo",
  "Javier Ignacio Castro Jara", "Camila Sofía Mendez Salinas", "Nicolás Felipe Ramos Espinoza",
  "Fernanda Isabel Torres Cáceres", "Lucas Andrés Silva Morales", "María Jesús Contreras Lagos",
  "Renata Valentina Vidal Fuentes", "Benjamín Ignacio Cortés Navarro", "Antonia Belén Palma Paredes",
  "Joaquín Mauricio Tapia Ibáñez", "Fernanda Constanza Lira Bustos",
];

const EMPRESAS_TENANT = [
  "Comercial Los Aromos SpA", "Servicios Quilín Ltda.", "Consultora Andina SpA",
  "Distribuidora Maipo Ltda.", "Panadería y Pastelería Santa Rosa SpA", "Clínica Dental Sonrisa SpA",
  "Estudio Contable Mapocho Ltda.", "Librería El Faro SpA", "Farmacia Barrio Alto SpA",
  "Logística Cordillera Ltda.", "Arquitectura Cumbre SpA", "Bodegas del Sur Ltda.",
  "Taller Mecánico Los Cerrillos SpA", "Café de Barrio SpA", "Tecnología Pacífico SpA",
  "Gimnasio Vitalis SpA", "Peluquería Urbana Ltda.", "Importadora Costanera SpA",
  "Salud y Bienestar Providencia SpA", "Veterinaria Huellas SpA", "Seguros Horizonte Ltda.",
  "Constructora Los Alerces Ltda.", "Academia de Idiomas Babel SpA", "Minimarket La Esquina SpA",
];

export type TenantPlantilla = {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  esEmpresa: boolean;
};

// Sin tildes ni espacios, para armar el correo.
function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// Que ningún correo se repita: si el nombre ya dio uno igual, se le suma un número.
const correosUsados = new Set<string>();
function correoUnico(local: string, dominio: string): string {
  let correo = `${local}@${dominio}`;
  for (let n = 2; correosUsados.has(correo); n++) correo = `${local}${n}@${dominio}`;
  correosUsados.add(correo);
  return correo;
}

// Palabras que no sirven para armar el correo de una empresa.
const PALABRAS_VACIAS = ["y", "de", "del", "la", "las", "los", "el", "spa", "ltda", "s.a."];

export const TENANTS: TenantPlantilla[] = [
  ...NOMBRES_TENANT.map((nombre, i) => {
    const partes = nombre.split(" ");
    // nombre.apellido1.apellido2: los dos apellidos distinguen a quienes comparten nombre y primer apellido.
    const local = [partes[0], ...partes.slice(2)].map(slug).join(".");
    return {
      nombre,
      rut: rut(7000000 + i * 380411), // RUT distintos por construcción
      email: correoUnico(local, "ejemplo.cl"),
      telefono: `+569${String(50000000 + i * 1234567).slice(0, 8)}`,
      esEmpresa: false,
    };
  }),
  ...EMPRESAS_TENANT.map((nombre, i) => {
    const palabras = nombre.split(" ").filter((w) => !PALABRAS_VACIAS.includes(w.toLowerCase().replace(/\.$/, "")));
    return {
      nombre,
      rut: rut(76000000 + i * 21377),
      email: correoUnico(`contacto.${palabras.slice(0, 2).map(slug).join("")}`, "ejemplo.cl"),
      telefono: `+5622${String(3000000 + i * 417311).slice(0, 7)}`,
      esEmpresa: true,
    };
  }),
];
