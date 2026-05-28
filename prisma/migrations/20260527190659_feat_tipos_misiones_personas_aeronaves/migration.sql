/*
  Warnings:

  - You are about to drop the column `categoria` on the `tipos_misiones` table. All the data in the column will be lost.
  - Added the required column `clasificacion` to the `tipos_misiones` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ClasificacionMision" AS ENUM ('OPERACIONAL', 'TIPO_VUELO', 'LOGISTICA');

-- AlterEnum
ALTER TYPE "EstadoAeronave" ADD VALUE 'ACCIDENTADA';

-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "hab_medica_anio" INTEGER,
ADD COLUMN     "hab_medica_periodo" TEXT,
ADD COLUMN     "nivel_operacional_aprobado_por" INTEGER,
ADD COLUMN     "nivel_operacional_fecha" TIMESTAMP(3),
ADD COLUMN     "nivel_operacional_habilitado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tipos_misiones" DROP COLUMN "categoria",
ADD COLUMN     "clasificacion" "ClasificacionMision" NOT NULL,
ADD COLUMN     "subtipo" TEXT,
ADD COLUMN     "tiene_subtipo" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "CategoriaMision";

-- CreateTable
CREATE TABLE "parte_diario" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "persona_id" INTEGER NOT NULL,
    "observacion" TEXT,
    "creado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "eliminado_por" INTEGER,

    CONSTRAINT "parte_diario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parte_diario_fecha_persona_id_key" ON "parte_diario"("fecha", "persona_id");

-- AddForeignKey
ALTER TABLE "parte_diario" ADD CONSTRAINT "parte_diario_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
