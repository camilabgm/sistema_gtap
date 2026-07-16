-- AlterEnum
ALTER TYPE "EstadoEscala" ADD VALUE 'RECHAZADA';

-- AlterTable
ALTER TABLE "escalas" ADD COLUMN     "fecha_rechazo" TIMESTAMP(3),
ADD COLUMN     "motivo_rechazo" TEXT,
ADD COLUMN     "rechazada_por" INTEGER;
