/*
  Warnings:

  - You are about to drop the column `hora_real_arribo` on the `escalas` table. All the data in the column will be lost.
  - You are about to drop the column `hora_real_salida` on the `escalas` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "post_vuelos_escala_id_key";

-- AlterTable
ALTER TABLE "escalas" DROP COLUMN "hora_real_arribo",
DROP COLUMN "hora_real_salida";
