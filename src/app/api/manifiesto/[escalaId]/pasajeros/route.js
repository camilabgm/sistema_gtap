// POST /api/manifiesto/<escalaId>/pasajeros → agrega un pasajero.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { validarPasajero, usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"

export const POST = conSesion("MANIFIESTO", async (request, context, session) => {
  const { escalaId } = await context.params
  const id = parseInt(escalaId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      manifiesto_cerrado: true,
      tripulacion: { where: { deleted_at: null }, select: { persona_id: true } },
      acuses: { where: { deleted_at: null, rol: "SUPERVISOR_SEMANA" }, select: { persona_id: true } },
    },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }
  if (!usuarioPuedeGestionarManifiesto(session, escala)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const resultado = validarPasajero(body)
  if (resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: 400 })
  }

  try {
    const pasajero = await prisma.escalaPasajero.create({
      data: { escala_id: id, ...resultado.valor, creado_por: session.user.id },
    })
    return NextResponse.json(pasajero, { status: 201 })
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ese documento ya está cargado en esta escala" }, { status: 409 })
    }
    console.error("Error interno POST pasajeros:", error)
    return NextResponse.json({ error: "Error interno al agregar el pasajero" }, { status: 500 })
  }
})