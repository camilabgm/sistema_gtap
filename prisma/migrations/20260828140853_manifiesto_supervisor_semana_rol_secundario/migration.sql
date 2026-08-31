-- AlterTable
ALTER TABLE "escalas" ADD COLUMN     "manifiesto_creado_en" TIMESTAMP(3),
ADD COLUMN     "manifiesto_creado_por" INTEGER,
ADD COLUMN     "manifiesto_sin_carga" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manifiesto_sin_pasajeros" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "rol_secundario_asignado_por" INTEGER,
ADD COLUMN     "rol_secundario_combina" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rol_secundario_desde" TIMESTAMP(3),
ADD COLUMN     "rol_secundario_id" INTEGER;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_secundario_id_fkey" FOREIGN KEY ("rol_secundario_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
