-- AlterTable
ALTER TABLE "escalas" ADD COLUMN     "manifiesto_cerrado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manifiesto_cerrado_en" TIMESTAMP(3),
ADD COLUMN     "manifiesto_cerrado_por" INTEGER;
