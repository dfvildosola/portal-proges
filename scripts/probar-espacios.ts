// La prueba de los espacios: un cliente nunca ve ni abre nada de otro cliente.
//
// Arma en `proges_dev` dos clientes de mentira («Prueba espacios A» y «B»), cada uno con su
// cartera, un servicio de venta con visita y oferta, y una solicitud; y comprueba con el código
// REAL de `src/lib/vista-cliente.ts` (la ventanilla que le entrega datos a un cliente) que:
//  - el usuario de A ve lo suyo y nada de B, ni pasándole un id de B;
//  - nada de lo que sale lleva el nombre del interesado, el oferente, el Drive ni el ROL.
//
// Se corre con: npx tsx scripts/probar-espacios.ts
// Se puede correr las veces que se quiera: todo tiene id fijo y se actualiza, no se duplica.
// Solo escribe en una base `proges_dev*` (se niega si la dirección apunta a otra, p. ej. Neon).
// Todos los correos son @proges.test.
//
// `getOrgId()` y `orgParaEscribir()` leen la sesión de Clerk, que solo existe dentro de Next;
// la decisión que toman está separada en `espacioParaLeer()` y `espacioParaEscribir()`, y esas
// sí se prueban acá. Lo que no se prueba: que `src/lib/operacion.ts` le diga «Sin permiso» a un
// cliente (se revisa en el navegador).

import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import {
  DEFAULT_ORG_ID,
  ORG_PROGES,
  SoloLecturaError,
  espacioParaEscribir,
  espacioParaLeer,
} from "../src/lib/org";
import { hoyChile, sumarDias } from "../src/lib/fechas";
import {
  propiedadesDelCliente,
  servicioParaCliente,
  serviciosDePropiedad,
} from "../src/lib/vista-cliente";
import type { Usuario } from "../src/generated/prisma/client";

// Esta prueba escribe datos: solo en la base de desarrollo.
const nombreBase = new URL(process.env.DATABASE_URL ?? "postgres://x/").pathname.replace("/", "");
if (!nombreBase.startsWith("proges_dev")) {
  throw new Error(
    `Esta prueba solo corre en proges_dev (o en la copia de un espacio), y DATABASE_URL apunta a «${nombreBase}».`,
  );
}

// Lo que un cliente jamás debe ver: las claves, y los valores concretos que sembramos en ellas.
const CLAVES_PROHIBIDAS = ["interesadoNombre", "interesadoContacto", "oferente", "driveCarpetaId", "rolSII"];
const SECRETOS = (l: string) => [
  `Interesado ${l} Secreto`,
  `+56 9 0000 000${l === "A" ? 1 : 2}`,
  `Oferente ${l} Secreto`,
  `drive-carpeta-${l}`,
  `ROL-${l}-SECRETO`,
];

// ---------------------------------------------------------------------------
// Los datos de prueba
// ---------------------------------------------------------------------------

type Espacio = {
  letra: "A" | "B";
  orgId: string;
  propiedadId: string;
  servicioId: string;
  usuarioCliente: Usuario;
};

// El catálogo y las etapas son de Proges (ORG_PROGES) y comunes a todos. Se usan los que ya
// existan; si la base está vacía se crean dos mínimos, con id fijo.
async function catalogoYEtapaDeVenta(): Promise<{ servicioId: string; etapaId: string }> {
  const etapa =
    (await db.etapa.findFirst({
      where: { organizationId: ORG_PROGES, tipo: "VENTA", activa: true },
      orderBy: { orden: "asc" },
    })) ??
    (await db.etapa.upsert({
      where: { id: "prueba_espacios_etapa_venta" },
      update: {},
      create: {
        id: "prueba_espacios_etapa_venta",
        organizationId: ORG_PROGES,
        tipo: "VENTA",
        nombre: "Prueba espacios: en venta",
        orden: 1,
      },
    }));
  const servicio =
    (await db.servicio.findFirst({ where: { organizationId: ORG_PROGES, activo: true } })) ??
    (await db.servicio.upsert({
      where: { id: "prueba_espacios_servicio" },
      update: {},
      create: {
        id: "prueba_espacios_servicio",
        organizationId: ORG_PROGES,
        codigo: "PRUEBA-ESPACIOS",
        familia: "PRUEBA",
        nombre: "Prueba espacios: venta",
      },
    }));
  return { servicioId: servicio.id, etapaId: etapa.id };
}

async function armarEspacio(
  letra: "A" | "B",
  catalogo: { servicioId: string; etapaId: string },
): Promise<Espacio> {
  const l = letra.toLowerCase();
  const orgId = `org_prueba_espacios_${l}`;
  const hoy = hoyChile();

  await db.organizacion.upsert({
    where: { id: orgId },
    update: { nombre: `Prueba espacios ${letra}`, tipo: "CLIENTE", activa: true },
    create: { id: orgId, nombre: `Prueba espacios ${letra}`, tipo: "CLIENTE" },
  });

  // Una sociedad dueña de una propiedad (con ROL y carpeta de Drive: datos que no deben salir).
  const sociedad = await db.owner.upsert({
    where: { id: `prueba_espacios_${l}_sociedad` },
    update: {},
    create: {
      id: `prueba_espacios_${l}_sociedad`,
      organizationId: orgId,
      nombre: `Sociedad Prueba ${letra} SpA`,
      rut: letra === "A" ? "76.000.001-1" : "76.000.002-2",
      tipo: "SOCIEDAD",
    },
  });
  const propiedadId = `prueba_espacios_${l}_propiedad`;
  const datosPropiedad = {
    organizationId: orgId,
    tipo: "CASA" as const,
    direccion: `Calle Prueba ${letra} 100`,
    comuna: `Comuna ${letra}`,
    region: "Metropolitana",
    rolSII: SECRETOS(letra)[4],
    driveCarpetaId: SECRETOS(letra)[3],
  };
  await db.property.upsert({
    where: { id: propiedadId },
    update: datosPropiedad,
    create: { id: propiedadId, ...datosPropiedad },
  });
  await db.propertyOwner.upsert({
    where: { propertyId_ownerId: { propertyId: propiedadId, ownerId: sociedad.id } },
    update: {},
    create: { organizationId: orgId, propertyId: propiedadId, ownerId: sociedad.id, porcentaje: 100 },
  });

  // Los usuarios: uno del cliente y (más abajo, una sola vez) uno del equipo.
  const usuarioCliente = await db.usuario.upsert({
    where: { email: `cliente-${l}@proges.test` },
    update: { organizationId: orgId, rol: "CLIENTE", admin: false, activo: true },
    create: {
      organizationId: orgId,
      email: `cliente-${l}@proges.test`,
      nombre: `Cliente ${letra} (prueba)`,
      rol: "CLIENTE",
    },
  });

  // Un servicio de venta ABIERTO (visible), con una visita y una oferta que llevan datos
  // privados del interesado y del oferente.
  const servicioId = `prueba_espacios_${l}_venta`;
  const datosServicio = {
    organizationId: orgId,
    propertyId: propiedadId,
    servicioId: catalogo.servicioId,
    tipo: "VENTA" as const,
    etapaId: catalogo.etapaId,
    estado: "ABIERTO" as const,
    porConfirmar: false,
    precio: 150_000_000,
    precioMoneda: "CLP" as const,
    avisoUrl: `https://aviso.test/${l}`,
  };
  await db.servicioEnCurso.upsert({
    where: { id: servicioId },
    update: datosServicio,
    create: { id: servicioId, ...datosServicio },
  });
  const datosVisita = {
    organizationId: orgId,
    servicioEnCursoId: servicioId,
    fecha: sumarDias(hoy, -2),
    interesadoNombre: SECRETOS(letra)[0],
    interesadoContacto: SECRETOS(letra)[1],
    evaluacion: 4,
    comentario: "Le gustó la cocina",
  };
  await db.visita.upsert({
    where: { id: `prueba_espacios_${l}_visita` },
    update: datosVisita,
    create: { id: `prueba_espacios_${l}_visita`, ...datosVisita },
  });
  const datosOferta = {
    organizationId: orgId,
    servicioEnCursoId: servicioId,
    fecha: sumarDias(hoy, -1),
    monto: 140_000_000,
    moneda: "CLP" as const,
    oferente: SECRETOS(letra)[2],
    nota: "Oferta con financiamiento",
  };
  await db.oferta.upsert({
    where: { id: `prueba_espacios_${l}_oferta` },
    update: datosOferta,
    create: { id: `prueba_espacios_${l}_oferta`, ...datosOferta },
  });

  // Solo en A: un segundo servicio «por confirmar» (una suposición de la carga inicial) que el
  // cliente NO debe ver.
  if (letra === "A") {
    const datosPorConfirmar = { ...datosServicio, porConfirmar: true, precio: null, precioMoneda: null };
    await db.servicioEnCurso.upsert({
      where: { id: "prueba_espacios_a_por_confirmar" },
      update: datosPorConfirmar,
      create: { id: "prueba_espacios_a_por_confirmar", ...datosPorConfirmar },
    });
  }

  // Una solicitud NUEVA sobre su propiedad, pedida por su usuario.
  const datosSolicitud = {
    organizationId: orgId,
    propertyId: propiedadId,
    tipo: "EVALUACION" as const,
    descripcion: `Quiero evaluar la propiedad de ${letra}`,
    pedidaPorId: usuarioCliente.id,
    estado: "NUEVA" as const,
  };
  await db.solicitud.upsert({
    where: { id: `prueba_espacios_${l}_solicitud` },
    update: datosSolicitud,
    create: { id: `prueba_espacios_${l}_solicitud`, ...datosSolicitud },
  });

  return { letra, orgId, propiedadId, servicioId, usuarioCliente };
}

// ---------------------------------------------------------------------------
// Ayudas de la prueba
// ---------------------------------------------------------------------------

// Recorre el objeto entero (listas y objetos dentro de objetos) y junta todas las claves.
function todasLasClaves(valor: unknown, claves = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) {
    for (const v of valor) todasLasClaves(v, claves);
  } else if (valor && typeof valor === "object" && !(valor instanceof Date)) {
    for (const [clave, v] of Object.entries(valor)) {
      claves.add(clave);
      todasLasClaves(v, claves);
    }
  }
  return claves;
}

// Que lo que se le entrega a un cliente no lleve ni las claves prohibidas ni los valores
// sembrados en ellas (de ninguno de los dos clientes).
function assertSinDatosPrivados(entrega: unknown, quien: string) {
  const claves = todasLasClaves(entrega);
  for (const prohibida of CLAVES_PROHIBIDAS) {
    assert.equal(claves.has(prohibida), false, `${quien}: sale la clave «${prohibida}»`);
  }
  const texto = JSON.stringify(entrega);
  for (const secreto of [...SECRETOS("A"), ...SECRETOS("B")]) {
    assert.equal(texto.includes(secreto), false, `${quien}: sale el dato «${secreto}»`);
  }
}

let casos = 0;
async function caso(nombre: string, prueba: () => Promise<void> | void) {
  await prueba();
  casos++;
  console.log(`ok  ${nombre}`);
}

// ---------------------------------------------------------------------------
// La prueba
// ---------------------------------------------------------------------------

async function main() {
  const catalogo = await catalogoYEtapaDeVenta();
  const a = await armarEspacio("A", catalogo);
  const b = await armarEspacio("B", catalogo);
  const equipo = await db.usuario.upsert({
    where: { email: "equipo@proges.test" },
    update: { organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
    create: {
      organizationId: ORG_PROGES,
      email: "equipo@proges.test",
      nombre: "Equipo (prueba)",
      rol: "EQUIPO",
    },
  });

  await caso("el espacio de Proges es org_proges y no es el de un cliente", () => {
    assert.equal(ORG_PROGES, "org_proges");
    assert.equal(DEFAULT_ORG_ID, ORG_PROGES);
    assert.notEqual(a.orgId, ORG_PROGES);
    assert.notEqual(a.orgId, b.orgId);
  });

  await caso("el panel de A trae solo la propiedad de A, con su servicio abierto", async () => {
    const panel = await propiedadesDelCliente(a.usuarioCliente);
    assert.deepEqual(panel.map((p) => p.id), [a.propiedadId]);
    assert.deepEqual(panel[0].servicios.map((s) => s.id), [a.servicioId]);
  });

  await caso("el panel de B trae solo la propiedad de B", async () => {
    const panel = await propiedadesDelCliente(b.usuarioCliente);
    assert.deepEqual(panel.map((p) => p.id), [b.propiedadId]);
    assert.deepEqual(panel[0].servicios.map((s) => s.id), [b.servicioId]);
  });

  await caso("A abre su servicio y ve sus visitas y ofertas", async () => {
    const servicio = await servicioParaCliente(a.usuarioCliente, a.servicioId);
    assert.ok(servicio, "A no ve su propio servicio");
    assert.equal(servicio.propiedad.id, a.propiedadId);
    assert.equal(servicio.comercial?.visitas.length, 1);
    assert.equal(servicio.comercial?.ofertas.length, 1);
  });

  await caso("A pide el servicio de B por su id: null (como si no existiera)", async () => {
    assert.equal(await servicioParaCliente(a.usuarioCliente, b.servicioId), null);
  });

  await caso("B pide el servicio de A por su id: null", async () => {
    assert.equal(await servicioParaCliente(b.usuarioCliente, a.servicioId), null);
  });

  await caso("A pide los servicios de la propiedad de B: lista vacía", async () => {
    assert.deepEqual(await serviciosDePropiedad(a.usuarioCliente, b.propiedadId), []);
  });

  await caso("A ve en su propiedad el servicio abierto y no el «por confirmar»", async () => {
    const lista = await serviciosDePropiedad(a.usuarioCliente, a.propiedadId);
    assert.deepEqual(lista.map((s) => s.id), [a.servicioId]);
    assert.equal(await servicioParaCliente(a.usuarioCliente, "prueba_espacios_a_por_confirmar"), null);
  });

  await caso("nada de lo que se le entrega a A lleva datos privados", async () => {
    assertSinDatosPrivados(await propiedadesDelCliente(a.usuarioCliente), "panel de A");
    assertSinDatosPrivados(await serviciosDePropiedad(a.usuarioCliente, a.propiedadId), "lista de A");
    assertSinDatosPrivados(await servicioParaCliente(a.usuarioCliente, a.servicioId), "detalle de A");
  });

  await caso("nada de lo que se le entrega a B lleva datos privados", async () => {
    assertSinDatosPrivados(await propiedadesDelCliente(b.usuarioCliente), "panel de B");
    assertSinDatosPrivados(await serviciosDePropiedad(b.usuarioCliente, b.propiedadId), "lista de B");
    assertSinDatosPrivados(await servicioParaCliente(b.usuarioCliente, b.servicioId), "detalle de B");
  });

  await caso("la prueba de datos privados no es ciega: detecta una clave prohibida", () => {
    assert.throws(() => assertSinDatosPrivados({ visitas: [{ interesadoNombre: "x" }] }, "falso"));
    assert.throws(() => assertSinDatosPrivados({ nota: `ver ${SECRETOS("A")[2]}` }, "falso"));
  });

  await caso("un usuario del equipo no pasa por la ventanilla del cliente: «Sin permiso»", async () => {
    await assert.rejects(propiedadesDelCliente(equipo), /Sin permiso/);
    await assert.rejects(serviciosDePropiedad(equipo, a.propiedadId), /Sin permiso/);
    await assert.rejects(servicioParaCliente(equipo, a.servicioId), /Sin permiso/);
  });

  await caso("un cliente que manda la cookie del cliente B sigue leyendo su espacio A", () => {
    assert.equal(espacioParaLeer(a.usuarioCliente, b.usuarioCliente.organizationId), a.usuarioCliente.organizationId);
  });

  await caso("el equipo lee el cliente activo que eligió", () => {
    assert.equal(espacioParaLeer(equipo, b.usuarioCliente.organizationId), b.usuarioCliente.organizationId);
  });

  await caso("el equipo sin clientes creados recibe un aviso claro", () => {
    assert.throws(() => espacioParaLeer(equipo, null), /Todavía no hay clientes creados/);
  });

  await caso("el equipo no puede escribir la cartera de un cliente", () => {
    assert.throws(() => espacioParaEscribir(equipo), SoloLecturaError);
  });

  await caso("el cliente escribe solo en su propio espacio", () => {
    assert.equal(espacioParaEscribir(a.usuarioCliente), a.usuarioCliente.organizationId);
  });

  await caso("un cliente desactivado no ve nada", async () => {
    const desactivado: Usuario = { ...a.usuarioCliente, activo: false };
    assert.deepEqual(await propiedadesDelCliente(desactivado), []);
    assert.deepEqual(await serviciosDePropiedad(desactivado, a.propiedadId), []);
    assert.equal(await servicioParaCliente(desactivado, a.servicioId), null);
  });

  console.log(`${casos} casos, todos pasan`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
