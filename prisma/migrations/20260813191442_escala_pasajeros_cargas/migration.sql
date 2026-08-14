-- CreateTable
CREATE TABLE "escala_pasajeros" (
    "id" SERIAL NOT NULL,
    "escala_id" INTEGER NOT NULL,
    "nro_documento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nacionalidad" TEXT NOT NULL,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "escala_pasajeros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escala_cargas" (
    "id" SERIAL NOT NULL,
    "escala_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "peso" DECIMAL(8,2),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "escala_cargas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escala_pasajeros_escala_id_nro_documento_key" ON "escala_pasajeros"("escala_id", "nro_documento");

-- AddForeignKey
ALTER TABLE "escala_pasajeros" ADD CONSTRAINT "escala_pasajeros_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala_cargas" ADD CONSTRAINT "escala_cargas_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
