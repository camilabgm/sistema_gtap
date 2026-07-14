/*
  Warnings:

  - You are about to drop the column `especialidad` on the `personas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "personas" DROP COLUMN "especialidad",
ADD COLUMN     "especialidades" "EspecialidadPersona"[] DEFAULT ARRAY[]::"EspecialidadPersona"[];
