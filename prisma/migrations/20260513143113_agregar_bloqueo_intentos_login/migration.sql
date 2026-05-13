-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "bloqueado_hasta" TIMESTAMP(3),
ADD COLUMN     "intentos_fallidos" INTEGER NOT NULL DEFAULT 0;
