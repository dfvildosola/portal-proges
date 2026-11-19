// La prueba de la obra. Se corre con: npx tsx scripts/probar-obra.ts
// Tres partes sobre el código REAL (nada se copia):
//  1. Las cuentas de src/lib/obra.ts con números a mano (puro, sin base).
//  2. Lo que entrega src/lib/vista-cliente.ts a un dueño: se arma en la base un proyecto con
//     presupuesto, factura, maestro, nota privada y nota para el dueño, y se busca en lo que sale
//     lo que jamás debe salir (montos del maestro, presupuestos, facturas, notas privadas).
//  3. src/lib/orden-odoo.ts con una orden de Odoo hecha a mano: recintos, anticipos y volver a
//     traer sin perder avance, recepción ni maestro.
// Se puede correr las veces que se quiera (ids fijos, se actualiza y no se duplica). Solo escribe
// en una base `proges_dev*`. El cliente es «Prueba obra»; los correos son @proges.test.
// No prueba las acciones del servidor (necesitan la sesión de Clerk), p. ej. `cerrarObra`: de ella
// se prueba la regla pura (`obraSePuedeCerrar`); que exija ≥1 partida y jefatura se ve en el navegador.

import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { ORG_PROGES } from "../src/lib/org";
import {
  adicionales,
  aprobado,
  asignableRestante,
  avancePonderado,
  cuentasDeObra,
  facturado,
  obraSePuedeCerrar,
  pagado,
  planContraReal,
  plazoPlanificadoDias,
  resumenRecepcion,
  saldo,
  type FacturaCuenta,
  type PartidaCuenta,
  type PresupuestoCuenta,
} from "../src/lib/obra";
import {
  compararCuenta,
  monedaDeOrden,
  planDeOrden,
  type PartidaExistente,
  type PlanDeOrden,
  type PropiedadParaCuenta,
} from "../src/lib/orden-odoo";
import {
  propiedadesDelCliente,
  servicioParaCliente,
  serviciosDePropiedad,
} from "../src/lib/vista-cliente";
import type { OrdenOdoo } from "../src/lib/odoo";

// Esta prueba escribe datos: solo en la base de desarrollo.
const nombreBase = new URL(process.env.DATABASE_URL ?? "postgres://x/").pathname.replace("/", "");
if (!nombreBase.startsWith("proges_dev")) {
  throw new Error(
    `Esta prueba solo corre en proges_dev (o en la copia de un espacio), y DATABASE_URL apunta a «${nombreBase}».`,
  );
}

let casos = 0;
async function caso(nombre: string, prueba: () => Promise<void> | void) {
  await prueba();
  casos++;
  console.log(`ok  ${nombre}`);
}

const dia = (anio: number, mes: number, d: number) => new Date(Date.UTC(anio, mes - 1, d));

// ---- Parte 1: las cuentas (puras) ----

// Una obra con dos maestros trabajando a la vez:
//  - maestro 1: original aprobado 10.000.000 (plazo 30 días) y un adicional aprobado de 1.500.000 (10 días);
//  - maestro 2: original aprobado 2.000.000 (plazo 40 días);
//  - uno rechazado de 9.000.000 (90 días) y uno solo recibido de 500.000: no cuentan.
const PRESUPUESTOS: PresupuestoCuenta[] = [
  { tipo: "ORIGINAL", estado: "APROBADO", total: 10_000_000, plazoDias: 30 },
  { tipo: "ADICIONAL", estado: "APROBADO", total: 1_500_000, plazoDias: 10 },
  { tipo: "ORIGINAL", estado: "APROBADO", total: 2_000_000, plazoDias: 40 },
  { tipo: "ORIGINAL", estado: "RECHAZADO", total: 9_000_000, plazoDias: 90 },
  { tipo: "ADICIONAL", estado: "RECIBIDO", total: 500_000, plazoDias: null },
];

// Una factura de Odoo de 6.000.000 se reparte entre DOS proyectos: 4.000.000 a este y 2.000.000 al
// otro. Odoo dice que falta pagar 3.000.000 (se pagó la mitad). Y una factura «fuera de Odoo»
// de 1.500.000, ya pagada.
const FACTURA_ODOO_6M = { total: 6_000_000, pendiente: 3_000_000, estado: "publicada" } as const;
const ESTE_PROYECTO: FacturaCuenta[] = [
  { origen: "odoo", montoAsignado: 4_000_000, ...FACTURA_ODOO_6M },
  { origen: "manual", montoAsignado: 1_500_000, pagada: true },
];
const EL_OTRO_PROYECTO: FacturaCuenta[] = [{ origen: "odoo", montoAsignado: 2_000_000, ...FACTURA_ODOO_6M }];

async function cuentas() {
  await caso("aprobado y adicionales suman solo lo APROBADO (ni el rechazado ni el recibido)", () => {
    assert.equal(aprobado(PRESUPUESTOS), 12_000_000);
    assert.equal(adicionales(PRESUPUESTOS), 1_500_000);
  });

  await caso("facturado de este proyecto = lo asignado: 4.000.000 de Odoo + 1.500.000 fuera de Odoo", () => {
    assert.equal(facturado(ESTE_PROYECTO), 5_500_000);
  });

  await caso("pagado: la parte pagada de la factura de Odoo en proporción a lo asignado, más la manual pagada", () => {
    // Odoo pagó la mitad de la factura: a este proyecto le toca la mitad de sus 4.000.000.
    assert.equal(pagado(ESTE_PROYECTO), 3_500_000); // 2.000.000 + 1.500.000
  });

  await caso("saldo = aprobado + adicionales − pagado = 13.500.000 − 3.500.000 = 10.000.000", () => {
    assert.equal(saldo(PRESUPUESTOS, ESTE_PROYECTO), 10_000_000);
    assert.deepEqual(cuentasDeObra(PRESUPUESTOS, ESTE_PROYECTO), {
      aprobado: 12_000_000,
      adicionales: 1_500_000,
      facturado: 5_500_000,
      pagado: 3_500_000,
      saldo: 10_000_000,
    });
  });

  await caso("la factura repartida entre dos proyectos: lo pagado de los dos suma exactamente lo pagado en Odoo", () => {
    const enElOtro = pagado(EL_OTRO_PROYECTO);
    assert.equal(enElOtro, 1_000_000); // la mitad de sus 2.000.000
    const soloOdoo = pagado([ESTE_PROYECTO[0]]);
    assert.equal(soloOdoo + enElOtro, FACTURA_ODOO_6M.total - FACTURA_ODOO_6M.pendiente); // 3.000.000
    // Y lo facturado entre los dos es el total de la factura: ni un peso de más.
    assert.equal(facturado([ESTE_PROYECTO[0]]) + facturado(EL_OTRO_PROYECTO), FACTURA_ODOO_6M.total);
  });

  await caso("una factura de Odoo en borrador o anulada se factura pero no cuenta como pagada", () => {
    for (const estado of ["borrador", "anulada"] as const) {
      const f: FacturaCuenta = { origen: "odoo", montoAsignado: 1_000_000, total: 1_000_000, pendiente: 1_000_000, estado };
      assert.equal(facturado([f]), 1_000_000, estado);
      assert.equal(pagado([f]), 0, estado);
    }
  });

  await caso("una manual sin marcar pagada se factura pero no se paga", () => {
    const f: FacturaCuenta = { origen: "manual", montoAsignado: 800_000, pagada: false };
    assert.equal(facturado([f]), 800_000);
    assert.equal(pagado([f]), 0);
  });

  await caso("pagado se redondea a centavos: 1/3 de 2.000.000 por 1.000.000 asignado", () => {
    const f: FacturaCuenta = { origen: "odoo", montoAsignado: 1_000_000, total: 3_000_000, pendiente: 1_000_000, estado: "publicada" };
    assert.equal(pagado([f]), 666_666.67);
  });

  await caso("lo asignable de una factura nunca baja de 0 ni pasa el total", () => {
    assert.equal(asignableRestante(6_000_000, 4_000_000), 2_000_000);
    assert.equal(asignableRestante(6_000_000, 6_000_000), 0);
    assert.equal(asignableRestante(6_000_000, 7_000_000), 0); // sobreasignada: 0, no negativo
    assert.equal(asignableRestante(6_000_000, 0), 6_000_000);
  });

}

async function avanceYRecepcion() {
  const partidas: PartidaCuenta[] = [
    { avance: 100, precioDueno: 1_000_000, recepcion: "CONFORME" },
    { avance: 50, precioDueno: 3_000_000, recepcion: "PENDIENTE" },
    { avance: 0, precioDueno: null, recepcion: "PENDIENTE" }, // sin precio: no pesa cuando otras sí tienen
    { avance: 0, precioDueno: 5_000_000, recepcion: "PENDIENTE", quitadaEnOdoo: true }, // quitada: no cuenta
  ];

  await caso("avance ponderado por precio: (100×1M + 50×3M) / 4M = 62,5; ignora la sin precio y la quitada", () => {
    assert.equal(avancePonderado(partidas), 62.5);
  });

  await caso("avance sin ningún precio: promedio simple (0, 50 y 100 → 50)", () => {
    assert.equal(
      avancePonderado([{ avance: 0, recepcion: "PENDIENTE" }, { avance: 50, recepcion: "PENDIENTE" }, { avance: 100, recepcion: "PENDIENTE" }]),
      50,
    );
  });

  await caso("sin partidas el avance es 0 (no es un error)", () => {
    assert.equal(avancePonderado([]), 0);
  });

  await caso("resumen de recepción: no cuenta las quitadas en Odoo", () => {
    assert.deepEqual(resumenRecepcion(partidas), { conformes: 1, observadas: 0, pendientes: 2, total: 3 });
  });

  await caso("regla de cierre: solo con todas las partidas vigentes conformes", () => {
    const conforme = (extra: Partial<PartidaCuenta> = {}): PartidaCuenta => ({ avance: 100, recepcion: "CONFORME", ...extra });
    assert.equal(obraSePuedeCerrar([conforme(), conforme()]), true);
    assert.equal(obraSePuedeCerrar([conforme(), conforme({ recepcion: "PENDIENTE" })]), false);
    assert.equal(obraSePuedeCerrar([conforme(), conforme({ recepcion: "OBSERVADA" })]), false);
  });

  await caso("regla de cierre: una partida quitada en Odoo que sigue pendiente no la traba", () => {
    assert.equal(
      obraSePuedeCerrar([
        { avance: 100, recepcion: "CONFORME" },
        { avance: 0, recepcion: "PENDIENTE", quitadaEnOdoo: true },
      ]),
      true,
    );
  });
}

async function planContraRealDeObra() {
  const partidas: PartidaCuenta[] = [
    { avance: 100, recepcion: "CONFORME" },
    { avance: 100, recepcion: "OBSERVADA" },
  ];

  await caso("plazo planificado: el del maestro que más se demora (en paralelo, no suma) y solo de lo aprobado", () => {
    assert.equal(plazoPlanificadoDias(PRESUPUESTOS), 40);
    assert.equal(plazoPlanificadoDias([{ tipo: "ORIGINAL", estado: "APROBADO", total: 1, plazoDias: null }]), null);
    assert.equal(plazoPlanificadoDias([]), null);
  });

  await caso("plan contra real: costo y plazo con inicio el 1 de octubre y hoy el 15 de noviembre (45 días)", () => {
    const r = planContraReal({
      presupuestos: PRESUPUESTOS,
      facturas: ESTE_PROYECTO,
      partidas,
      inicioObra: dia(2026, 10, 1),
      hasta: dia(2026, 11, 15),
    });
    assert.deepEqual(r.costo, { planificado: 13_500_000, real: 5_500_000, diferencia: -8_000_000 });
    assert.deepEqual(r.plazo, { planificado: 40, real: 45, diferencia: 5 });
    assert.deepEqual(r.partidas, { conformes: 1, observadas: 1, pendientes: 0, total: 2 });
  });

  await caso("plan contra real: un sobrecosto sale con diferencia positiva", () => {
    const r = planContraReal({
      presupuestos: [{ tipo: "ORIGINAL", estado: "APROBADO", total: 1_000_000, plazoDias: 10 }],
      facturas: [{ origen: "manual", montoAsignado: 1_250_000, pagada: false }],
      partidas: [],
      inicioObra: dia(2026, 10, 1),
      hasta: dia(2026, 10, 6),
    });
    assert.equal(r.costo.diferencia, 250_000);
    assert.deepEqual(r.plazo, { planificado: 10, real: 5, diferencia: -5 });
  });

  await caso("plan contra real sin fecha de inicio: el plazo real y su diferencia quedan en null", () => {
    const r = planContraReal({ presupuestos: PRESUPUESTOS, facturas: [], partidas: [], inicioObra: null, hasta: dia(2026, 11, 15) });
    assert.equal(r.plazo.planificado, 40);
    assert.equal(r.plazo.real, null);
    assert.equal(r.plazo.diferencia, null);
  });

}

// ---- Parte 2: lo que ve el dueño (con datos) ----

const ORG = "org_prueba_obra";
const ORG_OTRO = "org_prueba_obra_otro";
const P = "prueba_obra_"; // prefijo de todos los ids fijos de esta prueba

// Claves que nunca deben aparecer en lo que se le entrega a un cliente, a cualquier profundidad.
const CLAVES_PROHIBIDAS = [
  "total", "montoAsignado", "maestroId", "maestro", "odooMoveId", "pdfDriveFileId", "presupuestos", "facturas",
  "pagada", "precioDueno", "observacion", "autorId", "autor", "tareaId", "odooLineId", "driveCarpetaId", "rolSII",
];
// `obra.recepcion.total` es la cantidad de partidas («3 de 5 recibidas»), no plata: se permite ahí y en ningún otro lado.
const RUTA_DEL_TOTAL_PERMITIDO = "obra.recepcion"; // la ruta del objeto que lleva la clave «total»

// Los valores que sembramos en esas claves y en las notas privadas: si aparecen en cualquier parte
// de lo entregado, hay una fuga aunque la clave se llame distinto.
const SECRETOS = [
  "3456789", "1234567", "990777", "990001", // total del presupuesto, monto asignado, ids de la factura y del maestro en Odoo
  "pdf-secreto-obra", "Maestro Secreto Prueba", "Nota interna del presupuesto", "PRIVADA del equipo",
  "foto-privada-obra", "OBS-SECRETA", "1111111", "2222222", "3333333", // los tres últimos: precios al dueño (solo ponderan)
  "Partida QUITADA", "drive-carpeta-obra", "ROL-OBRA-SECRETO",
];

function clavesConRuta(valor: unknown, ruta = "", salida: { ruta: string; clave: string }[] = []) {
  if (Array.isArray(valor)) {
    for (const v of valor) clavesConRuta(v, ruta, salida);
  } else if (valor && typeof valor === "object" && !(valor instanceof Date)) {
    for (const [clave, v] of Object.entries(valor)) {
      salida.push({ ruta, clave });
      clavesConRuta(v, ruta ? `${ruta}.${clave}` : clave, salida);
    }
  }
  return salida;
}

// Que lo entregado no lleve claves prohibidas ni valores secretos, mirando el objeto entero.
function assertSinFugas(entrega: unknown, quien: string) {
  for (const { ruta, clave } of clavesConRuta(entrega)) {
    if (!CLAVES_PROHIBIDAS.includes(clave)) continue;
    if (clave === "total" && ruta === RUTA_DEL_TOTAL_PERMITIDO) continue;
    assert.fail(`${quien}: sale la clave «${clave}» en «${ruta || "(raíz)"}»`);
  }
  const texto = JSON.stringify(entrega);
  for (const secreto of SECRETOS) {
    assert.equal(texto.includes(secreto), false, `${quien}: sale el dato «${secreto}»`);
  }
}

async function catalogoYEtapaDeObra() {
  const etapa =
    (await db.etapa.findFirst({
      where: { organizationId: ORG_PROGES, tipo: "OBRA", activa: true },
      orderBy: { orden: "asc" },
    })) ??
    (await db.etapa.upsert({
      where: { id: `${P}etapa` },
      update: {},
      create: { id: `${P}etapa`, organizationId: ORG_PROGES, tipo: "OBRA", nombre: "Prueba obra: en obra", orden: 1 },
    }));
  const servicio =
    (await db.servicio.findFirst({ where: { organizationId: ORG_PROGES, activo: true } })) ??
    (await db.servicio.upsert({
      where: { id: `${P}servicio` },
      update: {},
      create: {
        id: `${P}servicio`,
        organizationId: ORG_PROGES,
        codigo: "PRUEBA-OBRA",
        familia: "RR",
        nombre: "Prueba obra: reparación",
      },
    }));
  return { servicioId: servicio.id, etapaId: etapa.id };
}

async function armarDatosDeObra() {
  // Lo que se haya creado a mano en estos clientes (al probar en el navegador) se borra antes.
  await db.servicioEnCurso.deleteMany({
    where: { organizationId: { in: [ORG, ORG_OTRO] }, NOT: { id: { startsWith: P } } },
  });
  const catalogo = await catalogoYEtapaDeObra();

  for (const [id, nombre] of [[ORG, "Prueba obra"], [ORG_OTRO, "Prueba obra (otro cliente)"]]) {
    await db.organizacion.upsert({ where: { id }, update: { nombre, tipo: "CLIENTE", activa: true }, create: { id, nombre, tipo: "CLIENTE" } });
  }

  const cliente = await db.usuario.upsert({
    where: { email: "cliente-obra@proges.test" },
    update: { organizationId: ORG, rol: "CLIENTE", admin: false, jefatura: false, activo: true },
    create: { organizationId: ORG, email: "cliente-obra@proges.test", nombre: "Cliente Obra (prueba)", rol: "CLIENTE" },
  });
  const clienteOtro = await db.usuario.upsert({
    where: { email: "cliente-obra-otro@proges.test" },
    update: { organizationId: ORG_OTRO, rol: "CLIENTE", admin: false, jefatura: false, activo: true },
    create: { organizationId: ORG_OTRO, email: "cliente-obra-otro@proges.test", nombre: "Otro cliente (prueba)", rol: "CLIENTE" },
  });
  const equipo = await db.usuario.upsert({
    where: { email: "equipo-obra@proges.test" },
    update: { organizationId: ORG_PROGES, rol: "EQUIPO", jefatura: true, activo: true },
    create: { organizationId: ORG_PROGES, email: "equipo-obra@proges.test", nombre: "Equipo Obra (prueba)", rol: "EQUIPO", jefatura: true },
  });

  const propiedadId = `${P}propiedad`;
  const datosPropiedad = { organizationId: ORG, tipo: "CASA" as const, direccion: "Calle Obra 100", comuna: "Comuna Obra", region: "Metropolitana", rolSII: "ROL-OBRA-SECRETO", driveCarpetaId: "drive-carpeta-obra" };
  await db.property.upsert({ where: { id: propiedadId }, update: datosPropiedad, create: { id: propiedadId, ...datosPropiedad } });

  const datosServicio = {
    organizationId: ORG, propertyId: propiedadId, servicioId: catalogo.servicioId, tipo: "OBRA" as const, etapaId: catalogo.etapaId,
    estado: "ABIERTO" as const, porConfirmar: false, porRevisar: false, inicioObra: dia(2026, 10, 1),
  };
  const servicioId = `${P}servicio_obra`;
  await db.servicioEnCurso.upsert({ where: { id: servicioId }, update: datosServicio, create: { id: servicioId, ...datosServicio } });
  // Un pedido que aún no se revisó: el dueño no debe poder abrirlo.
  const porRevisarId = `${P}por_revisar`;
  const datosPorRevisar = { ...datosServicio, porRevisar: true };
  await db.servicioEnCurso.upsert({ where: { id: porRevisarId }, update: datosPorRevisar, create: { id: porRevisarId, ...datosPorRevisar } });

  const orden = { organizationId: ORG, numero: "S99001", odooOrderId: 99001, total: 6_666_666, facturado: 1_000_000 };
  const ordenRegistro = await db.ordenDueno.upsert({
    where: { servicioEnCursoId: servicioId },
    update: orden,
    create: { servicioEnCursoId: servicioId, ...orden },
  });

  const maestro = await db.maestro.upsert({
    where: { odooPartnerId: 990001 },
    update: { organizationId: ORG_PROGES, nombre: "Maestro Secreto Prueba", activo: true },
    create: { id: `${P}maestro`, organizationId: ORG_PROGES, odooPartnerId: 990001, nombre: "Maestro Secreto Prueba" },
  });

  // Cuatro partidas: dos en Cocina, una observada en Baño, y una quitada en Odoo que no debe verse.
  const partidasBase = [
    { n: 1, recinto: "Cocina", codigo: "RR-001", descripcion: "Cambio de piso", precioDueno: 1_111_111, avance: 100, recepcion: "CONFORME" as const, observacion: "OBS-SECRETA-1", quitada: false },
    { n: 2, recinto: "Cocina", codigo: "RR-002", descripcion: "Pintura de muros", precioDueno: 2_222_222, avance: 50, recepcion: "PENDIENTE" as const, observacion: null, quitada: false },
    { n: 3, recinto: "Baño", codigo: "RR-003", descripcion: "Cambio de tina", precioDueno: 3_333_333, avance: 20, recepcion: "OBSERVADA" as const, observacion: "OBS-SECRETA-3", quitada: false },
    { n: 4, recinto: "Baño", codigo: "RR-004", descripcion: "Partida QUITADA secreta", precioDueno: 4_444_444, avance: 0, recepcion: "PENDIENTE" as const, observacion: null, quitada: true },
  ];
  for (const p of partidasBase) {
    const datos = {
      organizationId: ORG,
      servicioEnCursoId: servicioId,
      ordenId: ordenRegistro.id,
      recinto: p.recinto,
      codigo: p.codigo,
      descripcion: p.descripcion,
      cantidad: 1,
      unidad: "un",
      precioDueno: p.precioDueno,
      odooLineId: 1000 + p.n,
      posicion: p.n - 1,
      maestroId: maestro.id,
      avance: p.avance,
      recepcion: p.recepcion,
      observacion: p.observacion,
      quitadaEnOdoo: p.quitada,
    };
    await db.partida.upsert({ where: { id: `${P}partida_${p.n}` }, update: datos, create: { id: `${P}partida_${p.n}`, ...datos } });
  }

  const datosPresupuesto = {
    organizationId: ORG,
    servicioEnCursoId: servicioId,
    maestroId: maestro.id,
    tipo: "ORIGINAL" as const,
    total: 3_456_789,
    plazoDias: 30,
    pdfDriveFileId: "pdf-secreto-obra",
    estado: "APROBADO" as const,
    nota: "Nota interna del presupuesto",
    cargadoPorId: equipo.id,
  };
  const partidasConectadas = [1, 2, 3].map((n) => ({ id: `${P}partida_${n}` }));
  await db.presupuestoMaestro.upsert({
    where: { id: `${P}presupuesto` },
    update: { ...datosPresupuesto, partidas: { set: partidasConectadas } },
    create: { id: `${P}presupuesto`, ...datosPresupuesto, partidas: { connect: partidasConectadas } },
  });

  const datosFactura = { organizationId: ORG, servicioEnCursoId: servicioId, maestroId: maestro.id, odooMoveId: 990777, montoAsignado: 1_234_567, asignadaPorId: equipo.id };
  await db.facturaMaestro.upsert({ where: { id: `${P}factura` }, update: datosFactura, create: { id: `${P}factura`, ...datosFactura } });

  // Dos notas: una privada del equipo (con foto) y una para el dueño (con foto).
  const notas = [
    { id: `${P}nota_privada`, texto: "Nota PRIVADA del equipo: el maestro cobra de más", paraDueno: false, foto: "foto-privada-obra" },
    { id: `${P}nota_dueno`, texto: "Avanzamos con la cocina", paraDueno: true, foto: "foto-dueno-obra" },
  ];
  for (const n of notas) {
    const datos = { organizationId: ORG, servicioEnCursoId: servicioId, autorId: equipo.id, texto: n.texto, paraDueno: n.paraDueno };
    await db.nota.upsert({ where: { id: n.id }, update: datos, create: { id: n.id, ...datos } });
    const datosFoto = { organizationId: ORG, notaId: n.id, nombre: `${n.foto}.jpg`, mime: "image/jpeg" };
    await db.foto.upsert({ where: { driveFileId: n.foto }, update: datosFoto, create: { driveFileId: n.foto, ...datosFoto } });
  }

  return { cliente, clienteOtro, propiedadId, servicioId, porRevisarId };
}

async function vistaDelDueno() {
  const d = await armarDatosDeObra();

  await caso("el dueño abre su obra: avance por recinto y total, recepción, sin la partida quitada en Odoo", async () => {
    const s = await servicioParaCliente(d.cliente, d.servicioId);
    assert.ok(s, "el dueño no ve su propia obra");
    assert.ok(s.obra, "la obra no trae partidas");
    // Cocina: (100×1.111.111 + 50×2.222.222) / 3.333.333 = 66,7 · Baño: solo la observada, 20 · Total: 43,3
    assert.equal(s.obra.avance, 43.3);
    assert.deepEqual(s.obra.recintos.map((r) => [r.nombre, r.avance, r.partidas.length]), [["Cocina", 66.7, 2], ["Baño", 20, 1]]);
    assert.deepEqual(s.obra.recepcion, { conformes: 1, observadas: 1, pendientes: 1, total: 3 });
    const descripciones = s.obra.recintos.flatMap((r) => r.partidas.map((p) => p.descripcion));
    assert.equal(descripciones.some((t) => t.includes("QUITADA")), false); // la quitada en Odoo no llega
  });

  await caso("el dueño ve la nota marcada para él, con su foto, y no la privada", async () => {
    const s = await servicioParaCliente(d.cliente, d.servicioId);
    assert.deepEqual(
      s?.notas.map((n) => [n.texto, n.fotos.map((f) => f.driveFileId)]),
      [["Avanzamos con la cocina", ["foto-dueno-obra"]]],
    );
  });

  await caso("nada de lo que se le entrega al dueño lleva montos del maestro, presupuestos, facturas ni notas privadas", async () => {
    assertSinFugas(await servicioParaCliente(d.cliente, d.servicioId), "detalle de la obra");
    assertSinFugas(await serviciosDePropiedad(d.cliente, d.propiedadId), "lista de servicios");
    assertSinFugas(await propiedadesDelCliente(d.cliente), "panel del dueño");
  });

  await caso("la prueba de fugas no es ciega: detecta claves prohibidas y valores secretos", () => {
    assert.throws(() => assertSinFugas({ presupuestos: [{ total: 1 }] }, "falso"));
    assert.throws(() => assertSinFugas({ obra: { x: { maestroId: "m" } } }, "falso"));
    assert.throws(() => assertSinFugas({ obra: { total: 5 } }, "falso")); // «total» solo vale en obra.recepcion
    assert.throws(() => assertSinFugas({ notas: [{ texto: "la PRIVADA del equipo" }] }, "falso"));
    assert.throws(() => assertSinFugas({ precio: 3456789 }, "falso"));
    // Lo permitido pasa: el conteo de partidas vive en obra.recepcion.total.
    assertSinFugas({ obra: { recepcion: { total: 3 } } }, "legítimo");
  });

  await caso("otro cliente no abre la obra por su id, ni ve la propiedad ni sus servicios", async () => {
    assert.equal(await servicioParaCliente(d.clienteOtro, d.servicioId), null);
    assert.deepEqual(await serviciosDePropiedad(d.clienteOtro, d.propiedadId), []);
    assert.equal((await propiedadesDelCliente(d.clienteOtro)).some((p) => p.id === d.propiedadId), false);
  });

  await caso("un pedido «por revisar» no se abre ni se lista para el dueño", async () => {
    assert.equal(await servicioParaCliente(d.cliente, d.porRevisarId), null);
    const lista = await serviciosDePropiedad(d.cliente, d.propiedadId);
    assert.deepEqual(lista.map((s) => s.id), [d.servicioId]);
    const panel = await propiedadesDelCliente(d.cliente);
    assert.deepEqual(panel.find((p) => p.id === d.propiedadId)?.servicios.map((s) => s.id), [d.servicioId]);
  });
}

// ---- Parte 3: la orden de Odoo (a mano, sin Odoo) ----

function linea(id: number, posicion: number, recinto: string, codigo: string, descripcion: string, cantidad: number, unidad: string, precioUnitario: number) {
  return { id, posicion, recinto, codigo, descripcion, detalle: null, cantidad, unidad, precioUnitario };
}

const L101 = linea(101, 0, "Cocina", "RR-001", "Cambio de piso", 12.5, "m2", 40_000);
const L102 = linea(102, 1, "Cocina", "RR-002", "Pintura de muros", 30, "m2", 8_000);
const L103 = linea(103, 2, "Baño", "RR-003", "Cambio de tina", 1, "un", 250_000);
const L104 = linea(104, 3, "Baño", "RR-004", "Grifería", 2, "un", 45_000);

const ORDEN_1: OrdenOdoo = {
  id: 99002,
  numero: "S99002",
  estado: "sale",
  cliente: "Cliente de prueba",
  total: 1_080_000,
  moneda: "CLP",
  cuentaAnalitica: { codigo: "4390-15", nombre: "Monjitas 550 dpto 15" },
  recintos: ["Cocina", "Baño"],
  lineas: [L101, L102, L103, L104],
  anticipos: [
    { id: 901, descripcion: "Anticipo (ref: FAC 000826 el 12/08/2026)", monto: 300_000 },
    { id: 902, descripcion: "Anticipo (ref: FAC 000840 el 02/09/2026)", monto: 200_000 },
  ],
};

// Lo que hace Odoo entre una traída y otra: sube el precio del piso (101), quita la tina (103),
// y agrega un espejo (105). La grifería (104) sube un lugar porque la tina ya no está.
const L105 = linea(105, 3, "Baño", "RR-005", "Espejo", 1, "un", 60_000);
const ORDEN_2: OrdenOdoo = {
  ...ORDEN_1,
  total: 960_000,
  lineas: [{ ...L101, precioUnitario: 42_000 }, L102, { ...L104, posicion: 2 }, L105],
};

// Más tarde la tina vuelve a la orden.
const ORDEN_3: OrdenOdoo = {
  ...ORDEN_1,
  total: 1_146_000,
  lineas: [{ ...L101, precioUnitario: 42_000 }, L102, L103, L104, { ...L105, posicion: 4 }],
};

// Lo que el código de las acciones hace con un plan (orden-actions.ts), con las mismas llamadas.
async function aplicarPlan(plan: PlanDeOrden, ordenId: string, servicioId: string) {
  await db.$transaction(async (tx) => {
    await tx.ordenDueno.update({ where: { id: ordenId }, data: { total: plan.total, moneda: plan.moneda, facturado: plan.facturado } });
    if (plan.nuevas.length > 0) {
      await tx.partida.createMany({
        data: plan.nuevas.map((p) => ({ organizationId: ORG, servicioEnCursoId: servicioId, ordenId, moneda: plan.moneda, ...p })),
      });
    }
    for (const a of plan.actualizadas) await tx.partida.update({ where: { id: a.id }, data: a.datos });
    if (plan.quitadas.length > 0) {
      await tx.partida.updateMany({ where: { id: { in: plan.quitadas }, ordenId }, data: { quitadaEnOdoo: true } });
    }
  });
}

async function existentesDe(servicioId: string): Promise<PartidaExistente[]> {
  const filas = await db.partida.findMany({ where: { servicioEnCursoId: servicioId } });
  return filas.map((f) => ({
    id: f.id,
    odooLineId: f.odooLineId,
    quitadaEnOdoo: f.quitadaEnOdoo,
    recinto: f.recinto,
    codigo: f.codigo,
    descripcion: f.descripcion,
    cantidad: f.cantidad === null ? null : Number(f.cantidad.toString()),
    unidad: f.unidad,
    precioDueno: f.precioDueno === null ? null : Number(f.precioDueno.toString()),
    posicion: f.posicion,
  }));
}

async function ordenDeOdoo() {
  await caso("la orden a mano: recintos, líneas y anticipos (los anticipos no son partidas)", () => {
    const plan = planDeOrden(ORDEN_1, []);
    assert.equal(plan.recintos, 2);
    assert.equal(plan.totalPartidas, 4);
    assert.deepEqual(plan.nuevas.map((p) => p.odooLineId), [101, 102, 103, 104]);
    assert.deepEqual(plan.nuevas.map((p) => p.recinto), ["Cocina", "Cocina", "Baño", "Baño"]);
    assert.equal(plan.anticipos, 2);
    assert.equal(plan.facturado, 500_000); // la suma de los anticipos
    assert.equal(plan.total, 1_080_000);
    assert.equal(plan.moneda, "CLP");
    assert.equal(plan.nuevas.some((p) => [901, 902].includes(p.odooLineId)), false);
    assert.deepEqual([plan.actualizadas.length, plan.quitadas.length, plan.sinCambios, plan.reaparecidas], [0, 0, 0, 0]);
  });

  await caso("lo que viene de Odoo nunca incluye avance, recepción, observación ni maestro", () => {
    const plan = planDeOrden(ORDEN_2, [{ ...nuevaComoExistente(101), id: "x" }]);
    const claves = [...plan.nuevas, ...plan.actualizadas.map((a) => a.datos)].flatMap((o) => Object.keys(o));
    for (const prohibida of ["avance", "recepcion", "observacion", "maestroId", "recibidaEl", "recibidaPorId"]) {
      assert.equal(claves.includes(prohibida), false, `el plan trae «${prohibida}»`);
    }
  });

  await caso("una moneda que no es CLP ni UF se rechaza con un error claro", () => {
    assert.equal(monedaDeOrden("UF"), "UF");
    assert.equal(monedaDeOrden(" clp "), "CLP");
    assert.throws(() => monedaDeOrden("USD"), /solo maneja CLP y UF/);
  });

  // La traída, el trabajo del equipo y las dos vueltas a traer, con la base.
  const servicioId = `${P}servicio_orden`;
  const cat = await catalogoYEtapaDeObra();
  const equipo = await db.usuario.findUniqueOrThrow({ where: { email: "equipo-obra@proges.test" } });
  const maestro = await db.maestro.findUniqueOrThrow({ where: { odooPartnerId: 990001 } });
  // Su propia propiedad: así este proyecto no se mezcla con la lista de servicios del de la parte 2.
  const propiedadOrden = `${P}propiedad_orden`;
  const datosPropiedad = { organizationId: ORG, tipo: "CASA" as const, direccion: "Calle Orden 200", comuna: "Comuna Obra", region: "Metropolitana" };
  await db.property.upsert({ where: { id: propiedadOrden }, update: datosPropiedad, create: { id: propiedadOrden, ...datosPropiedad } });
  const datosServicio = { organizationId: ORG, propertyId: propiedadOrden, servicioId: cat.servicioId, tipo: "OBRA" as const, etapaId: cat.etapaId, estado: "ABIERTO" as const };
  await db.servicioEnCurso.upsert({ where: { id: servicioId }, update: datosServicio, create: { id: servicioId, ...datosServicio } });
  await db.ordenDueno.deleteMany({ where: { servicioEnCursoId: servicioId } }); // parte de cero en cada corrida
  await db.partida.deleteMany({ where: { servicioEnCursoId: servicioId } });

  const plan1 = planDeOrden(ORDEN_1, []);
  const ordenRegistro = await db.ordenDueno.create({
    data: { organizationId: ORG, servicioEnCursoId: servicioId, numero: ORDEN_1.numero, odooOrderId: ORDEN_1.id, total: plan1.total, moneda: plan1.moneda, facturado: plan1.facturado },
  });
  await db.partida.createMany({
    data: plan1.nuevas.map((p) => ({ organizationId: ORG, servicioEnCursoId: servicioId, ordenId: ordenRegistro.id, moneda: plan1.moneda, ...p })),
  });
  const idDe = async (odooLineId: number) =>
    (await db.partida.findFirstOrThrow({ where: { servicioEnCursoId: servicioId, odooLineId } })).id;

  // El equipo trabaja: avance, recepción, observación y maestro en dos líneas.
  const recibida = dia(2026, 11, 10);
  await db.partida.update({
    where: { id: await idDe(101) },
    data: { avance: 80, recepcion: "CONFORME", observacion: "Quedó bien", maestroId: maestro.id, recibidaEl: recibida, recibidaPorId: equipo.id },
  });
  await db.partida.update({ where: { id: await idDe(103) }, data: { avance: 30, maestroId: maestro.id } });

  await caso("recién traída y sin cambios en Odoo, volver a traer no hace nada (ni por redondeo de decimales)", async () => {
    const plan = planDeOrden(ORDEN_1, await existentesDe(servicioId));
    assert.deepEqual([plan.nuevas.length, plan.actualizadas.length, plan.quitadas.length, plan.reaparecidas], [0, 0, 0, 0]);
    assert.equal(plan.sinCambios, 4);
  });

  await caso("Odoo cambió la orden: una nueva, dos cambiadas, una quitada y una sin cambios", async () => {
    const existentes = await existentesDe(servicioId);
    const plan = planDeOrden(ORDEN_2, existentes);
    assert.deepEqual(plan.nuevas.map((p) => p.odooLineId), [105]);
    assert.deepEqual(plan.actualizadas.map((a) => a.id).sort(), [await idDe(101), await idDe(104)].sort()); // precio y posición
    assert.deepEqual(plan.quitadas, [await idDe(103)]);
    assert.equal(plan.sinCambios, 1); // la 102
    assert.equal(plan.reaparecidas, 0);
    assert.equal(plan.total, 960_000);
    await aplicarPlan(plan, ordenRegistro.id, servicioId);
  });

  await caso("volver a traer no perdió avance, recepción, observación ni maestro, y no borró la quitada", async () => {
    const p101 = await db.partida.findUniqueOrThrow({ where: { id: await idDe(101) } });
    assert.equal(Number(p101.precioDueno?.toString()), 42_000); // lo de Odoo se actualizó
    assert.equal(p101.avance, 80); // lo del equipo quedó
    assert.equal(p101.recepcion, "CONFORME");
    assert.equal(p101.observacion, "Quedó bien");
    assert.equal(p101.maestroId, maestro.id);
    assert.equal(p101.recibidaEl?.toISOString(), recibida.toISOString());

    const p103 = await db.partida.findUniqueOrThrow({ where: { id: await idDe(103) } });
    assert.equal(p103.quitadaEnOdoo, true); // marcada, no borrada
    assert.equal(p103.avance, 30);
    assert.equal(p103.maestroId, maestro.id);

    const p105 = await db.partida.findUniqueOrThrow({ where: { id: await idDe(105) } });
    assert.equal(p105.avance, 0); // la nueva parte de cero
    assert.equal(p105.recepcion, "PENDIENTE");

    const orden = await db.ordenDueno.findUniqueOrThrow({ where: { id: ordenRegistro.id } });
    assert.equal(Number(orden.total.toString()), 960_000);
    assert.equal(await db.partida.count({ where: { servicioEnCursoId: servicioId } }), 5); // 4 + 1 nueva, ninguna borrada
  });

  await caso("la línea quitada reaparece en Odoo: vuelve a estar vigente con su avance de antes", async () => {
    const plan = planDeOrden(ORDEN_3, await existentesDe(servicioId));
    assert.equal(plan.reaparecidas, 1);
    assert.equal(plan.nuevas.length, 0);
    assert.equal(plan.quitadas.length, 0);
    assert.equal(plan.sinCambios, 2); // 101 y 102
    assert.deepEqual(plan.actualizadas.map((a) => a.id).sort(), [await idDe(103), await idDe(104), await idDe(105)].sort());
    await aplicarPlan(plan, ordenRegistro.id, servicioId);

    const p103 = await db.partida.findUniqueOrThrow({ where: { id: await idDe(103) } });
    assert.equal(p103.quitadaEnOdoo, false);
    assert.equal(p103.avance, 30);
    assert.equal(p103.maestroId, maestro.id);
    // Y con la orden igual a la de Odoo ya no queda nada por hacer.
    const otra = planDeOrden(ORDEN_3, await existentesDe(servicioId));
    assert.deepEqual([otra.nuevas.length, otra.actualizadas.length, otra.quitadas.length, otra.reaparecidas], [0, 0, 0, 0]);
    assert.equal(otra.sinCambios, 5);
  });

  await caso("una partida anotada a mano (sin línea de Odoo) nunca se marca quitada", () => {
    const aMano: PartidaExistente = { ...nuevaComoExistente(101), id: "a-mano", odooLineId: null };
    const plan = planDeOrden(ORDEN_2, [aMano]);
    assert.deepEqual(plan.quitadas, []);
    assert.equal(plan.nuevas.length, 4); // las de Odoo igual se crean
  });
}

// Una partida existente igual a la línea de Odoo `odooLineId` de la orden 1.
function nuevaComoExistente(odooLineId: number): PartidaExistente {
  const l = ORDEN_1.lineas.find((x) => x.id === odooLineId)!;
  return {
    id: `p${odooLineId}`,
    odooLineId,
    quitadaEnOdoo: false,
    recinto: l.recinto,
    codigo: l.codigo,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    unidad: l.unidad,
    precioDueno: l.precioUnitario,
    posicion: l.posicion,
  };
}

async function cuentaAnalitica() {
  const propia: PropiedadParaCuenta = { id: "p1", direccion: "Monjitas 550 dpto 15", rolSII: "4390-15", odooCuentaAnalitica: null };
  const vecina: PropiedadParaCuenta = { id: "p2", direccion: "Monjitas 550 dpto 16", rolSII: null, odooCuentaAnalitica: "4390-16" };
  const gemela: PropiedadParaCuenta = { id: "p3", direccion: "Monjitas 550 dpto 17", rolSII: null, odooCuentaAnalitica: "4390-15" };
  const cuenta = { codigo: "4390-15", nombre: "Monjitas 550 dpto 15" };

  await caso("cuenta analítica que calza con el ROL de la propiedad del proyecto, sin importar mayúsculas", () => {
    assert.equal(compararCuenta(cuenta, propia, [propia, vecina]).tipo, "calza");
    assert.equal(compararCuenta({ codigo: "4390-15 ", nombre: "x" }, { ...propia, rolSII: "4390-15" }, [propia]).tipo, "calza");
    assert.equal(compararCuenta({ codigo: "ab-1", nombre: "x" }, { ...propia, rolSII: "AB-1" }, [propia]).tipo, "calza");
  });

  await caso("la cuenta es de otra propiedad del cliente (avisa cuál), no calza con ninguna, o la orden no trae cuenta", () => {
    const v = compararCuenta({ codigo: "4390-16", nombre: "x" }, propia, [propia, vecina]);
    assert.equal(v.tipo, "otra");
    assert.deepEqual(v.otras.map((o) => o.id), ["p2"]);
    assert.equal(compararCuenta({ codigo: "9999-99", nombre: "x" }, propia, [propia, vecina]).tipo, "ninguna");
    assert.equal(compararCuenta(null, propia, [propia]).tipo, "sin-cuenta");
    assert.equal(compararCuenta({ codigo: null, nombre: "x" }, propia, [propia]).tipo, "sin-cuenta");
  });

  await caso("una cuenta que cubre dos unidades calza, pero avisa de la otra para que se confirme", () => {
    const v = compararCuenta(cuenta, propia, [propia, gemela]);
    assert.equal(v.tipo, "calza");
    assert.deepEqual(v.otras.map((o) => o.id), ["p3"]);
  });
}

// ---------------------------------------------------------------------------

async function main() {
  await cuentas();
  await avanceYRecepcion();
  await planContraRealDeObra();
  await vistaDelDueno();
  await ordenDeOdoo();
  await cuentaAnalitica();
  console.log(`${casos} casos, todos pasan`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
