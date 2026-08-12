-- AlterEnum
ALTER TYPE "MotivoEscalamiento" ADD VALUE 'CUENTA_INACTIVA';

-- AlterTable
ALTER TABLE "escala_autorizaciones" ADD COLUMN     "orden" INTEGER;

-- AlterTable
ALTER TABLE "escalas" ADD COLUMN     "orden_autorizante" INTEGER;
