-- CreateTable
CREATE TABLE "cargos_autorizacion" (
    "id" SERIAL NOT NULL,
    "rol_autorizador" "RolAutorizador" NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cargos_autorizacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cargos_autorizacion" ADD CONSTRAINT "cargos_autorizacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
