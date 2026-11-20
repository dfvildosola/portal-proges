// Pruebas de la obra y los maestros (pieza E). Traslada legado/scripts/probar-obra.ts.
//
// Tres partes:
//  1. Las reglas puras (cuentas, avance, recepción, plan contra real, margen, orden de Odoo, cuenta
//     analítica, formularios): números a mano, sin base ni Odoo.
//  2. Los maestros por la API, con un Odoo falso.
//  3. Una obra de punta a punta por la API: orden, partidas, presupuestos, facturas, recepción y
//     cierre; y lo que NO debe ver un dueño ni una llave.
// Odoo y Drive son falsos: nunca se toca el de verdad.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { db, ORG_PROGES } from "@proges/db";
import { clavesInternas, crearEscenario, type Escenario } from "./ayuda";
import type { FacturaOdoo, OrdenOdoo, ProveedorOdoo } from "../src/integraciones/odoo";
import {
  adicionales,
  aprobado,
  asignableRestante,
  avancePonderado,
  cuentasDeObra,
  facturado,
  margenDeObra,
  obraSePuedeCerrar,
  pagado,
  planContraReal,
  plazoPlanificadoDias,
  resumenRecepcion,
  saldo,
  type FacturaCuenta,
  type PartidaCuenta,
  type PresupuestoCuenta,
} from "../src/dominio/obra/obra";
import { obra } from "../src/rutas/obra";
import { maestros } from "../src/rutas/maestros";

const dia = (anio: number, mes: number, d: number) => new Date(Date.UTC(anio, mes - 1, d));

// ---------------------------------------------------------------------------
// Parte 1: las cuentas (puras)
// ---------------------------------------------------------------------------

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

// Una factura de Odoo de 6.000.000 se reparte entre DOS obras: 4.000.000 a esta y 2.000.000 a la
// otra. Odoo dice que falta pagar 3.000.000 (se pagó la mitad). Y una factura «fuera de Odoo» de
// 1.500.000, ya pagada.
const FACTURA_ODOO_6M = { total: 6_000_000, pendiente: 3_000_000, estado: "publicada" } as const;
const ESTA_OBRA: FacturaCuenta[] = [
  { origen: "odoo", montoAsignado: 4_000_000, ...FACTURA_ODOO_6M },
  { origen: "manual", montoAsignado: 1_500_000, pagada: true },
];
const LA_OTRA_OBRA: FacturaCuenta[] = [{ origen: "odoo", montoAsignado: 2_000_000, ...FACTURA_ODOO_6M }];

describe("cuentas de la obra (puras)", () => {
  test("aprobado y adicionales suman solo lo APROBADO (ni el rechazado ni el recibido)", () => {
    assert.equal(aprobado(PRESUPUESTOS), 12_000_000);
    assert.equal(adicionales(PRESUPUESTOS), 1_500_000);
  });

  test("facturado = lo asignado: 4.000.000 de Odoo + 1.500.000 fuera de Odoo", () => {
    assert.equal(facturado(ESTA_OBRA), 5_500_000);
  });

  test("pagado: la parte pagada de la factura de Odoo en proporción a lo asignado, más la manual pagada", () => {
    assert.equal(pagado(ESTA_OBRA), 3_500_000); // 2.000.000 + 1.500.000
  });

  test("saldo = aprobado + adicionales − pagado = 13.500.000 − 3.500.000 = 10.000.000", () => {
    assert.equal(saldo(PRESUPUESTOS, ESTA_OBRA), 10_000_000);
    assert.deepEqual(cuentasDeObra(PRESUPUESTOS, ESTA_OBRA), {
      aprobado: 12_000_000,
      adicionales: 1_500_000,
      facturado: 5_500_000,
      pagado: 3_500_000,
      saldo: 10_000_000,
    });
  });

  test("la factura repartida entre dos obras: lo pagado de las dos suma exactamente lo pagado en Odoo", () => {
    const enLaOtra = pagado(LA_OTRA_OBRA);
    assert.equal(enLaOtra, 1_000_000);
    assert.equal(pagado([ESTA_OBRA[0]]) + enLaOtra, FACTURA_ODOO_6M.total - FACTURA_ODOO_6M.pendiente);
    assert.equal(facturado([ESTA_OBRA[0]]) + facturado(LA_OTRA_OBRA), FACTURA_ODOO_6M.total);
  });

  test("una factura de Odoo en borrador se factura pero no cuenta como pagada; la anulada ni una ni otra", () => {
    for (const estado of ["borrador", "anulada"] as const) {
      const f: FacturaCuenta = { origen: "odoo", montoAsignado: 1_000_000, total: 1_000_000, pendiente: 1_000_000, estado };
      assert.equal(facturado([f]), estado === "borrador" ? 1_000_000 : 0, estado);
      assert.equal(pagado([f]), 0, estado);
    }
  });

  test("una manual sin marcar pagada se factura pero no se paga", () => {
    const f: FacturaCuenta = { origen: "manual", montoAsignado: 800_000, pagada: false };
    assert.equal(facturado([f]), 800_000);
    assert.equal(pagado([f]), 0);
  });

  test("pagado se redondea a centavos", () => {
    const f: FacturaCuenta = { origen: "odoo", montoAsignado: 1_000_000, total: 3_000_000, pendiente: 1_000_000, estado: "publicada" };
    assert.equal(pagado([f]), 666_666.67);
  });

  test("lo asignable de una factura nunca baja de 0 ni pasa el total", () => {
    assert.equal(asignableRestante(6_000_000, 4_000_000), 2_000_000);
    assert.equal(asignableRestante(6_000_000, 6_000_000), 0);
    assert.equal(asignableRestante(6_000_000, 7_000_000), 0);
    assert.equal(asignableRestante(6_000_000, 0), 6_000_000);
  });
});

describe("avance, recepción, plan contra real y margen (puros)", () => {
  const partidas: PartidaCuenta[] = [
    { avance: 100, precioDueno: 1_000_000, recepcion: "CONFORME" },
    { avance: 50, precioDueno: 3_000_000, recepcion: "PENDIENTE" },
    { avance: 0, precioDueno: null, recepcion: "PENDIENTE" }, // sin precio: no pesa cuando otras sí tienen
    { avance: 0, precioDueno: 5_000_000, recepcion: "PENDIENTE", quitadaEnOdoo: true }, // quitada: no cuenta
  ];

  test("avance ponderado por precio: (100×1M + 50×3M) / 4M = 62,5", () => {
    assert.equal(avancePonderado(partidas), 62.5);
  });

  test("avance sin ningún precio: promedio simple; sin partidas, 0", () => {
    assert.equal(
      avancePonderado([{ avance: 0, recepcion: "PENDIENTE" }, { avance: 50, recepcion: "PENDIENTE" }, { avance: 100, recepcion: "PENDIENTE" }]),
      50,
    );
    assert.equal(avancePonderado([]), 0);
  });

  test("resumen de recepción: no cuenta las quitadas en Odoo", () => {
    assert.deepEqual(resumenRecepcion(partidas), { conformes: 1, observadas: 0, pendientes: 2, total: 3 });
  });

  test("regla de cierre: solo con todas las partidas vigentes conformes; una quitada pendiente no la traba", () => {
    const conforme = (extra: Partial<PartidaCuenta> = {}): PartidaCuenta => ({ avance: 100, recepcion: "CONFORME", ...extra });
    assert.equal(obraSePuedeCerrar([conforme(), conforme()]), true);
    assert.equal(obraSePuedeCerrar([conforme(), conforme({ recepcion: "PENDIENTE" })]), false);
    assert.equal(obraSePuedeCerrar([conforme(), conforme({ recepcion: "OBSERVADA" })]), false);
    assert.equal(obraSePuedeCerrar([conforme(), { avance: 0, recepcion: "PENDIENTE", quitadaEnOdoo: true }]), true);
  });

  test("plazo planificado: el del maestro que más se demora, solo de lo aprobado", () => {
    assert.equal(plazoPlanificadoDias(PRESUPUESTOS), 40);
    assert.equal(plazoPlanificadoDias([{ tipo: "ORIGINAL", estado: "APROBADO", total: 1, plazoDias: null }]), null);
    assert.equal(plazoPlanificadoDias([]), null);
  });

  test("plan contra real: costo y plazo con inicio el 1 de octubre y hoy el 15 de noviembre (45 días)", () => {
    const r = planContraReal({
      presupuestos: PRESUPUESTOS,
      facturas: ESTA_OBRA,
      partidas: [{ avance: 100, recepcion: "CONFORME" }, { avance: 100, recepcion: "OBSERVADA" }],
      inicioObra: dia(2026, 10, 1),
      hasta: dia(2026, 11, 15),
    });
    assert.deepEqual(r.costo, { planificado: 13_500_000, real: 5_500_000, diferencia: -8_000_000 });
    assert.deepEqual(r.plazo, { planificado: 40, real: 45, diferencia: 5 });
    assert.deepEqual(r.partidas, { conformes: 1, observadas: 1, pendientes: 0, total: 2 });
  });

  test("plan contra real: un sobrecosto sale positivo y sin fecha de inicio el plazo real es null", () => {
    const r = planContraReal({
      presupuestos: [{ tipo: "ORIGINAL", estado: "APROBADO", total: 1_000_000, plazoDias: 10 }],
      facturas: [{ origen: "manual", montoAsignado: 1_250_000, pagada: false }],
      partidas: [],
      inicioObra: null,
      hasta: dia(2026, 10, 6),
    });
    assert.equal(r.costo.diferencia, 250_000);
    assert.deepEqual(r.plazo, { planificado: 10, real: null, diferencia: null });
  });

  test("margen: precio al dueño menos costo planificado y menos costo real", () => {
    assert.deepEqual(margenDeObra(20_000_000, 13_500_000, 5_500_000), { planificado: 6_500_000, real: 14_500_000 });
  });
});

// ---------------------------------------------------------------------------
// La orden de Odoo (pura, hecha a mano)
// ---------------------------------------------------------------------------

function linea(id: number, posicion: number, recinto: string, codigo: string, descripcion: string, cantidad: number, unidad: string, precioUnitario: number) {
  return { id, posicion, recinto, codigo, descripcion, detalle: null, cantidad, unidad, precioUnitario, subtotal: cantidad * precioUnitario };
}
const L101 = linea(101, 0, "Cocina", "RR-001", "Cambio de piso", 12.5, "m2", 40_000);
const L102 = linea(102, 1, "Cocina", "RR-002", "Pintura de muros", 30, "m2", 8_000);
const L103 = linea(103, 2, "Baño", "RR-003", "Cambio de tina", 1, "un", 250_000);
const L104 = linea(104, 3, "Baño", "RR-004", "Grifería", 2, "un", 45_000);
const L105 = linea(105, 3, "Baño", "RR-005", "Espejo", 1, "un", 60_000);

// Una orden de Odoo que se pasa de mano: `id` y `numero` únicos por corrida (una orden se enlaza a
// un solo servicio en toda la base).
function ordenBase(id: number, numero: string): OrdenOdoo {
  return {
    id,
    numero,
    estado: "sale",
    cliente: "Cliente de prueba",
    total: 20_000_000,
    moneda: "CLP",
    cuentaAnalitica: { codigo: "4390-15", nombre: "Monjitas 550 dpto 15" },
    recintos: ["Cocina", "Baño"],
    lineas: [L101, L102, L103, L104],
    anticipos: [
      { id: 901, descripcion: "Anticipo (ref: FAC 000826 el 12/08/2026)", monto: 300_000 },
      { id: 902, descripcion: "Anticipo (ref: FAC 000840 el 02/09/2026)", monto: 200_000 },
    ],
  };
}
// Lo que hace Odoo entre una traída y otra: sube el precio del piso (101), quita la tina (103) y
// agrega un espejo (105); la grifería (104) sube un lugar.
const tras = (o: OrdenOdoo): OrdenOdoo => ({
  ...o,
  lineas: [{ ...L101, precioUnitario: 42_000, subtotal: 12.5 * 42_000 }, L102, { ...L104, posicion: 2 }, L105],
});

// ---------------------------------------------------------------------------
// Partes 2 y 3: por la API, con Odoo y Drive falsos
// ---------------------------------------------------------------------------

const unico = Math.floor(Math.random() * 900_000) + 100_000; // ids de Odoo únicos por corrida
const ID_PROVEEDOR = 700_000_000 + unico;
const ID_FACTURA = 710_000_000 + unico;
const ORDEN = ordenBase(720_000_000 + unico, `S${unico}`);

let e: Escenario;
let catalogoId: string;
let propiedadId: string;
let servicioId: string;
let otroServicioId: string; // para repartir una factura entre dos obras
let sinOrdenId: string;
let maestroId: string;
const idsDePartidas: Record<number, string> = {};
const subidas: { nombre: string; mime: string }[] = [];

const FACTURA_ODOO: FacturaOdoo = {
  id: ID_FACTURA,
  numero: "FAC 000209",
  fecha: dia(2026, 10, 20),
  total: 6_000_000,
  estado: "publicada",
  pendiente: 3_000_000,
};
const PROVEEDOR: ProveedorOdoo = {
  id: ID_PROVEEDOR,
  nombre: `Maestro Secreto Prueba ${unico} Ltda`,
  rut: "76.000.000-0",
  telefono: "+56 9 1111 1111",
  correo: null,
  facturas: 3,
};

before(async () => {
  e = await crearEscenario({
    odoo: {
      leerOrden: async (numero) => {
        if (numero.trim().toUpperCase() !== ordenActual.numero) throw new Error(`No existe la orden ${numero} en Odoo.`);
        return ordenActual;
      },
      buscarProveedores: async (texto) => (PROVEEDOR.nombre.toLowerCase().includes(texto.toLowerCase().split(" ")[0]) ? [PROVEEDOR] : []),
      leerProveedor: async (id) => (id === ID_PROVEEDOR ? PROVEEDOR : null),
      facturasDeProveedor: async (id) => (id === ID_PROVEEDOR ? [FACTURA_ODOO] : []),
      leerFacturas: async (ids) => (ids.includes(ID_FACTURA) ? [FACTURA_ODOO] : []),
    },
    drive: {
      subirArchivo: async ({ nombre, mime }) => {
        subidas.push({ nombre, mime });
        return { driveFileId: `drive_${unico}_${subidas.length}` };
      },
    },
  });
  const servicioCatalogo = await db.servicio.create({
    data: { organizationId: ORG_PROGES, codigo: `PRUEBA-OBRA-${unico}`, familia: "RR", nombre: `Prueba obra ${unico}` },
  });
  catalogoId = servicioCatalogo.id;
  const propiedad = await db.property.create({
    data: {
      organizationId: e.ids.clienteA,
      tipo: "CASA",
      direccion: `Monjitas 550 dpto 15 (${unico})`,
      comuna: "Santiago",
      region: "Metropolitana",
      rolSII: "4390-15",
      driveCarpetaId: `carpeta_prueba_${unico}_abcdef`,
    },
  });
  propiedadId = propiedad.id;
  const nuevoServicio = (extra: object = {}) =>
    db.servicioEnCurso.create({
      data: {
        organizationId: e.ids.clienteA,
        propertyId: propiedadId,
        servicioId: catalogoId,
        tipo: "OBRA",
        inicioObra: dia(2026, 10, 1),
        ...extra,
      },
    });
  servicioId = (await nuevoServicio()).id;
  otroServicioId = (await nuevoServicio()).id;
  sinOrdenId = (await nuevoServicio({ inicioObra: null })).id;
});

let ordenActual: OrdenOdoo = ORDEN;

after(async () => {
  // Lo de org_proges se borra antes: los presupuestos y facturas de los clientes apuntan al maestro.
  await e.limpiar();
  await db.maestro.deleteMany({ where: { odooPartnerId: ID_PROVEEDOR } });
  await db.servicio.deleteMany({ where: { id: catalogoId } });
});

// Un archivo para los formularios.
const archivo = (contenido: string | Uint8Array, nombre: string, tipo: string) => new File([Buffer.from(contenido)], nombre, { type: tipo });
const formulario = (campos: Record<string, string | File | (string | File)[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
};

describe("maestros", () => {
  test("agregar un maestro: solo el equipo; copia el nombre de Odoo y no se repite", async () => {
    const mal = await e.pedir("equipo", "POST", "/v1/maestros", { odooPartnerId: ID_PROVEEDOR + 1 });
    assert.equal(mal.estado, 400);

    const ok = await e.pedir("equipo", "POST", "/v1/maestros", {
      odooPartnerId: ID_PROVEEDOR,
      especialidad: "Gasfitería",
    });
    assert.equal(ok.estado, 201, JSON.stringify(ok.cuerpo));
    assert.equal(ok.cuerpo.nombre, PROVEEDOR.nombre); // el nombre sale de Odoo
    assert.equal(ok.cuerpo.telefono, PROVEEDOR.telefono); // sin teléfono propio, parte con el de Odoo
    assert.equal(ok.cuerpo.especialidad, "Gasfitería");
    maestroId = ok.cuerpo.id;

    const repetido = await e.pedir("equipo", "POST", "/v1/maestros", { odooPartnerId: ID_PROVEEDOR });
    assert.equal(repetido.estado, 409);
  });

  test("buscar en Odoo marca a los que ya son maestros; listar; cambiar y desactivar", async () => {
    const busqueda = await e.pedir("equipo", "GET", "/v1/maestros/odoo?q=Maestro%20Secreto");
    assert.equal(busqueda.estado, 200);
    assert.equal(busqueda.cuerpo.items[0].yaAgregado, true);
    assert.equal((await e.pedir("equipo", "GET", "/v1/maestros/odoo?q=a")).estado, 400); // muy corto

    const lista = await e.pedir("equipo", "GET", "/v1/maestros?soloActivos=true");
    assert.ok(lista.cuerpo.items.some((m: { id: string }) => m.id === maestroId));

    const cambio = await e.pedir("equipo", "PATCH", `/v1/maestros/${maestroId}`, { especialidad: "Electricidad", telefono: null });
    assert.equal(cambio.estado, 200);
    assert.equal(cambio.cuerpo.especialidad, "Electricidad");
    assert.equal(cambio.cuerpo.telefono, null);
    const nombre = await e.pedir("equipo", "PATCH", `/v1/maestros/${maestroId}`, { refrescarNombreDeOdoo: true });
    assert.equal(nombre.estado, 200);
  });

  test("un dueño, una llave o un anónimo no ven ni tocan a los maestros", async () => {
    for (const quien of ["clienteA", "llaveA"] as const) {
      assert.equal((await e.pedir(quien, "GET", "/v1/maestros")).estado, 403, quien);
      assert.equal((await e.pedir(quien, "GET", "/v1/maestros/odoo?q=Maestro")).estado, 403, quien);
      assert.equal((await e.pedir(quien, "POST", "/v1/maestros", { odooPartnerId: 1 })).estado, 403, quien);
      assert.equal((await e.pedir(quien, "PATCH", `/v1/maestros/${maestroId}`, { activo: false })).estado, 403, quien);
      assert.equal((await e.pedir(quien, "GET", `/v1/maestros/${maestroId}/facturas-odoo`)).estado, 403, quien);
    }
    assert.equal((await e.pedir("anonimo", "GET", "/v1/maestros")).estado, 401);
  });

  test("las facturas de un maestro en Odoo, con cuánto queda por asignar", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/maestros/${maestroId}/facturas-odoo`);
    assert.equal(r.estado, 200);
    assert.deepEqual(r.cuerpo.items[0].asignable, { valor: "6000000", moneda: "CLP" });
    assert.equal((await e.pedir("equipo", "GET", "/v1/maestros/no-existe/facturas-odoo")).estado, 404);
  });
});

describe("la obra de punta a punta", () => {
  test("la orden: se revisa sin guardar, y recién al confirmar se enlaza", async () => {
    const ruta = `/v1/servicios/${servicioId}/orden`;
    const revision = await e.pedir("equipo", "POST", ruta, { numero: ORDEN.numero });
    assert.equal(revision.estado, 200, JSON.stringify(revision.cuerpo));
    assert.equal(revision.cuerpo.enlazada, false);
    assert.equal(revision.cuerpo.revision.veredicto, "calza"); // la cuenta 4390-15 es el ROL de la propiedad
    assert.equal(revision.cuerpo.revision.partidas, 4);
    assert.equal(await db.ordenDueno.count({ where: { servicioEnCursoId: servicioId } }), 0); // no guardó nada

    assert.equal((await e.pedir("equipo", "POST", ruta, { numero: "S0" })).estado, 404); // no existe en Odoo

    const enlazada = await e.pedir("equipo", "POST", ruta, { numero: ORDEN.numero, confirmar: true });
    assert.equal(enlazada.estado, 200);
    assert.equal(enlazada.cuerpo.enlazada, true);
    assert.equal(await db.partida.count({ where: { servicioEnCursoId: servicioId } }), 4);

    // Una orden se enlaza a un solo servicio, y un servicio tiene una sola orden.
    assert.equal((await e.pedir("equipo", "POST", ruta, { numero: ORDEN.numero, confirmar: true })).estado, 409);
    assert.equal((await e.pedir("equipo", "POST", `/v1/servicios/${otroServicioId}/orden`, { numero: ORDEN.numero })).estado, 409);

    for (const p of await db.partida.findMany({ where: { servicioEnCursoId: servicioId } })) idsDePartidas[p.odooLineId as number] = p.id;
  });

  test("avance y maestro por partida y por recinto; sin datos, 400", async () => {
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/partidas/${idsDePartidas[101]}`, { avance: 75, maestroId })).estado, 204);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/partidas/${idsDePartidas[101]}`, { avance: 33 })).estado, 400);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/partidas/${idsDePartidas[101]}`, {})).estado, 400);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/partidas/${idsDePartidas[101]}`, { maestroId: "inventado" })).estado, 400);
    const recinto = await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioId}/obra/avance`, { recinto: "Baño", avance: 50 });
    assert.equal(recinto.estado, 200);
    assert.equal(recinto.cuerpo.partidasCambiadas, 2);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioId}/obra/avance`, { recinto: "Techo", avance: 50 })).estado, 404);
    assert.equal((await db.partida.findUniqueOrThrow({ where: { id: idsDePartidas[101] } })).avance, 75);
  });

  test("volver a traer la orden no pierde avance ni maestro, y marca la quitada sin borrarla", async () => {
    ordenActual = tras(ORDEN);
    const r = await e.pedir("equipo", "POST", `/v1/servicios/${servicioId}/orden/actualizar`);
    assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
    assert.deepEqual([r.cuerpo.nuevas, r.cuerpo.cambiadas, r.cuerpo.quitadasEnOdoo], [1, 2, 1]);
    const p101 = await db.partida.findUniqueOrThrow({ where: { id: idsDePartidas[101] } });
    assert.equal(Number(p101.precioDueno), 525_000); // 12,5 m² × 42.000: el total de la línea
    assert.equal(p101.avance, 75); // lo del equipo quedó
    assert.equal(p101.maestroId, maestroId);
    const p103 = await db.partida.findUniqueOrThrow({ where: { id: idsDePartidas[103] } });
    assert.equal(p103.quitadaEnOdoo, true); // marcada, no borrada
    assert.equal(p103.avance, 50);
    assert.equal(await db.partida.count({ where: { servicioEnCursoId: servicioId } }), 5);
    for (const p of await db.partida.findMany({ where: { servicioEnCursoId: servicioId } })) idsDePartidas[p.odooLineId as number] = p.id;
    // La orden sigue siendo la misma para el resto de las pruebas: el total no cambió.
    assert.equal(Number((await db.ordenDueno.findFirstOrThrow({ where: { servicioEnCursoId: servicioId } })).total), 20_000_000);
  });

  test("presupuestos: se cargan con PDF; solo la jefatura los aprueba o rechaza", async () => {
    const pdf = archivo("%PDF-1.7 presupuesto", "p.pdf", "application/pdf");
    const falso = await e.pedir(
      "equipo",
      "POST",
      `/v1/servicios/${servicioId}/presupuestos`,
      formulario({ maestroId, tipo: "ORIGINAL", total: "10000000", pdf: archivo("no soy pdf", "p.pdf", "application/pdf") }),
    );
    assert.equal(falso.estado, 400); // no empieza con %PDF
    const ajena = await e.pedir(
      "equipo",
      "POST",
      `/v1/servicios/${servicioId}/presupuestos`,
      formulario({ maestroId, tipo: "ORIGINAL", total: "10000000", partidaIds: ["no-es-de-este-servicio"] }),
    );
    assert.equal(ajena.estado, 400);

    const original = await e.pedir(
      "equipo",
      "POST",
      `/v1/servicios/${servicioId}/presupuestos`,
      formulario({ maestroId, tipo: "ORIGINAL", total: "10000000", plazoDias: "30", partidaIds: [idsDePartidas[101], idsDePartidas[102]], nota: "Nota interna del presupuesto", pdf }),
    );
    assert.equal(original.estado, 201, JSON.stringify(original.cuerpo));
    assert.equal(original.cuerpo.estado, "RECIBIDO");
    assert.equal(subidas.length, 1);
    assert.equal(subidas[0].mime, "application/pdf");
    const adicional = await e.pedir("equipo", "POST", `/v1/servicios/${servicioId}/presupuestos`, formulario({ maestroId, tipo: "ADICIONAL", total: "1500000", plazoDias: "10" }));
    assert.equal(adicional.estado, 201);
    const rechazable = await e.pedir("equipo", "POST", `/v1/servicios/${servicioId}/presupuestos`, formulario({ maestroId, tipo: "ORIGINAL", total: "9000000" }));

    // Sin jefatura no se aprueba ni se rechaza (403): ni el equipo, ni un dueño, ni una llave.
    for (const quien of ["equipo", "clienteA", "llaveA", "admin"] as const) {
      assert.equal((await e.pedir(quien, "POST", `/v1/presupuestos/${original.cuerpo.id}/aprobar`)).estado, 403, quien);
      assert.equal((await e.pedir(quien, "POST", `/v1/presupuestos/${original.cuerpo.id}/rechazar`, { motivo: "no" })).estado, 403, quien);
    }
    assert.equal((await e.pedir("jefatura", "POST", `/v1/presupuestos/${original.cuerpo.id}/aprobar`)).estado, 200);
    assert.equal((await e.pedir("jefatura", "POST", `/v1/presupuestos/${original.cuerpo.id}/aprobar`)).estado, 409); // ya resuelto
    assert.equal((await e.pedir("jefatura", "POST", `/v1/presupuestos/${adicional.cuerpo.id}/aprobar`)).estado, 200);
    assert.equal((await e.pedir("jefatura", "POST", `/v1/presupuestos/${rechazable.cuerpo.id}/rechazar`, { motivo: "" })).estado, 400);
    assert.equal((await e.pedir("jefatura", "POST", `/v1/presupuestos/${rechazable.cuerpo.id}/rechazar`, { motivo: "Muy caro" })).estado, 200);
    // Las partidas que cubría el aprobado y no tenían maestro quedaron a nombre del maestro.
    assert.equal((await db.partida.findUniqueOrThrow({ where: { id: idsDePartidas[102] } })).maestroId, maestroId);
  });

  test("facturas: una no se asigna por más de su total, aunque se reparta entre obras", async () => {
    const asignar = (servicio: string, monto: string, quien: "equipo" | "llaveA" | "clienteA" = "equipo") =>
      e.pedir(quien, "POST", `/v1/servicios/${servicio}/obra/facturas`, { maestroId, odooMoveId: ID_FACTURA, monto: { valor: monto, moneda: "CLP" } });

    const primera = await asignar(servicioId, "4000000");
    assert.equal(primera.estado, 201, JSON.stringify(primera.cuerpo));
    assert.equal((await asignar(servicioId, "100")).estado, 409); // ya está asignada a esta obra
    const pasada = await asignar(otroServicioId, "3000000"); // solo quedan 2.000.000
    assert.equal(pasada.estado, 409);
    assert.match(pasada.cuerpo.error.mensaje, /Solo quedan 2\.000\.000 pesos/);
    assert.equal((await asignar(otroServicioId, "2000000")).estado, 201); // justo el resto
    assert.equal((await asignar(otroServicioId, "1")).estado, 409);

    const odoo = await e.pedir("equipo", "GET", `/v1/maestros/${maestroId}/facturas-odoo`);
    assert.deepEqual(odoo.cuerpo.items[0].asignado, { valor: "6000000", moneda: "CLP" });
    assert.deepEqual(odoo.cuerpo.items[0].asignable, { valor: "0", moneda: "CLP" });

    // Una llave o un dueño no asignan.
    assert.equal((await asignar(servicioId, "1", "llaveA")).estado, 403);
    assert.equal((await asignar(servicioId, "1", "clienteA")).estado, 403);
    // Montos que no sirven.
    assert.equal(
      (await e.pedir("equipo", "POST", `/v1/servicios/${servicioId}/obra/facturas`, { maestroId, odooMoveId: ID_FACTURA, monto: { valor: "0", moneda: "CLP" } })).estado,
      400,
    );
    assert.equal(
      (await e.pedir("equipo", "POST", `/v1/servicios/${servicioId}/obra/facturas`, { maestroId, odooMoveId: ID_FACTURA, monto: { valor: "10", moneda: "UF" } })).estado,
      400,
    );
  });

  test("una factura fuera de Odoo se anota a mano y cuenta igual", async () => {
    const r = await e.pedir("equipo", "POST", `/v1/servicios/${servicioId}/obra/facturas/manual`, {
      maestroId,
      numero: "A-12",
      fecha: "2026-11-02",
      monto: { valor: "1500000", moneda: "CLP" },
      pagada: true,
    });
    assert.equal(r.estado, 201, JSON.stringify(r.cuerpo));
    assert.equal((await e.pedir("llaveA", "POST", `/v1/servicios/${servicioId}/obra/facturas/manual`, { maestroId, fecha: "2026-11-02", monto: { valor: "1", moneda: "CLP" } })).estado, 403);
  });

  test("el panel del equipo trae las cuentas, el plan contra real y el margen", async () => {
    const r = await e.pedir("equipo", "GET", `/v1/servicios/${servicioId}/obra`);
    assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
    const o = r.cuerpo;
    assert.equal(o.vista, "equipo");
    assert.equal(o.orden.numero, ORDEN.numero);
    assert.equal(o.partidas.length, 5); // incluye la quitada en Odoo, marcada
    assert.equal(o.partidas.filter((p: { quitadaEnOdoo: boolean }) => p.quitadaEnOdoo).length, 1);
    // aprobado 10.000.000 + adicional 1.500.000; facturado 4.000.000 (Odoo) + 1.500.000 (manual);
    // pagado: la mitad de lo de Odoo (2.000.000) + la manual pagada (1.500.000).
    assert.deepEqual(o.cuentas, {
      aprobado: { valor: "10000000", moneda: "CLP" },
      adicionales: { valor: "1500000", moneda: "CLP" },
      facturado: { valor: "5500000", moneda: "CLP" },
      pagado: { valor: "3500000", moneda: "CLP" },
      saldo: { valor: "8000000", moneda: "CLP" },
    });
    assert.equal(o.planContraReal.costo.planificado.valor, "11500000");
    assert.equal(o.planContraReal.plazo.planificado, 30);
    assert.ok(o.planContraReal.plazo.real > 0); // desde el 1 de octubre hasta hoy
    assert.equal(o.margen.planificado.valor, "8500000"); // 20.000.000 − 11.500.000
    assert.equal(o.margen.real.valor, "14500000"); // 20.000.000 − 5.500.000
    assert.equal(o.facturas.length, 2);
    assert.equal(o.facturas.find((f: { origen: string }) => f.origen === "odoo").totalOdoo.valor, "6000000");
    assert.equal(o.presupuestos.length, 3);
    assert.equal(o.odooError, null);
    assert.equal(o.sePuedeCerrar, false);
    assert.ok(clavesInternas(o).length > 0); // el equipo sí ve lo interno
  });

  test("recepción: una observada pide observación, abre una tarea y guarda fotos; conforme cierra la tarea", async () => {
    const ruta = `/v1/partidas/${idsDePartidas[102]}/recepcion`;
    assert.equal((await e.pedir("equipo", "POST", ruta, formulario({ resultado: "OBSERVADA" }))).estado, 400);
    const sinFoto = await e.pedir("equipo", "POST", ruta, formulario({ resultado: "OBSERVADA", observacion: "OBS-SECRETA quedó chueco", fotos: archivo("x", "f.pdf", "application/pdf") }));
    assert.equal(sinFoto.estado, 400); // un PDF no es una foto
    assert.equal((await e.pedir("equipo", "POST", ruta, formulario({ resultado: "OBSERVADA", observacion: "x", responsableId: "inventado" }))).estado, 400);

    const antes = subidas.length;
    const obs = await e.pedir(
      "equipo",
      "POST",
      ruta,
      formulario({
        resultado: "OBSERVADA",
        observacion: "OBS-SECRETA quedó chueco",
        responsableId: e.ids.equipo,
        fotos: [archivo(new Uint8Array([1, 2, 3]), "a.jpg", "image/jpeg"), archivo(new Uint8Array([4, 5]), "b.png", "image/png")],
      }),
    );
    assert.equal(obs.estado, 200, JSON.stringify(obs.cuerpo));
    assert.equal(obs.cuerpo.recepcion, "OBSERVADA");
    assert.equal(obs.cuerpo.fotos, 2);
    assert.equal(subidas.length, antes + 2);
    const tarea = await db.tarea.findUniqueOrThrow({ where: { id: obs.cuerpo.tareaId } });
    assert.equal(tarea.partidaId, idsDePartidas[102]);
    assert.equal(tarea.responsableId, e.ids.equipo);
    assert.match(tarea.que, /^Corregir: Pintura de muros: OBS-SECRETA/);
    assert.equal(await db.foto.count({ where: { partidaId: idsDePartidas[102] } }), 2);
    // El equipo recibe el id de cada foto, para pedirla a GET /v1/fotos/{id}.
    const vistaEquipo = await e.pedir("equipo", "GET", `/v1/servicios/${servicioId}/obra`);
    const fotosDeLaPartida = vistaEquipo.cuerpo.partidas.find((p: { id: string }) => p.id === idsDePartidas[102]).fotos;
    const idsEnBase = (await db.foto.findMany({ where: { partidaId: idsDePartidas[102] }, select: { id: true } })).map((f) => f.id).sort();
    assert.deepEqual(fotosDeLaPartida.map((f: { id: string }) => f.id).sort(), idsEnBase);

    // Observarla otra vez no duplica la tarea.
    const otra = await e.pedir("equipo", "POST", ruta, formulario({ resultado: "OBSERVADA", observacion: "Sigue mal" }));
    assert.equal(otra.cuerpo.tareaId, obs.cuerpo.tareaId);
    assert.equal(await db.tarea.count({ where: { partidaId: idsDePartidas[102], hechaEl: null } }), 1);

    // Una llave y un dueño no reciben partidas.
    assert.equal((await e.pedir("llaveA", "POST", ruta, formulario({ resultado: "CONFORME" }))).estado, 403);
    assert.equal((await e.pedir("clienteA", "POST", ruta, formulario({ resultado: "CONFORME" }))).estado, 403);
    assert.equal((await e.pedir("clienteB", "POST", ruta, formulario({ resultado: "CONFORME" }))).estado, 403);
  });

  test("lo que ve un dueño o una llave: la orden, el avance y la recepción; nada del maestro", async () => {
    const secretos = [PROVEEDOR.nombre, "Maestro Secreto", "OBS-SECRETA", "Nota interna del presupuesto", "Muy caro", `drive_${unico}_`, "pdf", "Quedó chueco"];
    for (const quien of ["clienteA", "llaveA"] as const) {
      const r = await e.pedir(quien, "GET", `/v1/servicios/${servicioId}/obra`);
      assert.equal(r.estado, 200, `${quien}: ${JSON.stringify(r.cuerpo)}`);
      assert.equal(r.cuerpo.vista, "dueno");
      assert.deepEqual(clavesInternas(r.cuerpo), [], quien);
      const texto = JSON.stringify(r.cuerpo);
      for (const secreto of secretos.slice(0, 5)) assert.equal(texto.includes(secreto), false, `${quien}: sale «${secreto}»`);
      for (const clave of ["maestro", "precioDueno", "observacion", "presupuestos", "facturas", "margen", "cuentas", "odooError", "pdfDriveFileId", "fotos", "odooLineId"]) {
        assert.equal(texto.includes(`"${clave}"`), false, `${quien}: sale la clave «${clave}»`);
      }
      assert.deepEqual(r.cuerpo.orden, {
        numero: ORDEN.numero,
        total: { valor: "20000000", moneda: "CLP" },
        anticipado: { valor: "500000", moneda: "CLP" },
      });
      // La partida quitada en Odoo no existe para el dueño: 4 vigentes (101, 102, 104, 105).
      assert.equal(r.cuerpo.recepcion.total, 4);
      const descripciones = r.cuerpo.recintos.flatMap((x: { partidas: { descripcion: string }[] }) => x.partidas.map((p) => p.descripcion));
      assert.equal(descripciones.includes("Cambio de tina"), false);
      assert.deepEqual(r.cuerpo.recintos.map((x: { nombre: string }) => x.nombre), ["Cocina", "Baño"]);
      assert.equal(r.cuerpo.recepcion.observadas, 1);
    }
    // El cliente B no abre la obra del A; el equipo y A sí.
    assert.equal((await e.pedir("clienteB", "GET", `/v1/servicios/${servicioId}/obra`)).estado, 404);
    assert.equal((await e.pedir("anonimo", "GET", `/v1/servicios/${servicioId}/obra`)).estado, 401);
    assert.equal((await e.pedir("clienteA", "GET", "/v1/servicios/no-existe/obra")).estado, 404);
  });

  test("un dueño no ve la obra de un servicio cancelado, por confirmar ni por revisar", async () => {
    for (const estado of [{ estado: "CANCELADO" as const }, { porConfirmar: true }, { porRevisar: true }]) {
      const s = await db.servicioEnCurso.create({
        data: { organizationId: e.ids.clienteA, propertyId: propiedadId, servicioId: catalogoId, tipo: "OBRA", ...estado },
      });
      assert.equal((await e.pedir("clienteA", "GET", `/v1/servicios/${s.id}/obra`)).estado, 404, JSON.stringify(estado));
      assert.equal((await e.pedir("equipo", "GET", `/v1/servicios/${s.id}/obra`)).estado, 200);
    }
  });

  test("una llave no escribe en ninguna ruta de la obra (403)", async () => {
    const id = servicioId;
    const llamadas: [string, string, unknown?][] = [
      ["POST", `/v1/servicios/${id}/orden`, { numero: "S1" }],
      ["POST", `/v1/servicios/${id}/orden/actualizar`],
      ["PATCH", `/v1/partidas/${idsDePartidas[101]}`, { avance: 100 }],
      ["PATCH", `/v1/servicios/${id}/obra/avance`, { recinto: "Cocina", avance: 100 }],
      ["POST", `/v1/servicios/${id}/presupuestos`, formulario({ maestroId, tipo: "ORIGINAL", total: "1" })],
      ["PATCH", `/v1/servicios/${id}/obra/fechas`, { inicioObra: "2026-10-01" }],
      ["POST", `/v1/servicios/${id}/obra/cierre`, {}],
      ["DELETE", `/v1/servicios/${id}/obra/facturas/cualquiera`],
    ];
    for (const [metodo, ruta, cuerpo] of llamadas) {
      for (const quien of ["llaveA", "clienteA"] as const) {
        const r = await e.pedir(quien, metodo as "POST", ruta, cuerpo);
        assert.equal(r.estado, 403, `${quien} ${metodo} ${ruta}`);
      }
    }
  });

  test("las fechas: no se pueden poner al revés, y null las borra", async () => {
    const ruta = `/v1/servicios/${sinOrdenId}/obra/fechas`;
    const ok = await e.pedir("equipo", "PATCH", ruta, { inicioObra: "2026-10-01", fechaComprometida: "2026-12-01" });
    assert.deepEqual(ok.cuerpo, { inicioObra: "2026-10-01", fechaComprometida: "2026-12-01" });
    assert.equal((await e.pedir("equipo", "PATCH", ruta, { fechaComprometida: "2026-09-01" })).estado, 400);
    const borrada = await e.pedir("equipo", "PATCH", ruta, { fechaComprometida: null });
    assert.deepEqual(borrada.cuerpo, { inicioObra: "2026-10-01", fechaComprometida: null });
    assert.equal((await e.pedir("equipo", "PATCH", ruta, { inicioObra: "ayer" })).estado, 400);
  });

  test("no se cierra una obra sin partidas, ni con partidas pendientes u observadas, ni sin jefatura", async () => {
    const cierre = (id: string, quien: "equipo" | "jefatura" | "admin" = "jefatura") =>
      e.pedir(quien, "POST", `/v1/servicios/${id}/obra/cierre`, { motivo: "Listo" });

    const sinPartidas = await cierre(sinOrdenId);
    assert.equal(sinPartidas.estado, 409);
    assert.match(sinPartidas.cuerpo.error.mensaje, /no tiene partidas/);

    assert.equal((await cierre(servicioId, "equipo")).estado, 403);
    assert.equal((await cierre(servicioId, "admin")).estado, 403);
    const pendientes = await cierre(servicioId);
    assert.equal(pendientes.estado, 409);
    assert.match(pendientes.cuerpo.error.mensaje, /por recibir/);
    assert.match(pendientes.cuerpo.error.mensaje, /observadas/);
    assert.equal((await db.servicioEnCurso.findUniqueOrThrow({ where: { id: servicioId } })).estado, "ABIERTO");
  });

  test("con todas las partidas conformes, la jefatura cierra y la obra queda quieta", async () => {
    for (const odooLineId of [101, 102, 104, 105]) {
      const r = await e.pedir("equipo", "POST", `/v1/partidas/${idsDePartidas[odooLineId]}/recepcion`, formulario({ resultado: "CONFORME" }));
      assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
    }
    // La tarea «Corregir…» de la observada quedó hecha al recibirla conforme.
    assert.equal(await db.tarea.count({ where: { partidaId: idsDePartidas[102], hechaEl: null } }), 0);
    // La partida quitada en Odoo (103) sigue pendiente y no traba el cierre.
    const panel = await e.pedir("equipo", "GET", `/v1/servicios/${servicioId}/obra`);
    assert.equal(panel.cuerpo.sePuedeCerrar, true);

    const cierre = await e.pedir("jefatura", "POST", `/v1/servicios/${servicioId}/obra/cierre`, { motivo: "Todo recibido" });
    assert.equal(cierre.estado, 200, JSON.stringify(cierre.cuerpo));
    assert.deepEqual(cierre.cuerpo.planContraReal.partidas, { conformes: 4, observadas: 0, pendientes: 0, total: 4 });
    assert.equal(cierre.cuerpo.planContraReal.costo.planificado.valor, "11500000");
    const servicio = await db.servicioEnCurso.findUniqueOrThrow({ where: { id: servicioId } });
    assert.equal(servicio.estado, "TERMINADO");
    assert.equal(servicio.motivoCierre, "Todo recibido");

    // Cerrar dos veces, o tocar algo de una obra cerrada, da 409.
    assert.equal((await e.pedir("jefatura", "POST", `/v1/servicios/${servicioId}/obra/cierre`, {})).estado, 409);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/partidas/${idsDePartidas[101]}`, { avance: 0 })).estado, 409);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/servicios/${servicioId}/obra/fechas`, { inicioObra: null })).estado, 409);
  });

  test("quitar una factura devuelve su monto a lo asignable", async () => {
    const panel = await e.pedir("equipo", "GET", `/v1/servicios/${otroServicioId}/obra`);
    const asignacion = panel.cuerpo.facturas[0];
    assert.equal(asignacion.montoAsignado.valor, "2000000");
    assert.equal((await e.pedir("llaveA", "DELETE", `/v1/servicios/${otroServicioId}/obra/facturas/${asignacion.id}`)).estado, 403);
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/servicios/${servicioId}/obra/facturas/${asignacion.id}`)).estado, 404); // de otra obra
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/servicios/${otroServicioId}/obra/facturas/${asignacion.id}`)).estado, 204);
    const odoo = await e.pedir("equipo", "GET", `/v1/maestros/${maestroId}/facturas-odoo`);
    assert.deepEqual(odoo.cuerpo.items[0].asignable, { valor: "2000000", moneda: "CLP" });
  });

  test("las rutas aparecen en la documentación (/openapi.json) con su descripción en español", () => {
    // Se arma la documentación solo con las rutas de esta pieza: así la prueba no depende de que
    // las rutas de las otras piezas (que corren a la vez) estén completas.
    const solo = new OpenAPIHono();
    solo.route("/v1", obra);
    solo.route("/v1", maestros);
    const doc = solo.getOpenAPI31Document({ openapi: "3.1.0", info: { title: "prueba", version: "v1" } }) as unknown as {
      paths: Record<string, Record<string, { description?: string }>>;
    };
    const esperadas: [string, string][] = [
      ["/v1/servicios/{id}/obra", "get"],
      ["/v1/servicios/{id}/orden", "post"],
      ["/v1/servicios/{id}/orden/actualizar", "post"],
      ["/v1/servicios/{id}/obra/avance", "patch"],
      ["/v1/partidas/{id}", "patch"],
      ["/v1/partidas/{id}/recepcion", "post"],
      ["/v1/servicios/{id}/presupuestos", "post"],
      ["/v1/presupuestos/{id}/aprobar", "post"],
      ["/v1/presupuestos/{id}/rechazar", "post"],
      ["/v1/servicios/{id}/obra/facturas", "post"],
      ["/v1/servicios/{id}/obra/facturas/manual", "post"],
      ["/v1/servicios/{id}/obra/facturas/{facturaId}", "delete"],
      ["/v1/servicios/{id}/obra/fechas", "patch"],
      ["/v1/servicios/{id}/obra/cierre", "post"],
      ["/v1/maestros", "get"],
      ["/v1/maestros", "post"],
      ["/v1/maestros/{id}", "patch"],
      ["/v1/maestros/odoo", "get"],
      ["/v1/maestros/{id}/facturas-odoo", "get"],
    ];
    for (const [ruta, metodo] of esperadas) {
      assert.ok(doc.paths[ruta]?.[metodo]?.description, `falta ${metodo.toUpperCase()} ${ruta} o su descripción`);
    }
    // Los formularios con archivos se documentan como multipart.
    const texto = JSON.stringify(doc);
    assert.ok(JSON.stringify(doc.paths["/v1/partidas/{id}/recepcion"].post).includes("multipart/form-data"));
    assert.ok(texto.includes('"format":"binary"'), "los archivos no salen como binarios en la documentación");
  });
});
