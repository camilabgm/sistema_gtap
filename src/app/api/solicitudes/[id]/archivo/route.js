// src/app/api/solicitudes/[id]/archivo/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { leerArchivoSolicitud } from "@/lib/almacenamiento"
import path from "path"

// Esta ruta usa el sistema de archivos, así que debe correr en Node.js
// (no en el runtime Edge).
export const runtime = "nodejs"

const MIME_POR_EXTENSION = {
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf":  "application/pdf",
  ".doc":  "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

export const GET = conPermiso("ESCALAS", "puede_ver", async (request, context, session) => {
  const { id } = await context.params
  const solicitudId = parseInt(id, 10)
  if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
    return NextResponse.json({ error: "Id de solicitud inválido" }, { status: 400 })
  }

  const solicitud = await prisma.solicitud.findFirst({
    where: { id: solicitudId, deleted_at: null },
    select: { archivo: true, nombre_archivo_original: true },
  })

  if (!solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
  }
  if (!solicitud.archivo) {
    return NextResponse.json(
      { error: "Esta solicitud no tiene archivo adjunto" },
      { status: 404 }
    )
  }

  const contenido = await leerArchivoSolicitud(solicitud.archivo)
  if (!contenido) {
    return NextResponse.json(
      { error: "El archivo no se encuentra en el servidor" },
      { status: 404 }
    )
  }

  const extension = path.extname(solicitud.archivo).toLowerCase()
  const mime = MIME_POR_EXTENSION[extension] || "application/octet-stream"
  const nombre = solicitud.nombre_archivo_original || `solicitud-${solicitudId}${extension}`

  return new NextResponse(contenido, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "Content-Length": String(contenido.length),
    },
  })
})