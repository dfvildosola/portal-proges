-- AlterEnum: replace DocumentType values with agreed categories
-- Old values: ESCRITURA, DOMINIO_VIGENTE, INSCRIPCION_CBR, HIPOTECA, NO_EXPROPIACION, SEGURO, CONTRATO, PRESUPUESTO, FOTO, OTRO
-- New values: ESCRITURA_TITULO, CONTRATO, AVALUO_TASACION, LEGAL_JUDICIAL, MUNICIPAL, SEGURO, MANTENCION, CONTRIBUCION, OTRO
-- Document table is empty (no seed), so no row migration is needed.

ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";

CREATE TYPE "DocumentType" AS ENUM (
  'ESCRITURA_TITULO',
  'CONTRATO',
  'AVALUO_TASACION',
  'LEGAL_JUDICIAL',
  'MUNICIPAL',
  'SEGURO',
  'MANTENCION',
  'CONTRIBUCION',
  'OTRO'
);

ALTER TABLE "Document"
  ALTER COLUMN "tipo" TYPE "DocumentType"
  USING "tipo"::text::"DocumentType";

DROP TYPE "DocumentType_old";
