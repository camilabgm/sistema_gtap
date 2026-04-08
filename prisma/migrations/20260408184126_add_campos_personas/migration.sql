-- CreateEnum
CREATE TYPE "EspecialidadPersona" AS ENUM ('PILOTO', 'COPILOTO', 'TECNICO_DE_VUELO', 'MECANICO', 'ADMINISTRATIVO', 'OTRO');

-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "especialidad" "EspecialidadPersona",
ADD COLUMN     "fecha_nacimiento" TIMESTAMP(3),
ADD COLUMN     "hab_medica_vence" TIMESTAMP(3),
ADD COLUMN     "nivel_operacional" TEXT,
ADD COLUMN     "nivel_operacional_vence" TIMESTAMP(3),
ADD COLUMN     "nro_pasaporte" TEXT;
