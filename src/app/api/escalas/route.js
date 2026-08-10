// Destino: src/app/api/escalas/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { guardarArchivoSolicitud, borrarArchivoSolicitud } from "@/lib/almacenamiento"
import { validarCanalConArchivo } from "@/lib/validacionEscala"

function validarDatosSolicitud({ solicitante, fecha, canal, nombreArchivo }) {
  if (!solicitante || !`${solicitante}`.trim()) return "El solicitante es obligatorio"
  if (!fecha) return "La fecha es obligatoria"
  if (isNaN(new Date(fecha).getTime())) return "La fecha no es válida"
  return validarCanalConArchivo(canal, nombreArchivo)
}

export const GET = conPermiso("ESCALAS", "puede_ver", async (request, context, session) => {
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

    const finDelRango = new Date(fechaHasta)
    finDelRango.setUTCHours(23, 59, 59, 999)

    where.es_borrador = false
    where.OR = [
      { fecha: { gte: fechaDesde, lte: fechaHasta } },
      {
        hora_despegue_estimada: { lte: finDelRango },
        hora_arribo_estimada: { gte: fechaDesde },
      },
    ]
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
      autorizada: true,
      motivo_abortada: true,
      observacion_aborto: true,
      motivo_rechazo: true,
      updated_at: true,
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
})

export const POST = conPermiso("ESCALAS", "puede_crear", async (request, context, session) => {
  let escalaCreada = null
  let rutaGuardada = null

  try {
    const formData = await request.formData()
    const solicitante   = formData.get("solicitante")
    const fecha         = formData.get("fecha")
    const canal         = formData.get("canal")
    const observaciones = formData.get("observaciones")
    const archivo       = formData.get("archivo")

    const hayArchivo =
      archivo && typeof archivo.arrayBuffer === "function" && archivo.size > 0

    const errorValidacion = validarDatosSolicitud({
      solicitante, fecha, canal,
      nombreArchivo: hayArchivo ? archivo.name : null,
    })
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
    console.error("Error interno POST escalas:", error)

    if (rutaGuardada) {
      await borrarArchivoSolicitud(rutaGuardada).catch(() => {})
    }
    if (escalaCreada) {
      await prisma.escala.delete({ where: { id: escalaCreada.id } }).catch(() => {})
    }

    return NextResponse.json({ error: "Error interno al crear la escala" }, { status: 500 })
  }
})