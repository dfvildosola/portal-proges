// Prueba el alcance del panel del cliente con tres clientes de mentira.
// Se corre con: npx tsx scripts/probar-alcance.ts
//
// Crea en proges_dev (y solo ahí) dos grupos de prueba, cada uno con dos
// sociedades y una propiedad por sociedad, cada una con un servicio de venta
// abierto, una visita y una oferta. Después comprueba, usando las mismas
// funciones que usa el panel (src/lib/cliente.ts), que cada cliente ve lo suyo
// y nada más, y que ningún dato interno sale por esa puerta.
//
// Se puede correr las veces que haga falta: todo se busca antes de crearse, así
// que la segunda vez no duplica nada. Los correos terminan en @proges.test.

import "dotenv/config";
import assert from "node:assert/strict";
import type { Usuario } from "../src/generated/prisma/client";
import { db } from "../src/lib/db";
import { DEFAULT_ORG_ID } from "../src/lib/org";
import { propiedadDelCliente, propiedadesDelCliente } from "../src/lib/cliente";

const ORG = DEFAULT_ORG_ID;

// Estas pruebas escriben en la base: nunca contra otra que no sea la de desarrollo.
if (!process.env.DATABASE_URL?.includes("proges_dev")) {
  throw new Error("Este script solo corre contra proges_dev: DATABASE_URL apunta a otra base.");
}

// Datos «secretos» que jamás deben salir por src/lib/cliente.ts. Se siembran con
// valores reconocibles para poder buscarlos en lo que la puerta devuelve.
const SECRETO = "secreto-no-sale";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

async function grupo(nombre: string) {
  return (
    (await db.grupo.findFirst({ where: { organizationId: ORG, nombre } })) ??
    (await db.grupo.create({ data: { organizationId: ORG, nombre } }))
  );
}

async function sociedad(nombre: string, rut: string, grupoId: string) {
  const existente = await db.owner.findFirst({ where: { organizationId: ORG, rut } });
  if (existente) return existente;
  return db.owner.create({
    data: { organizationId: ORG, nombre, rut, tipo: "SOCIEDAD", grupoId },
  });
}

async function usuario(
  email: string,
  datos: {
    nombre: string;
    rol: "EQUIPO" | "CLIENTE";
    grupoId?: string;
    alcance?: "GRUPO" | "SOCIEDADES";
  },
) {
  const campos = {
    organizationId: ORG,
    nombre: datos.nombre,
    rol: datos.rol,
    grupoId: datos.grupoId ?? null,
    alcance: datos.alcance ?? "GRUPO",
    activo: true,
  };
  return db.usuario.upsert({ where: { email }, create: { email, ...campos }, update: campos });
}

// Una propiedad de la sociedad, con un servicio de venta abierto, un cambio de
// etapa, un cambio de precio, una visita y una oferta (todos con datos secretos).
async function propiedadConVenta(
  direccion: string,
  owner: { id: string },
  etapa: { id: string; nombre: string },
  servicioId: string,
  equipoId: string,
) {
  const existente = await db.property.findFirst({ where: { organizationId: ORG, direccion } });
  if (existente) return existente;

  const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000);
  const soloFecha = (dias: number) => {
    const d = hace(dias);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };

  const propiedad = await db.property.create({
    data: {
      organizationId: ORG,
      tipo: "DEPARTAMENTO",
      direccion,
      comuna: "Providencia",
      region: "Metropolitana",
      rolSII: `${SECRETO}-rol`,
      driveCarpetaId: `${SECRETO}-drive`,
      owners: { create: { organizationId: ORG, ownerId: owner.id, porcentaje: 100 } },
    },
  });
  await db.servicioEnCurso.create({
    data: {
      organizationId: ORG,
      propertyId: propiedad.id,
      servicioId,
      tipo: "VENTA",
      etapaId: etapa.id,
      responsableId: equipoId,
      motivoCierre: `${SECRETO}-motivo`,
      nota: `${SECRETO}-nota`,
      avisoUrl: `https://${SECRETO}.example.com`,
      precio: 4000,
      precioMoneda: "UF",
      recomendacion: "Conviene esperar una oferta mejor.",
      recomendacionFecha: hace(2),
      eventos: {
        create: [
          {
            organizationId: ORG,
            tipo: "ETAPA",
            etapaId: etapa.id,
            nuevo: etapa.nombre,
            autorId: equipoId,
            motivo: `${SECRETO}-motivo`,
            fecha: hace(20),
          },
          {
            organizationId: ORG,
            tipo: "PRECIO",
            anterior: "4200",
            nuevo: "4000",
            moneda: "UF",
            origen: "PROPIETARIO",
            autorId: equipoId,
            motivo: `${SECRETO}-motivo`,
            fecha: hace(5),
          },
        ],
      },
      visitas: {
        create: {
          organizationId: ORG,
          fecha: soloFecha(3),
          realizadaPorId: equipoId,
          interesadoNombre: `${SECRETO}-interesado`,
          interesadoContacto: `${SECRETO}-contacto`,
          evaluacion: 4,
          comentario: "Le gustó la cocina.",
        },
      },
      ofertas: {
        create: {
          organizationId: ORG,
          fecha: soloFecha(1),
          monto: 3900,
          moneda: "UF",
          oferente: `${SECRETO}-oferente`,
          nota: `${SECRETO}-nota`,
        },
      },
    },
  });
  return propiedad;
}

async function sembrar() {
  const servicio =
    (await db.servicio.findFirst({ where: { organizationId: ORG, codigo: "NV-100" } })) ??
    (await db.servicio.create({
      data: { organizationId: ORG, codigo: "NV-100", familia: "NV", nombre: "Venta de propiedad" },
    }));
  const etapa = await db.etapa.findFirst({
    where: { organizationId: ORG, tipo: "VENTA", activa: true, propiedadPublicada: true },
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true },
  });
  if (!etapa) throw new Error("Falta una etapa «publicada» de VENTA: corre antes la migración.");

  const equipo = await usuario("equipo-prueba@proges.test", {
    nombre: `Equipo ${SECRETO}`,
    rol: "EQUIPO",
  });

  const g1 = await grupo("Prueba alcance: grupo 1");
  const g2 = await grupo("Prueba alcance: grupo 2");
  const s1a = await sociedad("Prueba 1A SpA", "TEST-1A", g1.id);
  const s1b = await sociedad("Prueba 1B SpA", "TEST-1B", g1.id);
  const s2a = await sociedad("Prueba 2A SpA", "TEST-2A", g2.id);
  const s2b = await sociedad("Prueba 2B SpA", "TEST-2B", g2.id);

  const p1a = await propiedadConVenta("Prueba alcance 1A 100", s1a, etapa, servicio.id, equipo.id);
  const p1b = await propiedadConVenta("Prueba alcance 1B 200", s1b, etapa, servicio.id, equipo.id);
  const p2a = await propiedadConVenta("Prueba alcance 2A 300", s2a, etapa, servicio.id, equipo.id);
  const p2b = await propiedadConVenta("Prueba alcance 2B 400", s2b, etapa, servicio.id, equipo.id);

  const todoGrupo1 = await usuario("cliente-grupo1@proges.test", {
    nombre: "Cliente grupo 1",
    rol: "CLIENTE",
    grupoId: g1.id,
    alcance: "GRUPO",
  });
  const limitado = await usuario("cliente-sociedad1a@proges.test", {
    nombre: "Cliente solo sociedad 1A",
    rol: "CLIENTE",
    grupoId: g1.id,
    alcance: "SOCIEDADES",
  });
  await db.usuarioSociedad.upsert({
    where: { usuarioId_ownerId: { usuarioId: limitado.id, ownerId: s1a.id } },
    create: { organizationId: ORG, usuarioId: limitado.id, ownerId: s1a.id },
    update: {},
  });
  const delGrupo2 = await usuario("cliente-grupo2@proges.test", {
    nombre: "Cliente grupo 2",
    rol: "CLIENTE",
    grupoId: g2.id,
    alcance: "GRUPO",
  });

  return { equipo, todoGrupo1, limitado, delGrupo2, p1a, p1b, p2a, p2b };
}

// ---------------------------------------------------------------------------
// Comprobaciones
// ---------------------------------------------------------------------------

let casos = 0;
async function caso(nombre: string, prueba: () => Promise<void>) {
  await prueba();
  casos++;
  console.log(`ok  ${nombre}`);
}

// Recorre un objeto entero (claves y valores, a cualquier profundidad) y devuelve
// las claves prohibidas y los valores secretos que encuentre.
const CLAVES_PROHIBIDAS = new Set([
  "driveCarpetaId",
  "rolSII",
  "interesadoNombre",
  "interesadoContacto",
  "oferente",
  // Más allá de lo pedido: lo que tampoco debe salir.
  "autorId",
  "motivo",
  "nota",
  "responsableId",
  "avisoUrl",
  "motivoCierre",
]);

function filtraciones(valor: unknown, ruta = "$"): string[] {
  if (valor instanceof Date || valor === null || valor === undefined) return [];
  if (typeof valor === "string") {
    return valor.toLowerCase().includes(SECRETO) ? [`${ruta} = «${valor}»`] : [];
  }
  if (Array.isArray(valor)) return valor.flatMap((v, i) => filtraciones(v, `${ruta}[${i}]`));
  if (typeof valor === "object") {
    return Object.entries(valor).flatMap(([clave, v]) => [
      ...(CLAVES_PROHIBIDAS.has(clave) ? [`${ruta}.${clave} (clave prohibida)`] : []),
      ...filtraciones(v, `${ruta}.${clave}`),
    ]);
  }
  return [];
}

async function main() {
  const d = await sembrar();
  const ids = (lista: { id: string }[]) => lista.map((p) => p.id).sort();

  await caso("el cliente de todo el grupo 1 ve sus 2 propiedades y no las del grupo 2", async () => {
    const vistas = await propiedadesDelCliente(d.todoGrupo1);
    assert.deepEqual(ids(vistas), ids([d.p1a, d.p1b]));
  });

  await caso("el limitado a la sociedad 1A ve solo la de esa sociedad", async () => {
    const vistas = await propiedadesDelCliente(d.limitado);
    assert.deepEqual(ids(vistas), ids([d.p1a]));
  });

  await caso("el cliente del grupo 2 ve sus 2 propiedades", async () => {
    const vistas = await propiedadesDelCliente(d.delGrupo2);
    assert.deepEqual(ids(vistas), ids([d.p2a, d.p2b]));
  });

  await caso("el detalle de una propiedad propia se entrega, con su servicio de venta", async () => {
    const detalle = await propiedadDelCliente(d.todoGrupo1, d.p1a.id);
    assert.ok(detalle);
    assert.equal(detalle.servicios.length, 1);
    const comercial = detalle.servicios[0].comercial;
    assert.ok(comercial);
    assert.equal(comercial.visitas.length, 1);
    assert.equal(comercial.ofertas.length, 1);
    assert.equal(comercial.cambiosDePrecio.length, 1);
    assert.equal(comercial.cambiosDeEtapa.length, 1);
    assert.equal(comercial.indicadores.diasDesdeUltimaRebaja, 5);
    assert.equal(comercial.recomendacion?.texto, "Conviene esperar una oferta mejor.");
  });

  await caso("el limitado ve el detalle de la sociedad 1A", async () => {
    assert.ok(await propiedadDelCliente(d.limitado, d.p1a.id));
  });

  await caso("grupo 1 abre una propiedad del grupo 2: null", async () => {
    assert.equal(await propiedadDelCliente(d.todoGrupo1, d.p2a.id), null);
  });

  await caso("grupo 2 abre una propiedad del grupo 1: null", async () => {
    assert.equal(await propiedadDelCliente(d.delGrupo2, d.p1a.id), null);
  });

  await caso("el limitado a 1A abre la de 1B (mismo grupo, otra sociedad): null", async () => {
    assert.equal(await propiedadDelCliente(d.limitado, d.p1b.id), null);
  });

  await caso("el limitado a 1A abre una del grupo 2: null", async () => {
    assert.equal(await propiedadDelCliente(d.limitado, d.p2a.id), null);
  });

  await caso("un id que no existe: null", async () => {
    assert.equal(await propiedadDelCliente(d.todoGrupo1, "no-existe"), null);
  });

  await caso("un cliente desactivado no ve nada", async () => {
    const inactivo: Usuario = { ...d.todoGrupo1, activo: false };
    assert.deepEqual(await propiedadesDelCliente(inactivo), []);
    assert.equal(await propiedadDelCliente(inactivo, d.p1a.id), null);
  });

  await caso("un cliente sin grupo no ve nada", async () => {
    const sinGrupo: Usuario = { ...d.todoGrupo1, grupoId: null };
    assert.deepEqual(await propiedadesDelCliente(sinGrupo), []);
    assert.equal(await propiedadDelCliente(sinGrupo, d.p1a.id), null);
  });

  await caso("un cliente limitado a sociedades, sin ninguna asignada, no ve nada", async () => {
    const sinSociedades: Usuario = { ...d.limitado, id: "usuario-sin-sociedades" };
    assert.deepEqual(await propiedadesDelCliente(sinSociedades), []);
    assert.equal(await propiedadDelCliente(sinSociedades, d.p1a.id), null);
  });

  await caso("un cliente de otra organización no ve nada", async () => {
    const otraOrg: Usuario = { ...d.todoGrupo1, organizationId: "org_otra" };
    assert.deepEqual(await propiedadesDelCliente(otraOrg), []);
  });

  await caso("un usuario del EQUIPO lanza «Sin permiso» en las dos funciones", async () => {
    await assert.rejects(propiedadesDelCliente(d.equipo), /Sin permiso/);
    await assert.rejects(propiedadDelCliente(d.equipo, d.p1a.id), /Sin permiso/);
  });

  await caso("el detector de datos internos sí detecta una clave y un valor prohibidos", async () => {
    const sucio = { a: [{ oferente: "x" }], b: { c: `Hola ${SECRETO}` } };
    assert.equal(filtraciones(sucio).length, 2);
  });

  await caso("nada de lo que entregan las funciones trae datos internos", async () => {
    for (const cliente of [d.todoGrupo1, d.limitado, d.delGrupo2]) {
      const panel = await propiedadesDelCliente(cliente);
      assert.deepEqual(filtraciones(panel), []);
      for (const p of panel) {
        assert.deepEqual(filtraciones(await propiedadDelCliente(cliente, p.id)), []);
      }
    }
  });

  console.log(`${casos} casos, todos pasan`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
