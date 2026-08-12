-- DropIndex
DROP INDEX "escalas_nro_orden_key";

-- AlterTable
ALTER TABLE "escalas" ALTER COLUMN "fecha" DROP NOT NULL;
