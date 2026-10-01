-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('GASTO_COMUN', 'LUZ', 'AGUA', 'GAS', 'OTRO');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDIENTE', 'PAGADA');

-- CreateTable
CREATE TABLE "PropertyBill" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tipo" "BillType" NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto" DECIMAL(14,2),
    "moneda" "Currency" NOT NULL DEFAULT 'CLP',
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "BillStatus" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyBill_organizationId_idx" ON "PropertyBill"("organizationId");

-- CreateIndex
CREATE INDEX "PropertyBill_propertyId_idx" ON "PropertyBill"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyBill" ADD CONSTRAINT "PropertyBill_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
