/*
  Warnings:

  - The values [ACCIDENTADA] on the enum `EstadoAeronave` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "MotivoNoDisponible" AS ENUM ('ACCIDENTADA', 'EN_MANTENIMIENTO', 'OTRO');

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoAeronave_new" AS ENUM ('DISPONIBLE', 'NO_DISPONIBLE');
ALTER TABLE "aeronaves" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "aeronaves" ALTER COLUMN "estado" TYPE "EstadoAeronave_new" USING ("estado"::text::"EstadoAeronave_new");
ALTER TYPE "EstadoAeronave" RENAME TO "EstadoAeronave_old";
ALTER TYPE "EstadoAeronave_new" RENAME TO "EstadoAeronave";
DROP TYPE "EstadoAeronave_old";
ALTER TABLE "aeronaves" ALTER COLUMN "estado" SET DEFAULT 'DISPONIBLE';
COMMIT;

-- AlterTable
ALTER TABLE "aeronaves" ADD COLUMN     "motivo_no_disponible" "MotivoNoDisponible",
ADD COLUMN     "motivo_otro" TEXT;
