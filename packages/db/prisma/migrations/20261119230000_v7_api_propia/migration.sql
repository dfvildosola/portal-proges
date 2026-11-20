-- v7: portal nuevo sobre API propia.
--
-- Agrega: enlace del usuario con Clerk, modo del cliente (atendido o autónomo), «esperando a…»
-- en el servicio (con su evento ESPERA), la respuesta del dueño a una oferta, anuncios con sus
-- cifras semanales, las llaves de la API (solo su huella) y quién anotó cada documento, cuenta
-- y contribución.
--
-- Quita SOLO las etapas de la v4 (tabla Etapa, ServicioEnCurso.etapaId, Evento.etapaId y el
-- valor ETAPA de EventoTipo). Todos los datos de hoy son ficticios (Diego, 2026-11-19), así que
-- primero se borran los eventos de tipo ETAPA, que ya no tendrían sentido. Nada más se borra.

DELETE FROM "Evento" WHERE "tipo" = 'ETAPA';

-- CreateEnum
CREATE TYPE "ModoCliente" AS ENUM ('ATENDIDO', 'AUTONOMO');

-- CreateEnum
CREATE TYPE "EsperandoA" AS ENUM ('CONSERVADOR', 'NOTARIA', 'MUNICIPALIDAD', 'MAESTRO', 'DUENO', 'BANCO', 'OTRO');

-- CreateEnum
CREATE TYPE "RespuestaOferta" AS ENUM ('ACEPTA', 'CONTRAOFERTA', 'RECHAZA');

-- CreateEnum
CREATE TYPE "AnuncioEstado" AS ENUM ('ACTIVO', 'PAUSADO', 'BAJADO');

-- AlterEnum
BEGIN;
CREATE TYPE "EventoTipo_new" AS ENUM ('PRECIO', 'ESPERA');
ALTER TABLE "Evento" ALTER COLUMN "tipo" TYPE "EventoTipo_new" USING ("tipo"::text::"EventoTipo_new");
ALTER TYPE "EventoTipo" RENAME TO "EventoTipo_old";
ALTER TYPE "EventoTipo_new" RENAME TO "EventoTipo";
DROP TYPE "public"."EventoTipo_old";
COMMIT;

-- AlterEnum
ALTER TYPE "OfertaEstado" ADD VALUE 'CONTRAOFERTADA';

-- DropForeignKey
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_etapaId_fkey";

-- DropForeignKey
ALTER TABLE "ServicioEnCurso" DROP CONSTRAINT "ServicioEnCurso_etapaId_fkey";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "subidoPorId" TEXT;

-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "etapaId";

-- AlterTable
ALTER TABLE "Oferta" ADD COLUMN     "contraofertaMonto" DECIMAL(14,2),
ADD COLUMN     "mostradaAlDuenoEl" TIMESTAMP(3),
ADD COLUMN     "mostradaPorId" TEXT,
ADD COLUMN     "recomendacion" TEXT,
ADD COLUMN     "respondidaEl" TIMESTAMP(3),
ADD COLUMN     "respondidaPorId" TEXT,
ADD COLUMN     "respuestaDueno" "RespuestaOferta";

-- AlterTable
ALTER TABLE "Organizacion" ADD COLUMN     "modo" "ModoCliente" NOT NULL DEFAULT 'ATENDIDO';

-- AlterTable
ALTER TABLE "PropertyBill" ADD COLUMN     "anotadoPorId" TEXT;

-- AlterTable
ALTER TABLE "PropertyTax" ADD COLUMN     "anotadoPorId" TEXT;

-- AlterTable
ALTER TABLE "ServicioEnCurso" DROP COLUMN "etapaId",
ADD COLUMN     "esperandoA" "EsperandoA",
ADD COLUMN     "esperandoDesde" DATE,
ADD COLUMN     "esperandoDetalle" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "clerkUserId" TEXT;

-- DropTable
DROP TABLE "Etapa";

-- CreateTable
CREATE TABLE "LlaveApi" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "prefijo" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "creadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUso" TIMESTAMP(3),
    "revocadaEl" TIMESTAMP(3),

    CONSTRAINT "LlaveApi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anuncio" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "url" TEXT,
    "estado" "AnuncioEstado" NOT NULL DEFAULT 'ACTIVO',
    "desde" DATE NOT NULL,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anuncio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnuncioCifra" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "anuncioId" TEXT NOT NULL,
    "semana" DATE NOT NULL,
    "vistas" INTEGER,
    "consultas" INTEGER,
    "anotadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnuncioCifra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LlaveApi_huella_key" ON "LlaveApi"("huella");

-- CreateIndex
CREATE INDEX "LlaveApi_organizationId_idx" ON "LlaveApi"("organizationId");

-- CreateIndex
CREATE INDEX "Anuncio_organizationId_idx" ON "Anuncio"("organizationId");

-- CreateIndex
CREATE INDEX "Anuncio_servicioEnCursoId_idx" ON "Anuncio"("servicioEnCursoId");

-- CreateIndex
CREATE INDEX "AnuncioCifra_organizationId_idx" ON "AnuncioCifra"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AnuncioCifra_anuncioId_semana_key" ON "AnuncioCifra"("anuncioId", "semana");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_clerkUserId_key" ON "Usuario"("clerkUserId");

-- AddForeignKey
ALTER TABLE "LlaveApi" ADD CONSTRAINT "LlaveApi_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTax" ADD CONSTRAINT "PropertyTax_anotadoPorId_fkey" FOREIGN KEY ("anotadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyBill" ADD CONSTRAINT "PropertyBill_anotadoPorId_fkey" FOREIGN KEY ("anotadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_mostradaPorId_fkey" FOREIGN KEY ("mostradaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_respondidaPorId_fkey" FOREIGN KEY ("respondidaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anuncio" ADD CONSTRAINT "Anuncio_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anuncio" ADD CONSTRAINT "Anuncio_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnuncioCifra" ADD CONSTRAINT "AnuncioCifra_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnuncioCifra" ADD CONSTRAINT "AnuncioCifra_anotadaPorId_fkey" FOREIGN KEY ("anotadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

