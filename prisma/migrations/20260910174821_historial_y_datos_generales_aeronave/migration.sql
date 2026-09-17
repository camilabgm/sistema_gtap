-- CreateEnum
CREATE TYPE "MotivoHistorialComponente" AS ENUM ('EDICION_MANUAL', 'RESET_POR_EVENTO');

-- AlterTable
ALTER TABLE "aeronaves" ADD COLUMN     "trackea_ciclos_aterrizajes" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "historial_componentes_mantenimiento" (
    "id" SERIAL NOT NULL,
    "componente_id" INTEGER NOT NULL,
    "horas_acumuladas_minutos" INTEGER NOT NULL,
    "umbral_horas_minutos" INTEGER,
    "fecha_proxima_inspeccion" DATE,
    "motivo" "MotivoHistorialComponente" NOT NULL,
    "evento_mantenimiento_id" INTEGER,
    "registrado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_componentes_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historial_componentes_mantenimiento" ADD CONSTRAINT "historial_componentes_mantenimiento_componente_id_fkey" FOREIGN KEY ("componente_id") REFERENCES "componentes_mantenimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_componentes_mantenimiento" ADD CONSTRAINT "historial_componentes_mantenimiento_evento_mantenimiento_i_fkey" FOREIGN KEY ("evento_mantenimiento_id") REFERENCES "eventos_mantenimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
