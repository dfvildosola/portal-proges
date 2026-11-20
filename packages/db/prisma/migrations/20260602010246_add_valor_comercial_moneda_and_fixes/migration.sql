-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'CONTRIBUCION_POR_VENCER';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "valorComercialMoneda" "Currency" NOT NULL DEFAULT 'CLP';

-- AlterTable
ALTER TABLE "PropertyTax" ALTER COLUMN "monto" DROP NOT NULL;
