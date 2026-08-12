-- AlterTable
ALTER TABLE "solicitudes" ALTER COLUMN "fecha_recepcion" DROP DEFAULT,
ALTER COLUMN "fecha_recepcion" SET DATA TYPE DATE;
