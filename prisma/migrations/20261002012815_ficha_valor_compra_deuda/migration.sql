-- CreateEnum
CREATE TYPE "ValorFuente" AS ENUM ('TASACION', 'CORREDOR', 'ESTIMACION_PROPIA');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "compraFecha" TIMESTAMP(3),
ADD COLUMN     "compraMoneda" "Currency" NOT NULL DEFAULT 'CLP',
ADD COLUMN     "compraPrecio" DECIMAL(14,2),
ADD COLUMN     "deudaBanco" TEXT,
ADD COLUMN     "deudaDividendo" DECIMAL(14,2),
ADD COLUMN     "deudaFecha" TIMESTAMP(3),
ADD COLUMN     "deudaMoneda" "Currency" NOT NULL DEFAULT 'UF',
ADD COLUMN     "deudaSaldo" DECIMAL(14,2),
ADD COLUMN     "deudaTermino" TIMESTAMP(3),
ADD COLUMN     "exentaContribuciones" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "valorComercialFecha" TIMESTAMP(3),
ADD COLUMN     "valorComercialFuente" "ValorFuente";
