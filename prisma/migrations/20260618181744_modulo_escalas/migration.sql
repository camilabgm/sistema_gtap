-- CreateEnum
CREATE TYPE "EstadoEscala" AS ENUM ('PROGRAMADA', 'EN_DESARROLLO', 'CUMPLIDA', 'ABORTADA');

-- CreateEnum
CREATE TYPE "MotivoAbortada" AS ENUM ('ADOS', 'ADFM', 'ADCA', 'ADCM', 'ADTI', 'ADCP');

-- CreateEnum
CREATE TYPE "CanalSolicitud" AS ENUM ('WHATSAPP', 'PDF', 'IMAGEN', 'WORD', 'VERBAL');

-- CreateEnum
CREATE TYPE "RolEnVuelo" AS ENUM ('PILOTO', 'COPILOTO', 'TECNICO_DE_VUELO');

-- CreateEnum
CREATE TYPE "RolAutorizador" AS ENUM ('COMANDANTE', 'JEFE_OPERACIONES', 'CMDTE_ESC_AEREO', 'CMDTE_ESC_MANTENIMIENTO', 'JEFE_PERSONAL');

-- CreateEnum
CREATE TYPE "EstadoAutorizacion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "RolAcuse" AS ENUM ('PILOTO', 'COPILOTO', 'TECNICO_DE_VUELO', 'SUPERVISOR_SEMANA');

-- CreateEnum
CREATE TYPE "Novedad" AS ENUM ('SIN_NOVEDAD', 'INCIDENTE', 'ACCIDENTE');

-- CreateTable
CREATE TABLE "escalas" (
    "id" SERIAL NOT NULL,
    "nro_orden" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_despegue_estimada" TIMESTAMP(3),
    "hora_arribo_estimada" TIMESTAMP(3),
    "hora_real_salida" TIMESTAMP(3),
    "hora_real_arribo" TIMESTAMP(3),
    "solicitante" TEXT NOT NULL,
    "observaciones" TEXT,
    "estado" "EstadoEscala" NOT NULL DEFAULT 'PROGRAMADA',
    "motivo_abortada" "MotivoAbortada",
    "observacion_aborto" TEXT,
    "es_borrador" BOOLEAN NOT NULL DEFAULT true,
    "aeronave_id" INTEGER,
    "tipo_mision_id" INTEGER,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "escalas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escala_itinerarios" (
    "id" SERIAL NOT NULL,
    "escala_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "origen" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "hora_estimada_salida" TIMESTAMP(3),
    "hora_estimada_llegada" TIMESTAMP(3),
    "hora_real_salida" TIMESTAMP(3),
    "hora_real_llegada" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "escala_itinerarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escala_tripulacion" (
    "id" SERIAL NOT NULL,
    "escala_id" INTEGER NOT NULL,
    "persona_id" INTEGER NOT NULL,
    "rol_en_vuelo" "RolEnVuelo" NOT NULL,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "escala_tripulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes" (
    "id" SERIAL NOT NULL,
    "escala_id" INTEGER NOT NULL,
    "canal" "CanalSolicitud" NOT NULL,
    "archivo" TEXT,
    "nombre_archivo_original" TEXT,
    "recibido_por" INTEGER,
    "fecha_recepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escala_autorizaciones" (
    "id" SERIAL NOT NULL,
    "escala_id" INTEGER NOT NULL,
    "orden_cascada" INTEGER NOT NULL,
    "rol_autorizador" "RolAutorizador" NOT NULL,
    "autorizador_id" INTEGER,
    "estado" "EstadoAutorizacion" NOT NULL DEFAULT 'PENDIENTE',
    "comentario" TEXT,
    "fecha_resolucion" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "escala_autorizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acuses_recibo" (
    "id" SERIAL NOT NULL,
    "escala_id" INTEGER NOT NULL,
    "persona_id" INTEGER NOT NULL,
    "rol" "RolAcuse" NOT NULL,
    "fecha_acuse" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "acuses_recibo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_vuelos" (
    "id" SERIAL NOT NULL,
    "escala_id" INTEGER NOT NULL,
    "minutos_volados" INTEGER NOT NULL,
    "combustible_consumido" DECIMAL(8,2),
    "novedad" "Novedad" NOT NULL DEFAULT 'SIN_NOVEDAD',
    "detalle_novedad" TEXT,
    "cargado_por" INTEGER,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "post_vuelos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escalas_nro_orden_key" ON "escalas"("nro_orden");

-- CreateIndex
CREATE UNIQUE INDEX "escala_tripulacion_escala_id_persona_id_key" ON "escala_tripulacion"("escala_id", "persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "acuses_recibo_escala_id_persona_id_rol_key" ON "acuses_recibo"("escala_id", "persona_id", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "post_vuelos_escala_id_key" ON "post_vuelos"("escala_id");

-- AddForeignKey
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_aeronave_id_fkey" FOREIGN KEY ("aeronave_id") REFERENCES "aeronaves"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_tipo_mision_id_fkey" FOREIGN KEY ("tipo_mision_id") REFERENCES "tipos_misiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala_itinerarios" ADD CONSTRAINT "escala_itinerarios_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala_tripulacion" ADD CONSTRAINT "escala_tripulacion_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala_tripulacion" ADD CONSTRAINT "escala_tripulacion_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala_autorizaciones" ADD CONSTRAINT "escala_autorizaciones_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acuses_recibo" ADD CONSTRAINT "acuses_recibo_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acuses_recibo" ADD CONSTRAINT "acuses_recibo_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_vuelos" ADD CONSTRAINT "post_vuelos_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
