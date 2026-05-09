/*
  Warnings:

  - You are about to drop the column `nivel_id` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the `niveles_acceso` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permisos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "permisos" DROP CONSTRAINT "permisos_nivel_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_nivel_id_fkey";

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "nivel_id",
ADD COLUMN     "sesion_invalidada_en" TIMESTAMP(3);

-- DropTable
DROP TABLE "niveles_acceso";

-- DropTable
DROP TABLE "permisos";

-- CreateTable
CREATE TABLE "permisos_rol" (
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
    "rol_id" INTEGER NOT NULL,

    CONSTRAINT "permisos_rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos_usuario" (
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
    "usuario_id" INTEGER NOT NULL,

    CONSTRAINT "permisos_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permisos_rol_rol_id_modulo_key" ON "permisos_rol"("rol_id", "modulo");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_usuario_usuario_id_modulo_key" ON "permisos_usuario"("usuario_id", "modulo");

-- AddForeignKey
ALTER TABLE "permisos_rol" ADD CONSTRAINT "permisos_rol_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_usuario" ADD CONSTRAINT "permisos_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
