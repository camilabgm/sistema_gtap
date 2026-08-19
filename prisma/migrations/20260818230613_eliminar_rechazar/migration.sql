/*
  Warnings:

  - The values [RECHAZADA] on the enum `EstadoEscala` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `fecha_rechazo` on the `escalas` table. All the data in the column will be lost.
  - You are about to drop the column `motivo_rechazo` on the `escalas` table. All the data in the column will be lost.
  - You are about to drop the column `rechazada_por` on the `escalas` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EstadoEscala_new" AS ENUM ('PROGRAMADA', 'EN_DESARROLLO', 'CUMPLIDA', 'ABORTADA');
ALTER TABLE "escalas" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "escalas" ALTER COLUMN "estado" TYPE "EstadoEscala_new" USING ("estado"::text::"EstadoEscala_new");
ALTER TYPE "EstadoEscala" RENAME TO "EstadoEscala_old";
ALTER TYPE "EstadoEscala_new" RENAME TO "EstadoEscala";
DROP TYPE "EstadoEscala_old";
ALTER TABLE "escalas" ALTER COLUMN "estado" SET DEFAULT 'PROGRAMADA';
COMMIT;

-- AlterTable
ALTER TABLE "escalas" DROP COLUMN "fecha_rechazo",
DROP COLUMN "motivo_rechazo",
DROP COLUMN "rechazada_por";
