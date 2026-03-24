/*
  Warnings:

  - You are about to drop the `HistorialGrado` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NivelAcceso` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Permiso` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Persona` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Rol` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Usuario` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CategoriaMision" AS ENUM ('MILITAR', 'INSTITUCIONAL');

-- DropForeignKey
ALTER TABLE "HistorialGrado" DROP CONSTRAINT "HistorialGrado_persona_id_fkey";

-- DropForeignKey
ALTER TABLE "Permiso" DROP CONSTRAINT "Permiso_nivel_id_fkey";

-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_nivel_id_fkey";

-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_persona_id_fkey";

-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_rol_id_fkey";

-- DropTable
DROP TABLE "HistorialGrado";

-- DropTable
DROP TABLE "NivelAcceso";

-- DropTable
DROP TABLE "Permiso";

-- DropTable
DROP TABLE "Persona";

-- DropTable
DROP TABLE "Rol";

-- DropTable
DROP TABLE "Usuario";

-- CreateTable
CREATE TABLE "personas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "grado" TEXT NOT NULL,
    "nro_documento" TEXT NOT NULL,
    "escuadron" "Escuadron" NOT NULL,
    "unidad" TEXT NOT NULL,
    "residencia" TEXT,
    "telefono" TEXT,
    "contacto_emergencia" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_grados" (
    "id" SERIAL NOT NULL,
    "grado" TEXT NOT NULL,
    "fecha_desde" TIMESTAMP(3) NOT NULL,
    "fecha_hasta" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "persona_id" INTEGER NOT NULL,

    CONSTRAINT "historial_grados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveles_acceso" (
    "id" SERIAL NOT NULL,
    "nivel" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,

    CONSTRAINT "niveles_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "persona_id" INTEGER NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "nivel_id" INTEGER NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" SERIAL NOT NULL,
    "modulo" "Modulo" NOT NULL,
    "puede_ver" BOOLEAN NOT NULL DEFAULT false,
    "puede_crear" BOOLEAN NOT NULL DEFAULT false,
    "puede_editar" BOOLEAN NOT NULL DEFAULT false,
    "puede_eliminar" BOOLEAN NOT NULL DEFAULT false,
    "puede_reportes" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "nivel_id" INTEGER NOT NULL,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_misiones" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaMision" NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,

    CONSTRAINT "tipos_misiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personas_nro_documento_key" ON "personas"("nro_documento");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "niveles_acceso_nivel_key" ON "niveles_acceso"("nivel");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_persona_id_key" ON "usuarios"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_misiones_codigo_key" ON "tipos_misiones"("codigo");

-- AddForeignKey
ALTER TABLE "historial_grados" ADD CONSTRAINT "historial_grados_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "niveles_acceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos" ADD CONSTRAINT "permisos_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "niveles_acceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
