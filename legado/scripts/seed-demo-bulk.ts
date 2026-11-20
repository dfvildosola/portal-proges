// Seed de demostración para la tabla: ~12 propiedades variadas (idempotente: ROL "DEMO-*").
// Uso: npx tsx scripts/seed-demo-bulk.ts
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// Los datos de demostración van al cliente de mentira «Demo» (lo crea prisma/seed.ts).
const ORG_DEMO = "org_demo";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const TIPOS = [
  "DEPARTAMENTO",
  "CASA",
  "OFICINA",
  "LOCAL",
  "BODEGA",
  "ESTACIONAMIENTO",
  "TERRENO",
  "PARCELA",
] as const;
const ESTADOS = [
  "ARRENDADA",
  "DISPONIBLE",
  "EN_VENTA",
  "USO_PROPIO",
  "DESOCUPADA",
] as const;
const COMUNAS = [
  "Providencia",
  "Las Condes",
  "Ñuñoa",
  "Vitacura",
  "Santiago",
  "La Reina",
];
const CALLES = [
  "Av. Apoquindo",
  "Av. Pocuro",
  "Los Leones",
  "Av. Italia",
  "Pedro de Valdivia",
  "Av. Kennedy",
];

async function main() {
  const orgId = ORG_DEMO;
  await db.property.deleteMany({
    where: { organizationId: orgId, rolSII: { startsWith: "DEMO-" } },
  });

  const data = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const tipo = TIPOS[i % TIPOS.length];
    const estado = ESTADOS[i % ESTADOS.length];
    const comuna = COMUNAS[i % COMUNAS.length];
    const calle = CALLES[i % CALLES.length];
    return {
      organizationId: orgId,
      rolSII: `DEMO-${String(n).padStart(3, "0")}`,
      tipo,
      direccion: `${calle} ${1000 + n * 37}`,
      comuna,
      region: "Metropolitana",
      objetivo: (["INVERSION", "USO_PROPIO", "VENTA"] as const)[i % 3],
      estado,
      monedaPrincipal: (["CLP", "UF"] as const)[i % 2],
      avaluoFiscal: String(1500 + n * 220),
      valorComercial: String(2800 + n * 410),
    };
  });

  await db.property.createMany({ data });
  console.log(`OK · ${data.length} propiedades DEMO-* creadas.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
