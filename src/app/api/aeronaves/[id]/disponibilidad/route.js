// Destino: src/app/api/aeronaves/[id]/disponibilidad/route.js
//
// PATCH /api/aeronaves/:id/disponibilidad
//
// Ruta dedicada, separada de la edición general — mismo criterio que
// post-vuelo/combustible o sicem/eventos/[id]/cerrar. Solo maneja el
// caso "Otro": marcar una aeronave como No disponible por un motivo
// que no tiene nada que ver con mantenimiento, o devolverla a
// Disponible. Nunca escribe ACCIDENTADA ni EN_MANTENIMIENTO — esos
// dos motivos son exclusivos de SICEM (Eventos).
//
// Bloqueado por completo si la aeronave tiene un Evento de
// Mantenimiento abierto en SICEM — en ese caso, el estado se gestiona
// desde ahí, cerrando el Evento primero.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

export const PATCH = conPermiso("AERONAVES", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const aeronaveId = Number(id)

  const existente = await prisma.aeronave.findFirst({
    where: { id: aeronaveId, deleted_at: null },
  })
  if (!existente) {
    return NextResponse.json({ error: "Aeronave no encontrada" }, { status: 404 })
  }

  const tieneEventoAbierto = await prisma.eventoMantenimiento.count({
    where: { aeronave_id: aeronaveId, cerrado: false, deleted_at: null },
  })
  if (tieneEventoAbierto > 0) {
    return NextResponse.json(
      { error: "Esta aeronave tiene un Evento de Mantenimiento abierto en SICEM — hay que cerrarlo desde ahí antes de tocar su disponibilidad acá." },
      { status: 409 }
    )
  }

  const body = await request.json()

  if (body.estado === "NO_DISPONIBLE") {
    if (!body.motivo_otro || !body.motivo_otro.trim()) {
      return NextResponse.json({ error: "Describí el motivo" }, { status: 400 })
    }
    const actualizada = await prisma.aeronave.update({
      where: { id: aeronaveId },
      data: {
        estado: "NO_DISPONIBLE",
        motivo_no_disponible: "OTRO",
        motivo_otro: body.motivo_otro.trim(),
        editado_por: session.user.id,
      },
    })
    return NextResponse.json(actualizada)
  }

  if (body.estado === "DISPONIBLE") {
    const actualizada = await prisma.aeronave.update({
      where: { id: aeronaveId },
      data: {
        estado: "DISPONIBLE",
        motivo_no_disponible: null,
        motivo_otro: null,
        editado_por: session.user.id,
      },
    })
    return NextResponse.json(actualizada)
  }

  return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
})