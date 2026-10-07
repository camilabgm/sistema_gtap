DELETE FROM "escala_itinerarios" a
USING "escala_itinerarios" b
WHERE a."escala_id" = b."escala_id"
  AND a."orden" = b."orden"
  AND a."id" < b."id";

-- CreateIndex
CREATE UNIQUE INDEX "escala_itinerarios_escala_id_orden_key" ON "escala_itinerarios"("escala_id", "orden");