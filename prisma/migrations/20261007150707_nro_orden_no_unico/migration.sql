-- DropIndex
DROP INDEX "escalas_nro_orden_key";

-- CreateIndex
CREATE INDEX "escalas_nro_orden_idx" ON "escalas"("nro_orden");
