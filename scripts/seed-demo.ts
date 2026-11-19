// Seed de demostración: una propiedad con copropiedad y etiquetas.
// Uso: npx tsx scripts/seed-demo.ts   (idempotente por rolSII)
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// Los datos de demostración van al cliente de mentira «Demo» (lo crea prisma/seed.ts).
const ORG_DEMO = "org_demo";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const orgId = ORG_DEMO;
  const rolSII = "12345-6";

  // Idempotencia: borra una corrida previa con el mismo ROL.
  await db.property.deleteMany({ where: { organizationId: orgId, rolSII } });

  const property = await db.property.create({
    data: {
      organizationId: orgId,
      rolSII,
      tipo: "DEPARTAMENTO",
      direccion: "Av. Providencia 1234, depto 802",
      comuna: "Providencia",
      region: "Metropolitana",
      objetivo: "INVERSION",
      estado: "ARRENDADA",
      monedaPrincipal: "UF",
      m2Terreno: "72",
      m2Construidos: "68",
      anoConstruccion: 2010,
      valorComercial: "5200",
      tags: {
        create: [
          {
            organizationId: orgId,
            // upsert manual no aplica en nested create; usamos connectOrCreate vía unique.
            nombre: "Edificio Costanera",
          },
          { organizationId: orgId, nombre: "Renta alta" },
        ],
      },
    },
  });

  // Dueños (copropiedad 60/40).
  const ana = await db.owner.create({
    data: {
      organizationId: orgId,
      nombre: "Ana Pérez Soto",
      rut: "12.345.678-9",
      tipo: "PERSONA",
    },
  });
  const inv = await db.owner.create({
    data: {
      organizationId: orgId,
      nombre: "Inversiones Andes SpA",
      rut: "76.543.210-K",
      tipo: "SOCIEDAD",
    },
  });

  await db.propertyOwner.createMany({
    data: [
      {
        organizationId: orgId,
        propertyId: property.id,
        ownerId: ana.id,
        porcentaje: "60",
      },
      {
        organizationId: orgId,
        propertyId: property.id,
        ownerId: inv.id,
        porcentaje: "40",
      },
    ],
  });

  console.log(`OK · propiedad ${property.id} (ROL ${rolSII}) creada.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
