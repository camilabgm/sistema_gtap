/*
  Warnings:

  - You are about to drop the column `hab_medica_anio` on the `personas` table. All the data in the column will be lost.
  - You are about to drop the column `hab_medica_periodo` on the `personas` table. All the data in the column will be lost.
  - You are about to drop the column `hab_medica_vence` on the `personas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "personas" DROP COLUMN "hab_medica_anio",
DROP COLUMN "hab_medica_periodo",
DROP COLUMN "hab_medica_vence",
ADD COLUMN     "hab_anual_habilitada" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "habilitaciones_medicas" (
    "id" SERIAL NOT NULL,
    "persona_id" INTEGER NOT NULL,
    "fecha_examen" DATE NOT NULL,
    "periodo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "vence" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,

    CONSTRAINT "habilitaciones_medicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "habilitaciones_medicas_persona_id_periodo_anio_key" ON "habilitaciones_medicas"("persona_id", "periodo", "anio");

-- AddForeignKey
ALTER TABLE "habilitaciones_medicas" ADD CONSTRAINT "habilitaciones_medicas_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
