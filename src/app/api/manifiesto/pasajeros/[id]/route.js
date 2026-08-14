// PUT    /api/manifiesto/pasajeros/<id> → edita un pasajero
// DELETE /api/manifiesto/pasajeros/<id> → borrado lógico

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { validarPasajero, usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"

async function buscarPasajeroConEscala(id) {
  return prisma.escalaPasajero.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      escala_id: true,
      escala: {
        select: {
          id: true,
          tripulacion: { where: { deleted_at: null }, select: { persona_id: true } },
          acuses: { where: { deleted_at: null, rol: "SUPERVISOR_SEMANA" }, select: { persona_id: true } },
        },
      },
    },
  })
}

export const PUT = conPermiso("MANIFIESTO", "puede_editar", async (request, context, session) => {
  const { id } = await context.params
  const pasajeroId = parseInt(id, 10)
  if (!Number.isInteger(pasajeroId) || pasajeroId <= 0) {
    return NextResponse.json({ error: "Id de pasajero inválido" }, { status: 400 })
  }

  const pasajero = await buscarPasajeroConEscala(pasajeroId)
  if (!pasajero) {
    return NextResponse.json({ error: "Pasajero no encontrado" }, { status: 404 })
  }
  if (!usuarioPuedeGestionarManifiesto(session, pasajero.escala)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const resultado = validarPasajero(body)
  if (resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: 400 })
  }

  try {
    const actualizado = await prisma.escalaPasajero.update({
      where: { id: pasajeroId },
      data: { ...resultado.valor, editado_por: session.user.id },
    })
    return NextResponse.json(actualizado)
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ese documento ya está cargado en esta escala" }, { status: 409 })
    }
    console.error("Error interno PUT pasajero:", error)
    return NextResponse.json({ error: "Error interno al editar el pasajero" }, { status: 500 })
  }
})

export const DELETE = conPermiso("MANIFIESTO", "puede_eliminar", async (request, context, session) => {
  const { id } = await context.params
  const pasajeroId = parseInt(id, 10)
  if (!Number.isInteger(pasajeroId) || pasajeroId <= 0) {
    return NextResponse.json({ error: "Id de pasajero inválido" }, { status: 400 })
  }

  const pasajero = await buscarPasajeroConEscala(pasajeroId)
  if (!pasajero) {
    return NextResponse.json({ error: "Pasajero no encontrado" }, { status: 404 })
  }
  if (!usuarioPuedeGestionarManifiesto(session, pasajero.escala)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  await prisma.escalaPasajero.update({
    where: { id: pasajeroId },
    data: { deleted_at: new Date(), eliminado_por: session.user.id },
  })

  return NextResponse.json({ ok: true })
})