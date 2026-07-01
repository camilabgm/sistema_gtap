/*
  Warnings:

  - You are about to drop the column `autorizador_id` on the `escala_autorizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `escala_autorizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_resolucion` on the `escala_autorizaciones` table. All the data in the column will be lost.
  - You are about to drop the column `orden_cascada` on the `escala_autorizaciones` table. All the data in the column will be lost.
  - Added the required column `motivo_escalamiento` to the `escala_autorizaciones` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MotivoEscalamiento" AS ENUM ('INICIAL', 'EN_VUELO', 'PARTE_DIARIO', 'DERIVACION_MANUAL');

-- CreateEnum
CREATE TYPE "MotivoNoDisponibleAutorizador" AS ENUM ('TAREA_ADMINISTRATIVA', 'FUERA_DE_LA_UNIDAD', 'OTRO');

-- AlterTable
ALTER TABLE "escala_autorizaciones" DROP COLUMN "autorizador_id",
DROP COLUMN "estado",
DROP COLUMN "fecha_resolucion",
DROP COLUMN "orden_cascada",
ADD COLUMN     "autorizo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fecha_paso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "motivo_escalamiento" "MotivoEscalamiento" NOT NULL,
ADD COLUMN     "persona_id" INTEGER;

-- AlterTable
ALTER TABLE "escalas" ADD COLUMN     "autorizada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autorizada_por" INTEGER,
ADD COLUMN     "fecha_autorizacion" TIMESTAMP(3),
ADD COLUMN     "rol_autoriza" "RolAutorizador";

-- DropEnum
DROP TYPE "EstadoAutorizacion";

-- CreateTable
CREATE TABLE "autorizador_no_disponible" (
    "id" SERIAL NOT NULL,
    "persona_id" INTEGER NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),
    "motivo" "MotivoNoDisponibleAutorizador" NOT NULL DEFAULT 'TAREA_ADMINISTRATIVA',
    "motivo_detalle" TEXT,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "autorizador_no_disponible_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "autorizador_no_disponible" ADD CONSTRAINT "autorizador_no_disponible_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
