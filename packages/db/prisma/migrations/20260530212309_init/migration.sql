-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('DEPARTAMENTO', 'CASA', 'OFICINA', 'LOCAL', 'BODEGA', 'ESTACIONAMIENTO', 'TERRENO', 'PARCELA', 'AGRICOLA');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ARRENDADA', 'DISPONIBLE', 'EN_VENTA', 'USO_PROPIO', 'DESOCUPADA');

-- CreateEnum
CREATE TYPE "PropertyGoal" AS ENUM ('INVERSION', 'USO_PROPIO', 'VENTA');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CLP', 'UF');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('PERSONA', 'SOCIEDAD');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('VIGENTE', 'POR_VENCER', 'VENCIDO', 'RENOVADO', 'TERMINADO');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('NINGUNO', 'IPC', 'UF');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDIENTE', 'PAGADO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INGRESO', 'GASTO');

-- CreateEnum
CREATE TYPE "MovementCategory" AS ENUM ('ARRIENDO', 'REPARACION', 'GASTO_COMUN', 'SEGURO', 'IMPUESTO', 'OTRO');

-- CreateEnum
CREATE TYPE "TaxStatus" AS ENUM ('PENDIENTE', 'PAGADA');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ESCRITURA', 'DOMINIO_VIGENTE', 'INSCRIPCION_CBR', 'HIPOTECA', 'NO_EXPROPIACION', 'SEGURO', 'CONTRATO', 'PRESUPUESTO', 'FOTO', 'OTRO');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ARRENDADA_SIN_CONTRATO', 'CONTRATO_POR_VENCER', 'ARRIENDO_ATRASADO', 'CONTRIBUCION_IMPAGA', 'DESOCUPADA_PROLONGADA');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVA', 'RESUELTA');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('UF', 'IPC');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rolSII" TEXT NOT NULL,
    "tipo" "PropertyType" NOT NULL,
    "direccion" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "objetivo" "PropertyGoal" NOT NULL DEFAULT 'INVERSION',
    "estado" "PropertyStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "monedaPrincipal" "Currency" NOT NULL DEFAULT 'CLP',
    "avaluoFiscal" DECIMAL(14,2),
    "valorComercial" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyTag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "PropertyTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "tipo" "OwnerType" NOT NULL DEFAULT 'PERSONA',

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseContract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" "Currency" NOT NULL DEFAULT 'CLP',
    "aplicaReajuste" BOOLEAN NOT NULL DEFAULT false,
    "reajusteTipo" "AdjustmentType" NOT NULL DEFAULT 'NINGUNO',
    "reajusteFrecuenciaMeses" INTEGER,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaTermino" TIMESTAMP(3) NOT NULL,
    "diaPago" INTEGER NOT NULL,
    "estado" "ContractStatus" NOT NULL DEFAULT 'VIGENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentCharge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "montoEsperado" DECIMAL(14,2) NOT NULL,
    "moneda" "Currency" NOT NULL DEFAULT 'CLP',
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "ChargeStatus" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "montoPagado" DECIMAL(14,2),
    "interesMora" DECIMAL(14,2),
    "notas" TEXT,

    CONSTRAINT "RentCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tipo" "MovementType" NOT NULL,
    "categoria" "MovementCategory" NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" "Currency" NOT NULL DEFAULT 'CLP',
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "documentId" TEXT,
    "rentChargeId" TEXT,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyTax" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "cuota" INTEGER NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "TaxStatus" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),

    CONSTRAINT "PropertyTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tipo" "DocumentType" NOT NULL,
    "nombre" TEXT NOT NULL,
    "blobKey" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "fojas" TEXT,
    "numero" TEXT,
    "anio" INTEGER,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tipo" "AlertType" NOT NULL,
    "severidad" "AlertSeverity" NOT NULL DEFAULT 'MEDIA',
    "mensaje" TEXT NOT NULL,
    "propertyId" TEXT,
    "contractId" TEXT,
    "estado" "AlertStatus" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyValue" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "RateType" NOT NULL,
    "valor" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "CurrencyValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PropertyToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PropertyToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Property_organizationId_idx" ON "Property"("organizationId");

-- CreateIndex
CREATE INDEX "PropertyTag_organizationId_idx" ON "PropertyTag"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTag_organizationId_nombre_key" ON "PropertyTag"("organizationId", "nombre");

-- CreateIndex
CREATE INDEX "Owner_organizationId_idx" ON "Owner"("organizationId");

-- CreateIndex
CREATE INDEX "PropertyOwner_organizationId_idx" ON "PropertyOwner"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyOwner_propertyId_ownerId_key" ON "PropertyOwner"("propertyId", "ownerId");

-- CreateIndex
CREATE INDEX "Tenant_organizationId_idx" ON "Tenant"("organizationId");

-- CreateIndex
CREATE INDEX "LeaseContract_organizationId_idx" ON "LeaseContract"("organizationId");

-- CreateIndex
CREATE INDEX "LeaseContract_propertyId_idx" ON "LeaseContract"("propertyId");

-- CreateIndex
CREATE INDEX "RentCharge_organizationId_idx" ON "RentCharge"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RentCharge_contractId_periodo_key" ON "RentCharge"("contractId", "periodo");

-- CreateIndex
CREATE INDEX "Movement_organizationId_idx" ON "Movement"("organizationId");

-- CreateIndex
CREATE INDEX "Movement_propertyId_idx" ON "Movement"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyTax_organizationId_idx" ON "PropertyTax"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTax_propertyId_anio_cuota_key" ON "PropertyTax"("propertyId", "anio", "cuota");

-- CreateIndex
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");

-- CreateIndex
CREATE INDEX "Document_propertyId_idx" ON "Document"("propertyId");

-- CreateIndex
CREATE INDEX "Alert_organizationId_idx" ON "Alert"("organizationId");

-- CreateIndex
CREATE INDEX "Alert_estado_idx" ON "Alert"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyValue_fecha_tipo_key" ON "CurrencyValue"("fecha", "tipo");

-- CreateIndex
CREATE INDEX "_PropertyToTag_B_index" ON "_PropertyToTag"("B");

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentCharge" ADD CONSTRAINT "RentCharge_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "LeaseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_rentChargeId_fkey" FOREIGN KEY ("rentChargeId") REFERENCES "RentCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTax" ADD CONSTRAINT "PropertyTax_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "LeaseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PropertyToTag" ADD CONSTRAINT "_PropertyToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PropertyToTag" ADD CONSTRAINT "_PropertyToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "PropertyTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
