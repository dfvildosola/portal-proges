-- AlterTable: replace avaluoFiscal with physical fields
ALTER TABLE "Property"
  ADD COLUMN "m2Terreno"       DECIMAL(10,2),
  ADD COLUMN "m2Construidos"   DECIMAL(10,2),
  ADD COLUMN "anoConstruccion" INTEGER,
  DROP COLUMN "avaluoFiscal";

-- CreateTable: PropertyAssessment
CREATE TABLE "PropertyAssessment" (
    "id"             TEXT         NOT NULL,
    "organizationId" TEXT         NOT NULL,
    "propertyId"     TEXT         NOT NULL,
    "anio"           INTEGER      NOT NULL,
    "valor"          DECIMAL(14,2) NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAssessment_propertyId_anio_key"
    ON "PropertyAssessment"("propertyId", "anio");
CREATE INDEX "PropertyAssessment_organizationId_idx"
    ON "PropertyAssessment"("organizationId");
CREATE INDEX "PropertyAssessment_propertyId_idx"
    ON "PropertyAssessment"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyAssessment"
    ADD CONSTRAINT "PropertyAssessment_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
