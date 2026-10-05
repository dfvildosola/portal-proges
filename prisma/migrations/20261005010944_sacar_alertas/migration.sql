-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_contractId_fkey";

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_propertyId_fkey";

-- DropTable
DROP TABLE "Alert";

-- DropEnum
DROP TYPE "AlertSeverity";

-- DropEnum
DROP TYPE "AlertStatus";

-- DropEnum
DROP TYPE "AlertType";

