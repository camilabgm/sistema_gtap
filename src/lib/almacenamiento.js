// src/lib/almacenamiento.js
// Helper del lado del servidor para guardar, borrar y leer los archivos de
// las solicitudes de escala. NO importar en componentes de cliente.

import { randomUUID } from "crypto"
import { writeFile, mkdir, unlink, readFile } from "fs/promises"
import path from "path"

// Extensión permitida => tipo(s) MIME esperado(s)
const TIPOS_PERMITIDOS = {
  ".png":  ["image/png"],
  ".jpg":  ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".pdf":  ["application/pdf"],
  ".doc":  ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
}

const TAMANO_MAXIMO = 25 * 1024 * 1024 // 25 MB, en bytes

// Lee la carpeta base desde la variable de entorno.
// En desarrollo (Windows): RUTA_ARCHIVOS=C:/gtap/archivos
// En el servidor (Ubuntu): RUTA_ARCHIVOS=/var/gtap/archivos
function rutaBase() {
  const base = process.env.RUTA_ARCHIVOS
  if (!base) {
    throw new Error("Falta la variable de entorno RUTA_ARCHIVOS")
  }
  return base
}

/**
 * Guarda el archivo de una solicitud en disco.
 * @param {File} archivo  - el archivo recibido en el formulario
 * @param {number} escalaId - id de la escala a la que pertenece
 * @returns {{ rutaRelativa: string, nombreOriginal: string }}
 */
export async function guardarArchivoSolicitud(archivo, escalaId) {
  // 1. Validar que llegó un archivo usable
  if (!archivo || typeof archivo.arrayBuffer !== "function") {
    throw new Error("No se recibió un archivo válido")
  }

  // 2. Validar el id de la escala (evita carpetas con nombres raros)
  const idEscala = parseInt(escalaId, 10)
  if (!Number.isInteger(idEscala) || idEscala <= 0) {
    throw new Error("El id de la escala no es válido")
  }

  // 3. Validar tamaño
  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error("El archivo supera el máximo de 25 MB")
  }

  // 4. Validar extensión y que el tipo declarado coincida
  const extension = path.extname(archivo.name || "").toLowerCase()
  const mimesEsperados = TIPOS_PERMITIDOS[extension]
  if (!mimesEsperados) {
    throw new Error("Tipo de archivo no permitido. Solo PNG, JPG, PDF, DOC o DOCX")
  }
  if (archivo.type && !mimesEsperados.includes(archivo.type)) {
    throw new Error("El contenido del archivo no coincide con su extensión")
  }

  // 5. Nombre único propio (descartamos el original para guardar) y
  //    carpeta agrupada por escala: solicitudes/<id_escala>/<uuid>.<ext>
  const nombreUnico = `${randomUUID()}${extension}`
  const rutaRelativa = path.join("solicitudes", String(idEscala), nombreUnico)
  const rutaCompleta = path.join(rutaBase(), rutaRelativa)

  // 6. Crear la carpeta si no existe y escribir el archivo
  await mkdir(path.dirname(rutaCompleta), { recursive: true })
  const bytes = Buffer.from(await archivo.arrayBuffer())
  await writeFile(rutaCompleta, bytes)

  // Guardamos la ruta con barras normales (/) para que el valor sea
  // igual en Windows y en Linux.
  return {
    rutaRelativa: rutaRelativa.split(path.sep).join("/"),
    nombreOriginal: archivo.name || nombreUnico,
  }
}

/**
 * Borra físicamente un archivo de solicitud del disco.
 * Se usa para limpieza; el soft-delete del registro lo maneja la base.
 * @param {string} rutaRelativa - la ruta guardada en la columna `archivo`
 */
export async function borrarArchivoSolicitud(rutaRelativa) {
  if (!rutaRelativa) return

  const rutaCompleta = rutaAbsolutaSegura(rutaRelativa)

  try {
    await unlink(rutaCompleta)
  } catch (err) {
    // Si el archivo ya no existe, no es un error que deba frenar nada
    if (err.code !== "ENOENT") throw err
  }
}

/**
 * Lee un archivo de solicitud del disco.
 * @param {string} rutaRelativa - la ruta guardada en la columna `archivo`
 * @returns {Buffer|null} el contenido, o null si no hay ruta o el archivo no está
 */
export async function leerArchivoSolicitud(rutaRelativa) {
  if (!rutaRelativa) return null

  const rutaCompleta = rutaAbsolutaSegura(rutaRelativa)

  try {
    return await readFile(rutaCompleta)
  } catch (err) {
    if (err.code === "ENOENT") return null // el archivo no está en el disco
    throw err
  }
}

// Arma la ruta absoluta a partir de la relativa y se asegura de que NO se
// salga de la carpeta base (defensa contra rutas manipuladas tipo "../").
function rutaAbsolutaSegura(rutaRelativa) {
  const base = path.resolve(rutaBase())
  const partes = rutaRelativa.split("/")
  const completa = path.resolve(base, ...partes)

  if (completa !== base && !completa.startsWith(base + path.sep)) {
    throw new Error("Ruta de archivo inválida")
  }
  return completa
}