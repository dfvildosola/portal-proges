-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "grupoId" TEXT;

-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Grupo_organizationId_idx" ON "Grupo"("organizationId");

-- CreateIndex
CREATE INDEX "Owner_grupoId_idx" ON "Owner"("grupoId");

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
