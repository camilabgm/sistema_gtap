// Destino: src/app/api/escalas/[id]/abortar/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { puedeAbortarAhora } from "@/lib/escalas"

const MOTIVOS_VALIDOS = ["ADOS", "ADFM", "ADCA", "ADCM", "ADTI", "ADCP"]

export const PUT = conPermiso("ESCALAS", "puede_editar", async (request, context, session) => {
  const { id } = await context.params
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
})