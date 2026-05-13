-- CreateEnum
CREATE TYPE "ResultadoLogin" AS ENUM ('EXITOSO', 'USUARIO_NO_EXISTE', 'CUENTA_INACTIVA', 'CREDENCIALES_INVALIDAS', 'CUENTA_BLOQUEADA');

-- CreateTable
CREATE TABLE "log_intentos_login" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "resultado" "ResultadoLogin" NOT NULL,
    "ip" TEXT NOT NULL DEFAULT 'desconocida',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_intentos_login_pkey" PRIMARY KEY ("id")
);
