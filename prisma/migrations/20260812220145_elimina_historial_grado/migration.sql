/*
  Warnings:

  - You are about to drop the `historial_grados` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "historial_grados" DROP CONSTRAINT "historial_grados_persona_id_fkey";

-- DropTable
DROP TABLE "historial_grados";
