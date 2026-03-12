-- CreateEnum
CREATE TYPE "Escuadron" AS ENUM ('ESCUADRON_OPERACIONES_AEREAS', 'ESCUADRON_MATERIAL', 'ESCUADRON_BASE', 'PLANA_MAYOR');

-- CreateEnum
CREATE TYPE "Modulo" AS ENUM ('PERSONAS', 'AERONAVES', 'TIPOS_MISIONES', 'ESCALAS', 'MANIFIESTO', 'SICEM', 'INFORMES', 'INSPECCION_PREVUELO');

-- CreateTable
CREATE TABLE "Persona" (
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

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialGrado" (
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

    CONSTRAINT "HistorialGrado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NivelAcceso" (
    "id" SERIAL NOT NULL,
    "nivel" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "creado_por" INTEGER,
    "editado_por" INTEGER,
    "eliminado_por" INTEGER,

    CONSTRAINT "NivelAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
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

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permiso" (
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

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_nro_documento_key" ON "Persona"("nro_documento");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "NivelAcceso_nivel_key" ON "NivelAcceso"("nivel");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_persona_id_key" ON "Usuario"("persona_id");

-- AddForeignKey
ALTER TABLE "HistorialGrado" ADD CONSTRAINT "HistorialGrado_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "NivelAcceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permiso" ADD CONSTRAINT "Permiso_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "NivelAcceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
