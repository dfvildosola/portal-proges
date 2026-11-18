-- CreateEnum
CREATE TYPE "UsuarioRol" AS ENUM ('EQUIPO', 'CLIENTE');

-- CreateEnum
CREATE TYPE "UsuarioAlcance" AS ENUM ('GRUPO', 'SOCIEDADES');

-- CreateEnum
CREATE TYPE "ServicioTipo" AS ENUM ('EVALUACION', 'INSPECCION', 'VENTA', 'ARRIENDO', 'OBRA', 'ADMINISTRACION');

-- CreateEnum
CREATE TYPE "ServicioEstado" AS ENUM ('ABIERTO', 'TERMINADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EventoTipo" AS ENUM ('ETAPA', 'PRECIO');

-- CreateEnum
CREATE TYPE "PrecioOrigen" AS ENUM ('PROPIETARIO', 'SUGERIDO_PROGES');

-- CreateEnum
CREATE TYPE "OfertaEstado" AS ENUM ('RECIBIDA', 'ACEPTADA', 'RECHAZADA', 'CAIDA');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "driveCarpetaId" TEXT,
ALTER COLUMN "rolSII" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "UsuarioRol" NOT NULL,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "grupoId" TEXT,
    "alcance" "UsuarioAlcance" NOT NULL DEFAULT 'GRUPO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoIngreso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioSociedad" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "UsuarioSociedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etapa" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tipo" "ServicioTipo" NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "cierraServicio" BOOLEAN NOT NULL DEFAULT false,
    "propiedadPublicada" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "familia" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioEnCurso" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "tipo" "ServicioTipo" NOT NULL,
    "etapaId" TEXT NOT NULL,
    "responsableId" TEXT,
    "estado" "ServicioEstado" NOT NULL DEFAULT 'ABIERTO',
    "motivoCierre" TEXT,
    "porConfirmar" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "abiertoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoEl" TIMESTAMP(3),
    "precio" DECIMAL(14,2),
    "precioMoneda" "Currency",
    "avisoUrl" TEXT,
    "recomendacion" TEXT,
    "recomendacionFecha" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicioEnCurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "tipo" "EventoTipo" NOT NULL,
    "etapaId" TEXT,
    "anterior" TEXT,
    "nuevo" TEXT NOT NULL,
    "moneda" "Currency",
    "origen" "PrecioOrigen",
    "motivo" TEXT,
    "autorId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visita" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "realizadaPorId" TEXT,
    "interesadoNombre" TEXT,
    "interesadoContacto" TEXT,
    "evaluacion" INTEGER,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicioEnCursoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" "Currency" NOT NULL,
    "oferente" TEXT NOT NULL,
    "estado" "OfertaEstado" NOT NULL DEFAULT 'RECIBIDA',
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_organizationId_idx" ON "Usuario"("organizationId");

-- CreateIndex
CREATE INDEX "UsuarioSociedad_organizationId_idx" ON "UsuarioSociedad"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioSociedad_usuarioId_ownerId_key" ON "UsuarioSociedad"("usuarioId", "ownerId");

-- CreateIndex
CREATE INDEX "Etapa_organizationId_tipo_idx" ON "Etapa"("organizationId", "tipo");

-- CreateIndex
CREATE INDEX "Servicio_organizationId_idx" ON "Servicio"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Servicio_organizationId_codigo_nombre_key" ON "Servicio"("organizationId", "codigo", "nombre");

-- CreateIndex
CREATE INDEX "ServicioEnCurso_propertyId_idx" ON "ServicioEnCurso"("propertyId");

-- CreateIndex
CREATE INDEX "ServicioEnCurso_organizationId_estado_idx" ON "ServicioEnCurso"("organizationId", "estado");

-- CreateIndex
CREATE INDEX "Evento_servicioEnCursoId_idx" ON "Evento"("servicioEnCursoId");

-- CreateIndex
CREATE INDEX "Visita_servicioEnCursoId_idx" ON "Visita"("servicioEnCursoId");

-- CreateIndex
CREATE INDEX "Oferta_servicioEnCursoId_idx" ON "Oferta"("servicioEnCursoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioSociedad" ADD CONSTRAINT "UsuarioSociedad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioSociedad" ADD CONSTRAINT "UsuarioSociedad_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioEnCurso" ADD CONSTRAINT "ServicioEnCurso_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioEnCurso" ADD CONSTRAINT "ServicioEnCurso_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioEnCurso" ADD CONSTRAINT "ServicioEnCurso_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Etapa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioEnCurso" ADD CONSTRAINT "ServicioEnCurso_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Etapa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_realizadaPorId_fkey" FOREIGN KEY ("realizadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_servicioEnCursoId_fkey" FOREIGN KEY ("servicioEnCursoId") REFERENCES "ServicioEnCurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Etapas iniciales de cada tipo de servicio (después se editan desde el portal).
INSERT INTO "Etapa" ("id", "organizationId", "tipo", "nombre", "orden", "cierraServicio", "propiedadPublicada", "activa", "createdAt", "updatedAt") VALUES
  ('etapa_eval_01_solicitada', 'org_proges', 'EVALUACION', 'Solicitada', 1, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_eval_02_en_evaluacion', 'org_proges', 'EVALUACION', 'En evaluación', 2, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_eval_03_informe_entregado', 'org_proges', 'EVALUACION', 'Informe entregado', 3, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_insp_01_solicitada', 'org_proges', 'INSPECCION', 'Solicitada', 1, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_insp_02_en_gestion', 'org_proges', 'INSPECCION', 'En gestión', 2, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_insp_03_informe_entregado', 'org_proges', 'INSPECCION', 'Informe entregado', 3, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_venta_01_captada', 'org_proges', 'VENTA', 'Captada', 1, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_venta_02_publicada', 'org_proges', 'VENTA', 'Publicada', 2, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_venta_03_con_visitas', 'org_proges', 'VENTA', 'Con visitas', 3, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_venta_04_con_oferta', 'org_proges', 'VENTA', 'Con oferta', 4, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_venta_05_promesa_firmada', 'org_proges', 'VENTA', 'Promesa firmada', 5, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_venta_06_escritura', 'org_proges', 'VENTA', 'Escritura', 6, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_venta_07_inscrita_y_entregada', 'org_proges', 'VENTA', 'Inscrita y entregada', 7, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_arriendo_01_captada', 'org_proges', 'ARRIENDO', 'Captada', 1, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_arriendo_02_publicada', 'org_proges', 'ARRIENDO', 'Publicada', 2, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_arriendo_03_con_visitas', 'org_proges', 'ARRIENDO', 'Con visitas', 3, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_arriendo_04_postulante_en_evaluacion', 'org_proges', 'ARRIENDO', 'Postulante en evaluación', 4, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_arriendo_05_contrato_firmado', 'org_proges', 'ARRIENDO', 'Contrato firmado', 5, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_arriendo_06_entregada_con_inventario', 'org_proges', 'ARRIENDO', 'Entregada con inventario', 6, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_arriendo_07_pasa_a_administracion', 'org_proges', 'ARRIENDO', 'Pasa a administración', 7, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_obra_01_presupuesto_enviado', 'org_proges', 'OBRA', 'Presupuesto enviado', 1, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_obra_02_presupuesto_aprobado', 'org_proges', 'OBRA', 'Presupuesto aprobado', 2, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_obra_03_en_obra', 'org_proges', 'OBRA', 'En obra', 3, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_obra_04_entregada', 'org_proges', 'OBRA', 'Entregada', 4, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_admin_01_activa', 'org_proges', 'ADMINISTRACION', 'Activa', 1, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('etapa_admin_02_terminada', 'org_proges', 'ADMINISTRACION', 'Terminada', 2, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
