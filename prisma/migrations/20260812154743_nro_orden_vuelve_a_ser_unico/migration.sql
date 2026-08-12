/*
  Warnings:

  - A unique constraint covering the columns `[nro_orden]` on the table `escalas` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "escalas_nro_orden_key" ON "escalas"("nro_orden");
