// Seed de datos de prueba para Proges.
// Genera ~50 propiedades con arrendatarios, contratos, cobros y contribuciones.
//
// Uso:
//   npm run db:seed                          ← DB local
//   DATABASE_URL="postgresql://..." npm run db:seed   ← Neon u otra DB

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const ORG = "org_proges";

// UF de referencia para generar avalúos fiscales en CLP a partir de valores
// comerciales en UF (los valores UF reales se cargan más abajo en CurrencyValue).
const UF_REF = 38100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rut(base: number): string {
  const digits = String(base);
  const reversed = digits.split("").reverse().map(Number);
  const series = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7];
  const sum = reversed.reduce((acc, d, i) => acc + d * series[i], 0);
  const remainder = 11 - (sum % 11);
  const dv = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  const fmt = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${fmt}-${dv}`;
}

function rolSII(num: number): string {
  const block = String(Math.floor(num / 100)).padStart(4, "0");
  const unit = String(num % 100).padStart(3, "0");
  return `${block}-${unit}`;
}

function date(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function addMonths(dt: Date, n: number): Date {
  const d = new Date(dt);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

function periodoStr(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Datos base
// ---------------------------------------------------------------------------

const COMUNAS: [string, string][] = [
  ["Las Condes", "Región Metropolitana"],
  ["Providencia", "Región Metropolitana"],
  ["Vitacura", "Región Metropolitana"],
  ["Ñuñoa", "Región Metropolitana"],
  ["La Reina", "Región Metropolitana"],
  ["San Miguel", "Región Metropolitana"],
  ["Macul", "Región Metropolitana"],
  ["La Florida", "Región Metropolitana"],
  ["Maipú", "Región Metropolitana"],
  ["Peñalolén", "Región Metropolitana"],
  ["Santiago", "Región Metropolitana"],
  ["Estación Central", "Región Metropolitana"],
];

const CALLES = [
  "Av. Apoquindo", "Av. Providencia", "Av. Las Condes", "Av. Vitacura",
  "Av. Irarrázaval", "Av. Tobalaba", "Av. Kennedy", "Av. Cristóbal Colón",
  "Av. Bilbao", "Av. Francisco Bilbao", "Calle Los Militares", "Calle Baquedano",
  "Av. Grecia", "Av. Vicuña Mackenna", "Av. Marathon", "Calle San Pascual",
  "Av. Departamental", "Pasaje Los Aromos", "Calle Lota", "Av. Príncipe de Gales",
];

const NOMBRES_PERSONA = [
  "Carlos Andrés Vidal Soto", "María Elena Fuentes Rojas", "Jorge Luis Pereira Núñez",
  "Patricia Alejandra Morales Lagos", "Roberto Antonio Herrera Cáceres",
  "Ana Cecilia Muñoz Bravo", "Francisco Javier Ortiz Pérez", "Claudia Andrea Ramos Torres",
  "Rodrigo Sebastián Espinoza Vera", "Daniela Paz Castro Montoya",
  "Andrés Felipe Gutiérrez Silva", "Marcela Soledad Vargas Díaz",
];

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
  "Renata Valentina Vidal Fuentes",
];

// RUTs base únicos para personas y tenants
const RUTS_PERSONA  = [12345678, 15678234, 18234567, 11567890, 9876543, 10234567, 13456789, 16789012, 14321098, 17654321, 8901234, 19012345];
const RUTS_TENANT   = [
  20123456, 21234567, 22345678, 23456789, 24567890, 25678901, 26789012, 27890123,
  28901234, 7654321,  8123456,  9234567,  10345678, 11456789, 12567890, 13678901,
  14789012, 15890123, 16901234, 17012345, 18123456, 19234567, 20345678, 21456789,
  22567890, 23678901, 24789012, 25890123, 26901234, 27012345, 28123456, 7890123,
  8901235,  9012346,  10123457, 11234568, 12345679, 13456780, 14567891, 15678902,
];

// Plantillas de propiedades (tipo, piso/depto info, moneda preferida, rango monto)
type PropTemplate = {
  tipo: "DEPARTAMENTO" | "CASA" | "OFICINA" | "LOCAL" | "BODEGA";
  sufijo: string;
  moneda: "CLP" | "UF";
  montoMin: number;
  montoMax: number;
  m2Min: number;
  m2Max: number;
};

const TEMPLATES: PropTemplate[] = [
  { tipo: "DEPARTAMENTO", sufijo: "Depto",   moneda: "UF",  montoMin: 14, montoMax: 32, m2Min: 45, m2Max: 110 },
  { tipo: "DEPARTAMENTO", sufijo: "Depto",   moneda: "CLP", montoMin: 450000, montoMax: 900000, m2Min: 40, m2Max: 95 },
  { tipo: "CASA",         sufijo: "Casa",    moneda: "CLP", montoMin: 600000, montoMax: 1400000, m2Min: 80, m2Max: 220 },
  { tipo: "OFICINA",      sufijo: "Of",      moneda: "UF",  montoMin: 20, montoMax: 55, m2Min: 30, m2Max: 150 },
  { tipo: "LOCAL",        sufijo: "Local",   moneda: "UF",  montoMin: 18, montoMax: 45, m2Min: 25, m2Max: 120 },
  { tipo: "BODEGA",       sufijo: "Bodega",  moneda: "CLP", montoMin: 80000, montoMax: 250000, m2Min: 15, m2Max: 60 },
];

// Distribución de estados: 38 arrendadas, 7 disponibles, 3 desocupadas, 1 en venta, 1 uso propio
const ESTADOS_DIST: Array<"ARRENDADA" | "DISPONIBLE" | "DESOCUPADA" | "EN_VENTA" | "USO_PROPIO"> = [
  ...Array(38).fill("ARRENDADA"),
  ...Array(7).fill("DISPONIBLE"),
  ...Array(3).fill("DESOCUPADA"),
  ...Array(1).fill("EN_VENTA"),
  ...Array(1).fill("USO_PROPIO"),
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Limpiando datos previos...");
  await db.alert.deleteMany({ where: { organizationId: ORG } });
  await db.propertyTax.deleteMany({ where: { organizationId: ORG } });
  await db.propertyBill.deleteMany({ where: { organizationId: ORG } });
  await db.movement.deleteMany({ where: { organizationId: ORG } });
  await db.rentCharge.deleteMany({ where: { organizationId: ORG } });
  await db.leaseContract.deleteMany({ where: { organizationId: ORG } });
  await db.tenant.deleteMany({ where: { organizationId: ORG } });
  await db.propertyAssessment.deleteMany({ where: { organizationId: ORG } });
  await db.propertyUnit.deleteMany({ where: { organizationId: ORG } });
  await db.propertyOwner.deleteMany({ where: { organizationId: ORG } });
  await db.property.deleteMany({ where: { organizationId: ORG } });
  await db.owner.deleteMany({ where: { organizationId: ORG } });
  await db.grupo.deleteMany({ where: { organizationId: ORG } });
  await db.propertyTag.deleteMany({ where: { organizationId: ORG } });
  await db.currencyValue.deleteMany();

  // -------------------------------------------------------------------------
  // Tags
  // -------------------------------------------------------------------------
  console.log("🏷️   Creando tags...");
  const tags = await Promise.all(
    ["premium", "riesgo alto", "herencia", "hipotecada", "remodelada"].map((nombre) =>
      db.propertyTag.create({ data: { organizationId: ORG, nombre } })
    )
  );

  // -------------------------------------------------------------------------
  // Owners
  // -------------------------------------------------------------------------
  console.log("👤  Creando propietarios...");

  // Sociedades de un MISMO grupo económico (el dueño real). Concentran la GRAN
  // MAYORÍA de las propiedades: el usuario típico es dueño de casi toda su cartera.
  const empresasGrupo = await Promise.all(
    [
      ["Inversiones Vildósola SpA", 76543210],
      ["Inmobiliaria VF Ltda.", 76012345],
      ["Rentas Vildósola SpA", 77111222],
      ["Constructora VF S.A.", 96333444],
    ].map(([nombre, num]) =>
      db.owner.create({
        data: { organizationId: ORG, nombre: nombre as string, rut: rut(num as number), tipo: "SOCIEDAD" },
      })
    )
  );

  // Pocos terceros sin grupo (copropietarios/otros dueños), con pocas propiedades.
  const terceros = await Promise.all([
    db.owner.create({
      data: { organizationId: ORG, nombre: NOMBRES_PERSONA[0], rut: rut(RUTS_PERSONA[0]), tipo: "PERSONA" },
    }),
    db.owner.create({
      data: { organizationId: ORG, nombre: NOMBRES_PERSONA[1], rut: rut(RUTS_PERSONA[1]), tipo: "PERSONA" },
    }),
    db.owner.create({
      data: { organizationId: ORG, nombre: "Inmobiliaria Andes SpA", rut: rut(76998877), tipo: "SOCIEDAD" },
    }),
  ]);

  // -------------------------------------------------------------------------
  // Grupo económico: un controlador con varias sociedades (mismo dueño).
  // Las independientes y las personas quedan sin grupo (para mostrar ese estado).
  // -------------------------------------------------------------------------
  console.log("🏛️   Creando grupo económico...");
  const grupoVildosola = await db.grupo.create({
    data: { organizationId: ORG, nombre: "Grupo Vildósola", rut: rut(11222333) },
  });
  await db.owner.updateMany({
    where: { id: { in: empresasGrupo.map((e) => e.id) } },
    data: { grupoId: grupoVildosola.id },
  });

  // -------------------------------------------------------------------------
  // Tenants
  // -------------------------------------------------------------------------
  console.log("🏠  Creando arrendatarios...");
  const tenants = await Promise.all(
    NOMBRES_TENANT.map((nombre, i) =>
      db.tenant.create({
        data: {
          organizationId: ORG,
          nombre,
          rut: rut(RUTS_TENANT[i]),
          email: `${nombre.split(" ")[0].toLowerCase()}.${nombre.split(" ")[1].toLowerCase()}@ejemplo.cl`,
          telefono: `+569${String(50000000 + i * 1234567).slice(0, 8)}`,
        },
      })
    )
  );

  // -------------------------------------------------------------------------
  // Propiedades
  // -------------------------------------------------------------------------
  console.log("🏢  Creando 50 propiedades...");
  const estados = [...ESTADOS_DIST].sort(() => Math.random() - 0.5);
  const properties = [];

  for (let i = 0; i < 50; i++) {
    const tpl = pick(TEMPLATES);
    const [comuna, region] = pick(COMUNAS);
    const calle = pick(CALLES);
    const numero = 100 + Math.floor(Math.random() * 9900);
    const unidad = tpl.tipo === "DEPARTAMENTO" ? `, ${tpl.sufijo} ${Math.floor(Math.random() * 30) + 1}${pick(["A","B","C","D","E"])}` : "";
    const estado = estados[i];
    const objetivo = estado === "EN_VENTA" ? "VENTA" : estado === "USO_PROPIO" ? "USO_PROPIO" : "INVERSION";

    const valorComercial =
      tpl.moneda === "UF"
        ? +(3000 + Math.random() * 7000).toFixed(2)
        : +(80000000 + Math.random() * 200000000).toFixed(0);

    const prop = await db.property.create({
      data: {
        organizationId: ORG,
        rolSII: rolSII(3000 + i * 17),
        tipo: tpl.tipo,
        direccion: `${calle} ${numero}${unidad}`,
        comuna,
        region,
        objetivo,
        estado,
        monedaPrincipal: tpl.moneda,
        m2Construidos: +(tpl.m2Min + Math.random() * (tpl.m2Max - tpl.m2Min)).toFixed(2),
        m2Terreno: tpl.tipo === "CASA" ? +(100 + Math.random() * 300).toFixed(2) : null,
        anoConstruccion: 1980 + Math.floor(Math.random() * 45),
        valorComercial,
        valorComercialMoneda: tpl.moneda,
        tags: i % 7 === 0 ? { connect: [{ id: pick(tags).id }] } : undefined,
      },
    });

    // Avalúo fiscal: SIEMPRE en CLP (en Chile el avalúo es en pesos; el modelo
    // no guarda moneda). Se fija como ~55-80% del valor comercial en CLP, que es
    // lo típico (el avalúo suele ir por debajo del comercial).
    const comercialCLP =
      tpl.moneda === "UF" ? valorComercial * UF_REF : valorComercial;
    await db.propertyAssessment.create({
      data: {
        organizationId: ORG,
        propertyId: prop.id,
        anio: 2025,
        valor: Math.round(comercialCLP * (0.55 + Math.random() * 0.25)),
      },
    });

    // Propietario(s): el grupo concentra ~85% de la cartera; pocos a terceros.
    if (i === 0) {
      // Copropiedad entre DOS empresas del mismo grupo (Grupo Vildósola):
      // el grupo ve el 100%, cada empresa su parte. Demuestra la consolidación.
      await db.propertyOwner.create({
        data: { organizationId: ORG, propertyId: prop.id, ownerId: empresasGrupo[0].id, porcentaje: 60 },
      });
      await db.propertyOwner.create({
        data: { organizationId: ORG, propertyId: prop.id, ownerId: empresasGrupo[1].id, porcentaje: 40 },
      });
    } else if (i % 7 === 6) {
      // 1 de cada 7 va a un tercero sin grupo (≈7 propiedades en total).
      const tercero = terceros[Math.floor(i / 7) % terceros.length];
      await db.propertyOwner.create({
        data: { organizationId: ORG, propertyId: prop.id, ownerId: tercero.id, porcentaje: 100 },
      });
    } else {
      // El resto se reparte entre las sociedades del grupo.
      const empresa = empresasGrupo[i % empresasGrupo.length];
      await db.propertyOwner.create({
        data: { organizationId: ORG, propertyId: prop.id, ownerId: empresa.id, porcentaje: 100 },
      });
    }

    properties.push({ prop, tpl, estado });
  }

  // -------------------------------------------------------------------------
  // Contratos y cobros (solo propiedades ARRENDADA)
  // -------------------------------------------------------------------------
  console.log("📄  Creando contratos y cobros...");
  const arrendadas = properties.filter((p) => p.estado === "ARRENDADA");
  const hoy = new Date(Date.UTC(2026, 5, 1)); // 2026-06-01

  for (let i = 0; i < arrendadas.length; i++) {
    const { prop, tpl } = arrendadas[i];
    const tenant = tenants[i % tenants.length];

    // Monto: UF con 2 decimales, CLP sin decimales
    const montoRaw =
      tpl.moneda === "UF"
        ? +(tpl.montoMin + Math.random() * (tpl.montoMax - tpl.montoMin)).toFixed(2)
        : Math.round(tpl.montoMin + Math.random() * (tpl.montoMax - tpl.montoMin));

    // Algunos contratos por vencer en los próximos 2 meses
    const esPorVencer = i < 4;
    const inicioMesesAtras = 18 + Math.floor(Math.random() * 18); // 1.5-3 años atrás
    const duracionMeses = esPorVencer ? inicioMesesAtras + 1 + Math.floor(Math.random() * 30) : inicioMesesAtras + 24 + Math.floor(Math.random() * 24);
    const fechaInicio = addMonths(hoy, -inicioMesesAtras);
    fechaInicio.setUTCDate(1);
    const fechaTermino = addMonths(fechaInicio, duracionMeses);
    fechaTermino.setUTCDate(0); // último día del mes

    const diasHastaTermino = (fechaTermino.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    const estadoContrato: "VIGENTE" | "POR_VENCER" = diasHastaTermino <= 60 ? "POR_VENCER" : "VIGENTE";

    const reajuste = pick(["NINGUNO", "NINGUNO", "NINGUNO", "IPC", "UF"] as const);

    const contract = await db.leaseContract.create({
      data: {
        organizationId: ORG,
        propertyId: prop.id,
        tenantId: tenant.id,
        monto: montoRaw,
        moneda: tpl.moneda,
        aplicaReajuste: reajuste !== "NINGUNO",
        reajusteTipo: reajuste,
        reajusteFrecuenciaMeses: reajuste !== "NINGUNO" ? 12 : null,
        fechaInicio,
        fechaTermino,
        diaPago: pick([1, 5, 5, 10, 10, 15]),
        estado: estadoContrato,
      },
    });

    // Cobros: últimos 5 meses + mes actual
    for (let m = -5; m <= 0; m++) {
      const periodoDate = addMonths(hoy, m);
      const periodo = periodoStr(periodoDate);
      const vencimiento = new Date(Date.UTC(periodoDate.getUTCFullYear(), periodoDate.getUTCMonth(), contract.diaPago));

      const esActual = m === 0;
      const esMesAnterior = m === -1;

      let estado: "PAGADO" | "PENDIENTE" | "ATRASADO";
      let fechaPago: Date | null = null;
      let montoPagado: number | null = null;

      if (esActual) {
        // Mes actual: mayoría pendiente, algunos ya pagaron
        const yaPago = Math.random() < 0.3;
        estado = yaPago ? "PAGADO" : "PENDIENTE";
        if (yaPago) {
          fechaPago = new Date(Date.UTC(2026, 5, Math.floor(Math.random() * 5) + 1));
          montoPagado = montoRaw;
        }
      } else if (esMesAnterior) {
        // Mes anterior: la mayoría pagó, algunos atrasados
        const pagado = Math.random() < 0.85;
        const atrasado = !pagado && Math.random() < 0.7;
        estado = pagado ? "PAGADO" : atrasado ? "ATRASADO" : "PENDIENTE";
        if (pagado) {
          const diasDespues = Math.floor(Math.random() * 12);
          fechaPago = new Date(vencimiento.getTime() + diasDespues * 86400000);
          montoPagado = montoRaw;
        }
      } else {
        // Meses anteriores: casi todos pagados
        estado = Math.random() < 0.95 ? "PAGADO" : "ATRASADO";
        if (estado === "PAGADO") {
          const diasDespues = Math.floor(Math.random() * 10);
          fechaPago = new Date(vencimiento.getTime() + diasDespues * 86400000);
          montoPagado = montoRaw;
        }
      }

      await db.rentCharge.create({
        data: {
          organizationId: ORG,
          contractId: contract.id,
          periodo,
          montoEsperado: montoRaw,
          moneda: tpl.moneda,
          fechaVencimiento: vencimiento,
          estado,
          fechaPago,
          montoPagado,
          interesMora: estado === "ATRASADO" ? +(montoRaw * 0.03).toFixed(0) : null,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Movimientos económicos 2026 (gastos manuales por propiedad)
  // El ingreso por arriendo vive en RentCharge; aquí van los GASTOS del libro:
  // gasto común, reparaciones, seguro. Todos en CLP (así se pagan en la práctica).
  // -------------------------------------------------------------------------
  console.log("💸  Creando movimientos de gasto 2026...");
  const mesActual = hoy.getUTCMonth() + 1; // 6 (junio)
  for (const { prop, tpl } of properties) {
    // Gasto común mensual (depto/oficina/bodega/local en edificio)
    if (["DEPARTAMENTO", "OFICINA", "BODEGA", "LOCAL"].includes(tpl.tipo)) {
      const mensual = 40000 + Math.floor(Math.random() * 160000);
      for (let mes = 1; mes <= mesActual; mes++) {
        await db.movement.create({
          data: {
            organizationId: ORG,
            propertyId: prop.id,
            tipo: "GASTO",
            categoria: "GASTO_COMUN",
            monto: mensual,
            moneda: "CLP",
            fecha: date(2026, mes, 5),
            descripcion: "Gasto común",
          },
        });
      }
    }
    // Seguro anual (~enero)
    if (Math.random() < 0.6) {
      await db.movement.create({
        data: {
          organizationId: ORG,
          propertyId: prop.id,
          tipo: "GASTO",
          categoria: "SEGURO",
          monto: 150000 + Math.floor(Math.random() * 500000),
          moneda: "CLP",
          fecha: date(2026, 1, pick([10, 15, 20])),
          descripcion: "Seguro anual",
        },
      });
    }
    // Reparaciones ocasionales (0-2 en el año)
    const nReparaciones = Math.floor(Math.random() * 3);
    for (let r = 0; r < nReparaciones; r++) {
      await db.movement.create({
        data: {
          organizationId: ORG,
          propertyId: prop.id,
          tipo: "GASTO",
          categoria: "REPARACION",
          monto: 80000 + Math.floor(Math.random() * 1500000),
          moneda: "CLP",
          fecha: date(2026, 1 + Math.floor(Math.random() * mesActual), pick([3, 12, 21, 27])),
          descripcion: pick(["Reparación gasfitería", "Pintura", "Arreglo eléctrico", "Cambio de artefactos"]),
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Contribuciones 2026 (todas las propiedades)
  // -------------------------------------------------------------------------
  console.log("🧾  Creando contribuciones 2026...");
  const CUOTAS = [
    { cuota: 1, mes: 4, dia: 30 },  // Abril — ya vencida
    { cuota: 2, mes: 6, dia: 30 },  // Junio — vence este mes
    { cuota: 3, mes: 9, dia: 30 },  // Septiembre
    { cuota: 4, mes: 12, dia: 15 }, // Diciembre
  ];

  for (const { prop } of properties) {
    const montoBase = 80000 + Math.floor(Math.random() * 320000);
    for (const { cuota, mes, dia } of CUOTAS) {
      const vencimiento = date(2026, mes, dia);
      const yaVencio = vencimiento < hoy;
      const estado: "PAGADA" | "PENDIENTE" = yaVencio && Math.random() < 0.9 ? "PAGADA" : "PENDIENTE";
      await db.propertyTax.create({
        data: {
          organizationId: ORG,
          propertyId: prop.id,
          anio: 2026,
          cuota,
          monto: montoBase / 4,
          fechaVencimiento: vencimiento,
          estado,
          fechaPago: estado === "PAGADA" ? new Date(vencimiento.getTime() - 5 * 86400000) : null,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Cuentas por pagar de ejemplo (vencida, por vencer, pagada, lejana)
  // -------------------------------------------------------------------------
  console.log("💡  Creando cuentas por pagar...");
  const DIA = 86400000;
  const cuentasEjemplo = [
    { i: 0, tipo: "GASTO_COMUN", monto: 95000, venc: -10, estado: "PENDIENTE" },
    { i: 1, tipo: "LUZ", monto: 42000, venc: 3, estado: "PENDIENTE" },
    { i: 2, tipo: "AGUA", monto: 18500, venc: -20, estado: "PAGADA" },
    { i: 3, tipo: "GAS", monto: 27000, venc: 25, estado: "PENDIENTE" },
  ] as const;
  for (const c of cuentasEjemplo) {
    const vencimiento = new Date(Date.now() + c.venc * DIA);
    await db.propertyBill.create({
      data: {
        organizationId: ORG,
        propertyId: properties[c.i].prop.id,
        tipo: c.tipo,
        periodo: vencimiento.toISOString().slice(0, 7),
        monto: c.monto,
        fechaVencimiento: vencimiento,
        estado: c.estado,
        fechaPago: c.estado === "PAGADA" ? new Date(vencimiento.getTime() - 2 * DIA) : null,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Valor UF histórico (últimos 6 meses + hoy)
  // -------------------------------------------------------------------------
  console.log("💱  Cargando valores UF...");
  const UF_VALORES = [
    { mes: 1, valor: 37856.23 },
    { mes: 2, valor: 37923.45 },
    { mes: 3, valor: 37991.12 },
    { mes: 4, valor: 38045.67 },
    { mes: 5, valor: 38102.89 },
    { mes: 6, valor: 38145.34 },
  ];
  for (const { mes, valor } of UF_VALORES) {
    await db.currencyValue.upsert({
      where: { fecha_tipo: { fecha: date(2026, mes, 1), tipo: "UF" } },
      update: { valor },
      create: { fecha: date(2026, mes, 1), tipo: "UF", valor },
    });
  }

  // -------------------------------------------------------------------------
  // Resumen
  // -------------------------------------------------------------------------
  const counts = {
    propiedades: await db.property.count({ where: { organizationId: ORG } }),
    contratos: await db.leaseContract.count({ where: { organizationId: ORG } }),
    cobros: await db.rentCharge.count({ where: { organizationId: ORG } }),
    contribuciones: await db.propertyTax.count({ where: { organizationId: ORG } }),
  };

  console.log("\n✅  Seed completado:");
  console.log(`   Propiedades:    ${counts.propiedades}`);
  console.log(`   Contratos:      ${counts.contratos}`);
  console.log(`   Cobros:         ${counts.cobros}`);
  console.log(`   Contribuciones: ${counts.contribuciones}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
