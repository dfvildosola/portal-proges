-- CreateEnum
CREATE TYPE "RecepcionPartida" AS ENUM ('PENDIENTE', 'CONFORME', 'OBSERVADA');

-- CreateEnum
CREATE TYPE "PresupuestoTipo" AS ENUM ('ORIGINAL', 'ADICIONAL');

-- CreateEnum
CREATE TYPE "PresupuestoEstado" AS ENUM ('RECIBIDO', 'APROBADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "LeaseContract" ADD COLUMN     "modificadoPorId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "edificio" TEXT,
ADD COLUMN     "modificadoPorId" TEXT,
ADD COLUMN     "odooCuentaAnalitica" TEXT;

-- AlterTable
ALTER TABLE "RentCharge" ADD COLUMN     "modificadoPorId" TEXT;

-- AlterTable
ALTER TABLE "ServicioEnCurso" ADD COLUMN     "fechaComprometida" TIMESTAMP(3),
ADD COLUMN     "inicioObra" TIMESTAMP(3),
ADD COLUMN     "porRevisar" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "jefatura" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "que" TEXT NOT NULL,
    "responsableId" TEXT,
    "vence" TIMESTAMP(3),
    "hechaEl" TIMESTAMP(3),
    "hechaPorId" TEXT,
    "creadaPorId" TEXT NOT NULL,
    "partidaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "paraDueno" BOOLEAN NOT NULL DEFAULT false,
    "tareaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "notaId" TEXT,
    "partidaId" TEXT,
    "driveFileId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maestro" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "odooPartnerId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "especialidad" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Maestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenDueno" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "odooOrderId" INTEGER NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "moneda" "Currency" NOT NULL DEFAULT 'CLP',
    "facturado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "traidaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdenDueno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partida" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "ordenId" TEXT,
    "recinto" TEXT,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(14,3),
    "unidad" TEXT,
    "precioDueno" DECIMAL(14,2),
    "moneda" "Currency" NOT NULL DEFAULT 'CLP',
    "odooLineId" INTEGER,
    "posicion" INTEGER NOT NULL DEFAULT 0,
    "maestroId" TEXT,
    "avance" INTEGER NOT NULL DEFAULT 0,
    "recepcion" "RecepcionPartida" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,
    "recibidaEl" TIMESTAMP(3),
    "recibidaPorId" TEXT,
    "quitadaEnOdoo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoMaestro" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "maestroId" TEXT NOT NULL,
    "tipo" "PresupuestoTipo" NOT NULL DEFAULT 'ORIGINAL',
    "total" DECIMAL(14,2) NOT NULL,
    "plazoDias" INTEGER,
    "pdfDriveFileId" TEXT,
    "estado" "PresupuestoEstado" NOT NULL DEFAULT 'RECIBIDO',
    "nota" TEXT,
    "cargadoPorId" TEXT NOT NULL,
    "resueltoPorId" TEXT,
    "resueltoEl" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresupuestoMaestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaMaestro" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "maestroId" TEXT NOT NULL,
    "odooMoveId" INTEGER,
    "numero" TEXT,
    "fecha" TIMESTAMP(3),
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "montoAsignado" DECIMAL(14,2) NOT NULL,
    "asignadaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacturaMaestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administracion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3),
    "comisionPct" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Administracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PresupuestoPartidas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PresupuestoPartidas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Tarea_organizationId_idx" ON "Tarea"("organizationId");

-- CreateIndex
CREATE INDEX "Tarea_servicioEnCursoId_idx" ON "Tarea"("servicioEnCursoId");

-- CreateIndex
CREATE INDEX "Tarea_responsableId_hechaEl_idx" ON "Tarea"("responsableId", "hechaEl");

-- CreateIndex
CREATE INDEX "Nota_organizationId_idx" ON "Nota"("organizationId");

-- CreateIndex
CREATE INDEX "Nota_servicioEnCursoId_createdAt_idx" ON "Nota"("servicioEnCursoId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Foto_driveFileId_key" ON "Foto"("driveFileId");

-- CreateIndex
CREATE INDEX "Foto_organizationId_idx" ON "Foto"("organizationId");

-- CreateIndex
CREATE INDEX "Foto_notaId_idx" ON "Foto"("notaId");

-- CreateIndex
CREATE INDEX "Foto_partidaId_idx" ON "Foto"("partidaId");

-- CreateIndex
CREATE UNIQUE INDEX "Maestro_odooPartnerId_key" ON "Maestro"("odooPartnerId");

-- CreateIndex
CREATE INDEX "Maestro_organizationId_idx" ON "Maestro"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenDueno_servicioEnCursoId_key" ON "OrdenDueno"("servicioEnCursoId");

-- CreateIndex
CREATE INDEX "OrdenDueno_organizationId_idx" ON "OrdenDueno"("organizationId");

-- CreateIndex
CREATE INDEX "Partida_organizationId_idx" ON "Partida"("organizationId");

-- CreateIndex
CREATE INDEX "Partida_servicioEnCursoId_posicion_idx" ON "Partida"("servicioEnCursoId", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "Partida_ordenId_odooLineId_key" ON "Partida"("ordenId", "odooLineId");

-- CreateIndex
CREATE INDEX "PresupuestoMaestro_organizationId_idx" ON "PresupuestoMaestro"("organizationId");

-- CreateIndex
CREATE INDEX "PresupuestoMaestro_servicioEnCursoId_idx" ON "PresupuestoMaestro"("servicioEnCursoId");

-- CreateIndex
CREATE INDEX "PresupuestoMaestro_pdfDriveFileId_idx" ON "PresupuestoMaestro"("pdfDriveFileId");

-- CreateIndex
CREATE INDEX "FacturaMaestro_organizationId_idx" ON "FacturaMaestro"("organizationId");

-- CreateIndex
CREATE INDEX "FacturaMaestro_odooMoveId_idx" ON "FacturaMaestro"("odooMoveId");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaMaestro_servicioEnCursoId_odooMoveId_key" ON "FacturaMaestro"("servicioEnCursoId", "odooMoveId");

-- CreateIndex
CREATE INDEX "Administracion_organizationId_idx" ON "Administracion"("organizationId");

-- CreateIndex
CREATE INDEX "Administracion_propertyId_idx" ON "Administracion"("propertyId");

-- CreateIndex
CREATE INDEX "_PresupuestoPartidas_B_index" ON "_PresupuestoPartidas"("B");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_modificadoPorId_fkey" FOREIGN KEY ("modificadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_modificadoPorId_fkey" FOREIGN KEY ("modificadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentCharge" ADD CONSTRAINT "RentCharge_modificadoPorId_fkey" FOREIGN KEY ("modificadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_hechaPorId_fkey" FOREIGN KEY ("hechaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_notaId_fkey" FOREIGN KEY ("notaId") REFERENCES "Nota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenDueno" ADD CONSTRAINT "OrdenDueno_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenDueno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_maestroId_fkey" FOREIGN KEY ("maestroId") REFERENCES "Maestro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_recibidaPorId_fkey" FOREIGN KEY ("recibidaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoMaestro" ADD CONSTRAINT "PresupuestoMaestro_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoMaestro" ADD CONSTRAINT "PresupuestoMaestro_maestroId_fkey" FOREIGN KEY ("maestroId") REFERENCES "Maestro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoMaestro" ADD CONSTRAINT "PresupuestoMaestro_cargadoPorId_fkey" FOREIGN KEY ("cargadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoMaestro" ADD CONSTRAINT "PresupuestoMaestro_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaMaestro" ADD CONSTRAINT "FacturaMaestro_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaMaestro" ADD CONSTRAINT "FacturaMaestro_maestroId_fkey" FOREIGN KEY ("maestroId") REFERENCES "Maestro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaMaestro" ADD CONSTRAINT "FacturaMaestro_asignadaPorId_fkey" FOREIGN KEY ("asignadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Administracion" ADD CONSTRAINT "Administracion_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PresupuestoPartidas" ADD CONSTRAINT "_PresupuestoPartidas_A_fkey" FOREIGN KEY ("A") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PresupuestoPartidas" ADD CONSTRAINT "_PresupuestoPartidas_B_fkey" FOREIGN KEY ("B") REFERENCES "PresupuestoMaestro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
