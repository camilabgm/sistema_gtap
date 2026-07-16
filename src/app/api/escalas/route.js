// Destino: src/app/api/escalas/route.js

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { guardarArchivoSolicitud, borrarArchivoSolicitud } from "@/lib/almacenamiento"

const CANALES_VALIDOS = ["WHATSAPP", "PDF", "IMAGEN", "WORD", "VERBAL"]

function validarDatosSolicitud({ solicitante, fecha, canal, hayArchivo }) {
  if (!solicitante || !`${solicitante}`.trim()) return "El solicitante es obligatorio"
  if (!fecha) return "La fecha es obligatoria"
  if (isNaN(new Date(fecha).getTime())) return "La fecha no es válida"
  if (!canal) return "El canal es obligatorio"
  if (!CANALES_VALIDOS.includes(canal)) return "El canal no es válido"
  if (canal !== "VERBAL" && !hayArchivo) {
    return "Debe adjuntar el archivo de la solicitud (salvo que el canal sea VERBAL)"
  }
  return null
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.permisos?.ESCALAS?.puede_ver) {
      return NextResponse.json({ error: "No tenés permiso para ver escalas" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")

    const where = { deleted_at: null }
    if (desde && hasta) {
      const fechaDesde = new Date(desde)
      const fechaHasta = new Date(hasta)
      if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime())) {
        return NextResponse.json({ error: "Fechas de filtro inválidas" }, { status: 400 })
      }
      where.fecha = { gte: fechaDesde, lte: fechaHasta }
      where.es_borrador = false
    }

    const escalas = await prisma.escala.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { hora_despegue_estimada: "asc" }],
      select: {
        id: true,
        nro_orden: true,
        fecha: true,
        hora_despegue_estimada: true,
        hora_arribo_estimada: true,
        solicitante: true,
        estado: true,
        es_borrador: true,
        motivo_abortada: true,
        observacion_aborto: true,
        aeronave: { select: { matricula: true } },
        tipo_mision: { select: { codigo: true, nombre: true } },
        itinerarios: {
          where: { deleted_at: null },
          orderBy: { orden: "asc" },
          select: { orden: true, origen: true, destino: true },
        },
        tripulacion: {
          where: { deleted_at: null },
          select: {
            rol_en_vuelo: true,
            persona: { select: { grado: true, apellido: true } },
          },
        },
      },
    })

    return NextResponse.json(escalas)
  } catch (error) {
    console.error("Error GET escalas:", error)
    return NextResponse.json({ error: "Error interno al listar las escalas" }, { status: 500 })
  }
}

export async function POST(request) {
  let escalaCreada = null
  let rutaGuardada = null

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.permisos?.ESCALAS?.puede_crear) {
      return NextResponse.json({ error: "No tenés permiso para crear escalas" }, { status: 403 })
    }

    const formData = await request.formData()
    const solicitante   = formData.get("solicitante")
    const fecha         = formData.get("fecha")
    const canal         = formData.get("canal")
    const observaciones = formData.get("observaciones")
    const archivo       = formData.get("archivo")

    const hayArchivo =
      archivo && typeof archivo.arrayBuffer === "function" && archivo.size > 0

    const errorValidacion = validarDatosSolicitud({ solicitante, fecha, canal, hayArchivo })
    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 400 })
    }

    escalaCreada = await prisma.escala.create({
      data: {
        fecha: new Date(fecha),
        solicitante: solicitante.trim(),
        observaciones: observaciones ? `${observaciones}`.trim() : null,
        es_borrador: true,
        creado_por: session.user.id,
      },
    })

    let nombreOriginal = null
    if (hayArchivo) {
      try {
        const resultado = await guardarArchivoSolicitud(archivo, escalaCreada.id)
        rutaGuardada = resultado.rutaRelativa
        nombreOriginal = resultado.nombreOriginal
      } catch (errorArchivo) {
        await prisma.escala.delete({ where: { id: escalaCreada.id } })
        return NextResponse.json({ error: errorArchivo.message }, { status: 400 })
      }
    }

    await prisma.solicitud.create({
      data: {
        escala_id: escalaCreada.id,
        canal,
        archivo: rutaGuardada,
        nombre_archivo_original: nombreOriginal,
        recibido_por: session.user.id,
        creado_por: session.user.id,
      },
    })

    return NextResponse.json(escalaCreada, { status: 201 })
  } catch (error) {
    console.error("Error POST escalas:", error)

    if (rutaGuardada) {
      await borrarArchivoSolicitud(rutaGuardada).catch(() => {})
    }
    if (escalaCreada) {
      await prisma.escala.delete({ where: { id: escalaCreada.id } }).catch(() => {})
    }

    return NextResponse.json({ error: "Error interno al crear la escala" }, { status: 500 })
  }
}