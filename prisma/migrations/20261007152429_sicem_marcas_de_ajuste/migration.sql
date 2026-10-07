-- AlterTable
ALTER TABLE "aeronaves" ADD COLUMN     "horas_totales_ajustadas_en" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "historial_componentes_mantenimiento" ADD COLUMN     "cambiaron_horas" BOOLEAN NOT NULL DEFAULT true;
