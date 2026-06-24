// src/app/api/solicitudes/[id]/archivo/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
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

// GET /api/solicitudes/<id>/archivo
export async function GET(request, { params }) {
  try {
    // 1. Sesión
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // 2. Permiso de VER en el módulo ESCALAS
    if (!session.user.permisos?.ESCALAS?.puede_ver) {
      return NextResponse.json(
        { error: "No tenés permiso para ver este archivo" },
        { status: 403 }
      )
    }

    // 3. Id de la solicitud (en Next.js 15 los params se esperan con await)
    const { id } = await params
    const solicitudId = parseInt(id, 10)
    if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
      return NextResponse.json({ error: "Id de solicitud inválido" }, { status: 400 })
    }

    // 4. Buscar la solicitud. La ruta del archivo sale de la base, NUNCA del
    //    cliente: el cliente solo nos dio el id.
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

    // 5. Leer el archivo del disco
    const contenido = await leerArchivoSolicitud(solicitud.archivo)
    if (!contenido) {
      return NextResponse.json(
        { error: "El archivo no se encuentra en el servidor" },
        { status: 404 }
      )
    }

    // 6. Responder con el tipo correcto y el nombre original
    const extension = path.extname(solicitud.archivo).toLowerCase()
    const mime = MIME_POR_EXTENSION[extension] || "application/octet-stream"
    const nombre = solicitud.nombre_archivo_original || `solicitud-${solicitudId}${extension}`

    return new NextResponse(contenido, {
      status: 200,
      headers: {
        "Content-Type": mime,
        // "inline" deja que el navegador previsualice PDF e imágenes;
        // filename*=UTF-8'' soporta acentos en el nombre.
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        "Content-Length": String(contenido.length),
      },
    })
  } catch (error) {
    console.error("Error GET archivo solicitud:", error)
    return NextResponse.json(
      { error: "Error interno al obtener el archivo" },
      { status: 500 }
    )
  }
}