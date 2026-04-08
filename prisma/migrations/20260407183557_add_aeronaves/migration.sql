-- CreateEnum
CREATE TYPE "CategoriaAeronave" AS ENUM ('PROPIA', 'INCAUTADA');

-- CreateEnum
CREATE TYPE "EstadoAeronave" AS ENUM ('DISPONIBLE', 'NO_DISPONIBLE');

-- CreateTable
CREATE TABLE "aeronaves" (
    "id" SERIAL NOT NULL,
    "matricula" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "anio_fabricacion" INTEGER NOT NULL,
    "anio_incorporacion" INTEGER NOT NULL,
    "capacidad_pasajeros" INTEGER NOT NULL,
    "tipo_combustible" TEXT NOT NULL,
    "velocidad_crucero" INTEGER,
    "estela_turbulencia" TEXT,
    "color" TEXT,
    "categoria" "CategoriaAeronave" NOT NULL,
    "estado" "EstadoAeronave" NOT NULL DEFAULT 'DISPONIBLE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,

    CONSTRAINT "aeronaves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aeronaves_matricula_key" ON "aeronaves"("matricula");
