// Guion de datos de ejemplo para Proges: una cartera de 80 propiedades de
// gestión de patrimonio, enfocada en arriendo y compraventa, con dueños, grupos,
// arrendatarios, contratos, cobros, gastos, contribuciones, cuentas y valores UF.
// «Hoy» es 2026-10-01 (HOY_FICHA en `seed-datos.ts`).
//
// Cada vez que corre, BORRA todo lo de la organización y lo vuelve a crear.
// Los datos de cada propiedad se arman en `seed-propiedades.ts` (45 reales desde
// `prisma/datos-reales.json`, que no va a GitHub, y 35 inventadas); las listas de
// nombres y comunas están en `seed-datos.ts`.
//
// Uso:
//   npm run db:seed          ← base local (la de DATABASE_URL en .env)
//
// Freno de seguridad: si DATABASE_URL apunta a una base que no es local
// (localhost, 127.0.0.1 o ::1), el guion se niega a correr, porque borraría toda
// esa base. Para hacerlo a propósito hay que confirmarlo:
//   SEED_CONFIRMAR=borrar-produccion DATABASE_URL="postgresql://..." npm run db:seed
//
// Qué pasa si algo falla: los datos se arman y se revisan en memoria antes de
// tocar la base (un `datos-reales.json` mal formado se detiene ahí, sin borrar
// nada). Después, el borrado y todas las creaciones van en UNA transacción: si un
// paso falla, la base vuelve a como estaba (como un «deshacer» de todo el guion).

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { GRUPOS, OWNERS, TENANTS, ETIQUETAS, ORG, UF_HOY, date } from "./seed-datos";
import { armarPropiedades } from "./seed-propiedades";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Freno de seguridad
// ---------------------------------------------------------------------------

const HOSTS_LOCALES = ["localhost", "127.0.0.1", "::1"];

// Host de la base a la que apunta DATABASE_URL (sin usuario ni clave), o null si
// la dirección no se puede leer.
function hostDeLaBase(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^\[|\]$/g, ""); // ::1 viene entre corchetes
  } catch {
    return null;
  }
}

// true si se puede seguir. Si la base no es local y no se confirmó, avisa y
// devuelve false sin tocar nada.
function puedeBorrar(): boolean {
  const host = hostDeLaBase(process.env.DATABASE_URL);
  if (host !== null && HOSTS_LOCALES.includes(host)) return true;
  if (process.env.SEED_CONFIRMAR === "borrar-produccion") return true;

  const donde = host === null ? "una dirección que no se pudo leer (¿falta DATABASE_URL?)" : `«${host}», que no es tu computador`;
  console.error(
    [
      "",
      "⛔  Este guion va a BORRAR TODA LA BASE y la va a volver a llenar con datos de ejemplo.",
      `    DATABASE_URL apunta a ${donde}.`,
      "    No se tocó nada: sin confirmación, el guion solo corre contra una base local (localhost, 127.0.0.1 o ::1).",
      "",
      "    Si de verdad quieres borrar esa base, confírmalo a propósito:",
      '    SEED_CONFIRMAR=borrar-produccion npm run db:seed',
      "",
    ].join("\n"),
  );
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!puedeBorrar()) {
    process.exitCode = 1;
    return;
  }

  // Todo se arma y se revisa en memoria antes de abrir la transacción: si algo
  // falla acá, la base ni se toca.
  const propiedades = armarPropiedades();

  // Los ids los ponemos nosotros (no la base) para poder crear cada tabla con un
  // solo `createMany`: unas 30 consultas en total, en vez de más de mil. Importa
  // contra una base remota, donde cada consulta tarda ~100 ms.
  const idEtiqueta: Record<string, string> = Object.fromEntries(ETIQUETAS.map((nombre) => [nombre, randomUUID()]));
  const idGrupo: Record<string, string> = Object.fromEntries(GRUPOS.map((g) => [g.nombre, randomUUID()]));
  const idOwner = OWNERS.map(() => randomUUID());
  const idTenant = TENANTS.map(() => randomUUID());
  const idPropiedad = propiedades.map(() => randomUUID());
  const idContrato = propiedades.map((p) => (p.contrato ? randomUUID() : null));

  console.log("🌱  Borrando y creando todo en una sola transacción...");
  await db.$transaction(
    async (tx) => {
      // -----------------------------------------------------------------------
      // Borrar lo anterior (en orden: primero lo que depende de otra tabla)
      // -----------------------------------------------------------------------
      await tx.alert.deleteMany({ where: { organizationId: ORG } });
      await tx.propertyTax.deleteMany({ where: { organizationId: ORG } });
      await tx.propertyBill.deleteMany({ where: { organizationId: ORG } });
      await tx.movement.deleteMany({ where: { organizationId: ORG } });
      await tx.rentCharge.deleteMany({ where: { organizationId: ORG } });
      await tx.leaseContract.deleteMany({ where: { organizationId: ORG } });
      await tx.tenant.deleteMany({ where: { organizationId: ORG } });
      await tx.propertyAssessment.deleteMany({ where: { organizationId: ORG } });
      await tx.propertyUnit.deleteMany({ where: { organizationId: ORG } });
      await tx.propertyOwner.deleteMany({ where: { organizationId: ORG } });
      // Los documentos (sin archivos en el ejemplo) se van con su propiedad, en cascada.
      await tx.property.deleteMany({ where: { organizationId: ORG } });
      await tx.owner.deleteMany({ where: { organizationId: ORG } });
      await tx.grupo.deleteMany({ where: { organizationId: ORG } });
      await tx.propertyTag.deleteMany({ where: { organizationId: ORG } });
      await tx.currencyValue.deleteMany();

      // -----------------------------------------------------------------------
      // Etiquetas, grupos económicos y dueños. El grupo reúne varias sociedades de
      // un mismo dueño real; los terceros quedan sin grupo.
      // -----------------------------------------------------------------------
      console.log("🏷️   Creando etiquetas, grupos y propietarios...");
      await tx.propertyTag.createMany({
        data: ETIQUETAS.map((nombre) => ({ id: idEtiqueta[nombre], organizationId: ORG, nombre })),
      });
      await tx.grupo.createMany({
        data: GRUPOS.map((g) => ({ id: idGrupo[g.nombre], organizationId: ORG, nombre: g.nombre, rut: g.rut })),
      });
      await tx.owner.createMany({
        data: OWNERS.map((o, i) => ({
          id: idOwner[i],
          organizationId: ORG,
          nombre: o.nombre,
          rut: o.rut,
          tipo: o.tipo,
          grupoId: o.grupo ? idGrupo[o.grupo] : null,
        })),
      });

      // -----------------------------------------------------------------------
      // Arrendatarios
      // -----------------------------------------------------------------------
      console.log("🏠  Creando arrendatarios...");
      await tx.tenant.createMany({
        data: TENANTS.map((t, i) => ({
          id: idTenant[i],
          organizationId: ORG,
          nombre: t.nombre,
          rut: t.rut,
          email: t.email,
          telefono: t.telefono,
        })),
      });

      // -----------------------------------------------------------------------
      // Propiedades y todo lo que cuelga de ellas
      // -----------------------------------------------------------------------
      console.log(`🏢  Creando ${propiedades.length} propiedades...`);
      await tx.property.createMany({
        data: propiedades.map((p, i) => ({
          id: idPropiedad[i],
          organizationId: ORG,
          rolSII: p.rolSII,
          tipo: p.tipo,
          direccion: p.direccion,
          comuna: p.comuna,
          region: p.region,
          objetivo: p.objetivo,
          estado: p.estado,
          monedaPrincipal: p.monedaPrincipal,
          m2Construidos: p.m2Construidos,
          m2Terreno: p.m2Terreno,
          anoConstruccion: p.anoConstruccion,
          valorComercial: p.valorComercial,
          valorComercialMoneda: p.valorComercialMoneda,
          valorComercialFecha: p.valorComercialFecha,
          valorComercialFuente: p.valorComercialFuente,
          compraFecha: p.compra?.fecha ?? null,
          compraPrecio: p.compra?.precio ?? null,
          compraMoneda: p.compra?.moneda ?? "CLP",
          deudaSaldo: p.deuda?.saldo ?? null,
          deudaMoneda: "UF" as const,
          deudaFecha: p.deuda?.fecha ?? null,
          deudaBanco: p.deuda?.banco ?? null,
          deudaDividendo: p.deuda?.dividendo ?? null,
          deudaTermino: p.deuda?.termino ?? null,
          exentaContribuciones: p.exentaContribuciones,
          // Se fija a mano solo en las desocupadas (ver PropiedadSpec.updatedAt).
          ...(p.updatedAt && { updatedAt: p.updatedAt }),
        })),
      });

      // Las etiquetas son una relación muchos a muchos: no se crean con createMany,
      // se conectan una vez por etiqueta.
      for (const nombre of ETIQUETAS) {
        const conectar = propiedades.flatMap((p, i) => (p.etiquetas.includes(nombre) ? [{ id: idPropiedad[i] }] : []));
        if (conectar.length === 0) continue;
        await tx.propertyTag.update({ where: { id: idEtiqueta[nombre] }, data: { properties: { connect: conectar } } });
      }

      await tx.propertyOwner.createMany({
        data: propiedades.flatMap((p, i) =>
          p.duenos.map((d) => ({
            organizationId: ORG,
            propertyId: idPropiedad[i],
            ownerId: idOwner[d.owner],
            porcentaje: d.porcentaje,
          })),
        ),
      });

      await tx.propertyUnit.createMany({
        data: propiedades.flatMap((p, i) =>
          p.anexos.map((a) => ({
            organizationId: ORG,
            propertyId: idPropiedad[i],
            tipo: a.tipo,
            numero: a.numero,
            rolSII: a.rolSII,
            avaluoFiscal: a.avaluoFiscal,
          })),
        ),
      });

      // Avalúo fiscal: el de 2026, y el de 2025 un 4,5 % más bajo.
      await tx.propertyAssessment.createMany({
        data: propiedades.flatMap((p, i) => [
          { organizationId: ORG, propertyId: idPropiedad[i], anio: 2025, valor: Math.round(p.avaluoFiscal / 1.045) },
          { organizationId: ORG, propertyId: idPropiedad[i], anio: 2026, valor: p.avaluoFiscal },
        ]),
      });

      // -----------------------------------------------------------------------
      // Contratos y cobros
      // -----------------------------------------------------------------------
      console.log("📄  Creando contratos y cobros...");
      await tx.leaseContract.createMany({
        data: propiedades.flatMap((p, i) => {
          const c = p.contrato;
          const id = idContrato[i];
          if (!c || !id) return [];
          return [
            {
              id,
              organizationId: ORG,
              propertyId: idPropiedad[i],
              tenantId: idTenant[c.tenant],
              monto: c.monto,
              moneda: c.moneda,
              aplicaReajuste: c.reajuste !== "NINGUNO",
              reajusteTipo: c.reajuste,
              reajusteFrecuenciaMeses: c.reajuste !== "NINGUNO" ? 12 : null,
              fechaInicio: c.fechaInicio,
              fechaTermino: c.fechaTermino,
              diaPago: c.diaPago,
              estado: c.estado,
            },
          ];
        }),
      });
      await tx.rentCharge.createMany({
        data: propiedades.flatMap((p, i) => {
          const c = p.contrato;
          const contractId = idContrato[i];
          if (!c || !contractId) return [];
          return c.cobros.map((x) => ({
            organizationId: ORG,
            contractId,
            periodo: x.periodo,
            montoEsperado: c.monto,
            moneda: c.moneda,
            fechaVencimiento: x.fechaVencimiento,
            estado: x.estado,
            fechaPago: x.fechaPago,
            montoPagado: x.montoPagado,
            interesMora: x.interesMora,
          }));
        }),
      });

      // -----------------------------------------------------------------------
      // Gastos, contribuciones y cuentas por pagar
      // -----------------------------------------------------------------------
      console.log("💸  Creando gastos, contribuciones y cuentas...");
      // El ingreso por arriendo vive en los cobros; acá van solo los gastos del
      // libro (en pesos, que es como se pagan en la práctica).
      await tx.movement.createMany({
        data: propiedades.flatMap((p, i) =>
          p.gastos.map((g) => ({
            organizationId: ORG,
            propertyId: idPropiedad[i],
            tipo: "GASTO" as const,
            categoria: g.categoria,
            monto: g.monto,
            moneda: "CLP" as const,
            fecha: g.fecha,
            descripcion: g.descripcion,
          })),
        ),
      });
      await tx.propertyTax.createMany({
        data: propiedades.flatMap((p, i) =>
          p.contribuciones.map((t) => ({
            organizationId: ORG,
            propertyId: idPropiedad[i],
            anio: 2026,
            cuota: t.cuota,
            monto: t.monto,
            fechaVencimiento: t.fechaVencimiento,
            estado: t.estado,
            fechaPago: t.fechaPago,
          })),
        ),
      });
      await tx.propertyBill.createMany({
        data: propiedades.flatMap((p, i) =>
          p.cuentas.map((b) => ({
            organizationId: ORG,
            propertyId: idPropiedad[i],
            tipo: b.tipo,
            periodo: b.periodo,
            monto: b.monto,
            fechaVencimiento: b.fechaVencimiento,
            estado: b.estado,
            fechaPago: b.fechaPago,
          })),
        ),
      });

      // -----------------------------------------------------------------------
      // Valor UF: el día 1 de cada mes, de 2025-10 a 2026-10, creciendo ~0,3 % al
      // mes y terminando en UF_HOY.
      // -----------------------------------------------------------------------
      console.log("💱  Cargando valores UF...");
      await tx.currencyValue.createMany({
        data: Array.from({ length: 13 }, (_, k) => ({
          fecha: date(2025, 10 + k, 1),
          tipo: "UF" as const,
          valor: k === 12 ? UF_HOY : +(UF_HOY / 1.003 ** (12 - k)).toFixed(2),
        })),
      });
    },
    // Holgado a propósito: contra una base remota la transacción tarda más.
    { timeout: 600_000, maxWait: 30_000 },
  );

  // -------------------------------------------------------------------------
  // Resumen
  // -------------------------------------------------------------------------
  const where = { organizationId: ORG };
  const counts = {
    propiedades: await db.property.count({ where }),
    dueños: await db.owner.count({ where }),
    arrendatarios: await db.tenant.count({ where }),
    contratos: await db.leaseContract.count({ where }),
    cobros: await db.rentCharge.count({ where }),
    gastos: await db.movement.count({ where }),
    contribuciones: await db.propertyTax.count({ where }),
    cuentas: await db.propertyBill.count({ where }),
  };

  console.log("\n✅  Seed completado:");
  console.log(`   Propiedades:    ${counts.propiedades}`);
  console.log(`   Propietarios:   ${counts.dueños}`);
  console.log(`   Arrendatarios:  ${counts.arrendatarios}`);
  console.log(`   Contratos:      ${counts.contratos}`);
  console.log(`   Cobros:         ${counts.cobros}`);
  console.log(`   Gastos:         ${counts.gastos}`);
  console.log(`   Contribuciones: ${counts.contribuciones}`);
  console.log(`   Cuentas:        ${counts.cuentas}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
