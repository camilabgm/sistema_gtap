/*
  Warnings:

  - A unique constraint covering the columns `[nivel_id,modulo]` on the table `permisos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "permisos_nivel_id_modulo_key" ON "permisos"("nivel_id", "modulo");
