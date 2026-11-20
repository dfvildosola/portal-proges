-- CreateEnum
CREATE TYPE "PropertyUnitType" AS ENUM ('ESTACIONAMIENTO', 'BODEGA');

-- CreateTable
CREATE TABLE "PropertyUnit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tipo" "PropertyUnitType" NOT NULL,
    "numero" TEXT NOT NULL,
    "rolSII" TEXT,
    "avaluoFiscal" DECIMAL(14,2),

    CONSTRAINT "PropertyUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyUnit_organizationId_idx" ON "PropertyUnit"("organizationId");

-- CreateIndex
CREATE INDEX "PropertyUnit_propertyId_idx" ON "PropertyUnit"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyUnit" ADD CONSTRAINT "PropertyUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
