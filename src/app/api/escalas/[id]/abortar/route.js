// Destino: src/app/api/escalas/[id]/abortar/route.js
//
// PUT /api/escalas/<id>/abortar
//
// Distinto de /rechazar: rechazar es una decisión del autorizante ANTES
// de aprobar. Abortar es un motivo técnico/operativo DESPUÉS de
// publicada, y solo antes de que despegue. Accesible a cualquiera con
// ESCALAS.puede_editar, no solo a la cascada de autorización.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { puedeAbortarAhora } from "@/lib/escalas"

const MOTIVOS_VALIDOS = ["ADOS", "ADFM", "ADCA", "ADCM", "ADTI", "ADCP"]

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.permisos?.ESCALAS?.puede_editar) {
      return NextResponse.json({ error: "No tenés permiso para editar escalas" }, { status: 403 })
    }

    const { id } = await params
    const escalaId = parseInt(id, 10)
    if (!Number.isInteger(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
    }

    const body = await request.json()
    const motivoAbortada = body.motivo_abortada
    if (!MOTIVOS_VALIDOS.includes(motivoAbortada)) {
      return NextResponse.json({ error: "Motivo de aborto inválido" }, { status: 400 })
    }
    const observacionAborto = typeof body.observacion_aborto === "string" ? body.observacion_aborto.trim() : ""

    const escala = await prisma.escala.findFirst({
      where: { id: escalaId, deleted_at: null },
      select: { es_borrador: true, estado: true, hora_despegue_estimada: true },
    })
    if (!escala) {
      return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
    }
    if (escala.es_borrador) {
      return NextResponse.json({ error: "La escala todavía es un borrador" }, { status: 409 })
    }
    if (escala.estado !== "PROGRAMADA") {
      return NextResponse.json({ error: "Solo se pueden abortar escalas en estado Programada" }, { status: 409 })
    }
    if (!puedeAbortarAhora(escala)) {
      return NextResponse.json({ error: "Ya pasó la hora de despegue estimada, no se puede abortar" }, { status: 409 })
    }

    const actualizada = await prisma.escala.update({
      where: { id: escalaId },
      data: {
        estado: "ABORTADA",
        motivo_abortada: motivoAbortada,
        observacion_aborto: observacionAborto || null,
        editado_por: session.user.id,
      },
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error PUT abortar escala:", error)
    return NextResponse.json({ error: "Error interno al abortar la escala" }, { status: 500 })
  }
}