-- AlterTable
ALTER TABLE "Tarea" ADD COLUMN     "esRevision" BOOLEAN NOT NULL DEFAULT false;

-- Las tareas de revisión que ya existen se reconocían por su texto: se marcan ahora.
UPDATE "Tarea" SET "esRevision" = true WHERE "que" LIKE 'Revisar y repartir%';
