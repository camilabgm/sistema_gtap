-- CreateEnum
CREATE TYPE "TipoComponente" AS ENUM ('MOTOR', 'HELICE', 'APU');

-- CreateEnum
CREATE TYPE "TipoEventoMantenimiento" AS ENUM ('PROGRAMADO', 'NO_PROGRAMADO', 'CALENDARIO');

-- CreateEnum
CREATE TYPE "LugarMantenimiento" AS ENUM ('INTERNO', 'TERCERIZADO');

-- AlterTable
ALTER TABLE "aeronaves" ADD COLUMN     "aterrizajes_acumulados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ciclos_acumulados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "horas_vuelo_totales_minutos" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "componentes_mantenimiento" (
    "id" SERIAL NOT NULL,
    "aeronave_id" INTEGER NOT NULL,
    "tipo" "TipoComponente" NOT NULL,
    "horas_acumuladas_minutos" INTEGER NOT NULL DEFAULT 0,
    "umbral_horas_minutos" INTEGER,
    "fecha_proxima_inspeccion" DATE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "componentes_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_mantenimiento" (
    "id" SERIAL NOT NULL,
    "aeronave_id" INTEGER NOT NULL,
    "componente_id" INTEGER,
    "tipo" "TipoEventoMantenimiento" NOT NULL,
    "lugar" "LugarMantenimiento",
    "es_cambio_componente" BOOLEAN NOT NULL DEFAULT false,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "cerrado_por" INTEGER,
    "cerrado_en" TIMESTAMP(3),
    "observacion" TEXT,
    "post_vuelo_id" INTEGER,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "eventos_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "componentes_mantenimiento_aeronave_id_tipo_key" ON "componentes_mantenimiento"("aeronave_id", "tipo");

-- AddForeignKey
ALTER TABLE "componentes_mantenimiento" ADD CONSTRAINT "componentes_mantenimiento_aeronave_id_fkey" FOREIGN KEY ("aeronave_id") REFERENCES "aeronaves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_mantenimiento" ADD CONSTRAINT "eventos_mantenimiento_aeronave_id_fkey" FOREIGN KEY ("aeronave_id") REFERENCES "aeronaves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_mantenimiento" ADD CONSTRAINT "eventos_mantenimiento_componente_id_fkey" FOREIGN KEY ("componente_id") REFERENCES "componentes_mantenimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_mantenimiento" ADD CONSTRAINT "eventos_mantenimiento_post_vuelo_id_fkey" FOREIGN KEY ("post_vuelo_id") REFERENCES "post_vuelos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
