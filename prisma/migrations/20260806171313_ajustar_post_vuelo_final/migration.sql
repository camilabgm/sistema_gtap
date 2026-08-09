/*
  Warnings:

  - You are about to drop the column `cargado_por` on the `post_vuelos` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_registro` on the `post_vuelos` table. All the data in the column will be lost.
  - You are about to drop the column `minutos_volados` on the `post_vuelos` table. All the data in the column will be lost.
  - Added the required column `aterrizajes` to the `post_vuelos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destino_real` to the `post_vuelos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `horas_tierra_minutos` to the `post_vuelos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `horas_vuelo_minutos` to the `post_vuelos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_minutos` to the `post_vuelos` table without a default value. This is not possible if the table is not empty.
  - Made the column `creado_por` on table `post_vuelos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "post_vuelos" DROP COLUMN "cargado_por",
DROP COLUMN "fecha_registro",
DROP COLUMN "minutos_volados",
ADD COLUMN     "aterrizajes" INTEGER NOT NULL,
ADD COLUMN     "destino_real" TEXT NOT NULL,
ADD COLUMN     "horas_tierra_minutos" INTEGER NOT NULL,
ADD COLUMN     "horas_vuelo_minutos" INTEGER NOT NULL,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "pasajeros" INTEGER,
ADD COLUMN     "total_minutos" INTEGER NOT NULL,
ALTER COLUMN "creado_por" SET NOT NULL;
