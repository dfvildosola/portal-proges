-- 1) Columnas nuevas (plazoMeses parte nullable para poder llenarla).
ALTER TABLE "LeaseContract"
  ADD COLUMN "renovacionAutomatica" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "diasAviso" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "plazoMeses" INTEGER,
  ADD COLUMN "fechaSalida" TIMESTAMP(3),
  ADD COLUMN "garantia" DECIMAL(14,2),
  ADD COLUMN "ultimoReajuste" TIMESTAMP(3);

-- 2) Traspaso de datos desde el estado guardado.
UPDATE "LeaseContract" SET "fechaSalida" = "fechaTermino" WHERE "estado" IN ('TERMINADO', 'RENOVADO');
UPDATE "LeaseContract" SET "renovacionAutomatica" = false WHERE "estado" = 'VENCIDO';
UPDATE "LeaseContract"
  SET "plazoMeses" = GREATEST(1, ROUND(("fechaTermino"::date - "fechaInicio"::date) / 30.4375)::int);
UPDATE "LeaseContract" SET "reajusteFrecuenciaMeses" = 12
  WHERE "aplicaReajuste" = true AND "reajusteFrecuenciaMeses" IS NULL;

-- 3) Cierre de columnas y tipos.
ALTER TABLE "LeaseContract" ALTER COLUMN "plazoMeses" SET NOT NULL;
ALTER TABLE "LeaseContract" DROP COLUMN "estado";
DROP TYPE "ContractStatus";

-- 4) Nuevos tipos de aviso (todavía sin uso).
ALTER TYPE "AlertType" ADD VALUE 'AVISO_NO_RENOVACION';
ALTER TYPE "AlertType" ADD VALUE 'REAJUSTE_PENDIENTE';
ALTER TYPE "AlertType" ADD VALUE 'CONTRATO_VENCIDO';
