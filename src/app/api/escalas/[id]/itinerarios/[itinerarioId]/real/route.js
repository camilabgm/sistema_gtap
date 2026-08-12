// Destino: src/app/api/escalas/[id]/itinerarios/[itinerarioId]/real/route.js
//
// PUT — carga o corrige la hora real de salida y/o llegada de UN tramo.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { esTripulanteDeEscala } from "@/lib/postVuelo"
import { paraguayInputAFechaUTC } from "@/lib/fechaHora"

export const PUT = conSesion("POST_VUELO", async (request, context, session) => {
  const { id, itinerarioId } = await context.params
  const escalaId = parseInt(id, 10)
  const tramoId = parseInt(itinerarioId, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0 || !Number.isInteger(tramoId) || tramoId <= 0) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id: escalaId, deleted_at: null },
    select: {
      estado: true,
      tripulacion: { where: { deleted_at: null }, select: { persona_id: true } },
    },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  if (!["PROGRAMADA", "CUMPLIDA"].includes(escala.estado)) {
    return NextResponse.json(
      { error: "No se puede cargar la hora real de un tramo en este estado de la escala" },
      { status: 409 }
    )
  }

  const esTripulante = esTripulanteDeEscala(escala, session.user.personaId)
  const tienePermiso =
    !!session.user.permisos?.POST_VUELO?.puede_crear || !!session.user.permisos?.POST_VUELO?.puede_editar
  if (!tienePermiso && !esTripulante) {
    return NextResponse.json({ error: "No tenés permiso para cargar este tramo" }, { status: 403 })
  }

  const tramo = await prisma.escalaItinerario.findFirst({
    where: { id: tramoId, escala_id: escalaId, deleted_at: null },
  })
  if (!tramo) {
    return NextResponse.json({ error: "Tramo no encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const data = { editado_por: session.user.id }

  if (body.hora_real_salida !== undefined) {
    data.hora_real_salida = body.hora_real_salida ? paraguayInputAFechaUTC(body.hora_real_salida) : null
  }
  if (body.hora_real_llegada !== undefined) {
    data.hora_real_llegada = body.hora_real_llegada ? paraguayInputAFechaUTC(body.hora_real_llegada) : null
  }

  const salidaEfectiva = data.hora_real_salida !== undefined ? data.hora_real_salida : tramo.hora_real_salida
  const llegadaEfectiva = data.hora_real_llegada !== undefined ? data.hora_real_llegada : tramo.hora_real_llegada
  if (salidaEfectiva && llegadaEfectiva && salidaEfectiva >= llegadaEfectiva) {
    return NextResponse.json(
      { error: "La hora real de salida no puede ser posterior o igual a la de llegada" },
      { status: 400 }
    )
  }

  const actualizado = await prisma.escalaItinerario.update({
    where: { id: tramoId },
    data,
  })

  return NextResponse.json(actualizado)
})