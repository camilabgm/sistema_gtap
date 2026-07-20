// Destino: src/app/api/escalas/[id]/rechazar/route.js
//
// PUT /api/escalas/<id>/rechazar
//
// Mismo chequeo de "sos el autorizante activo ahora" que /autorizar.
// No toca EscalaAutorizacion — es una decisión distinta a un paso de
// la cascada, se registra directo en los campos de Escala.
// Body: { motivo_rechazo: string } — obligatorio.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const escalaId = parseInt(id, 10)
    if (!Number.isInteger(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
    }

    const body = await request.json()
    const motivoRechazo = typeof body.motivo_rechazo === "string" ? body.motivo_rechazo.trim() : ""
    if (!motivoRechazo) {
      return NextResponse.json({ error: "El motivo del rechazo es obligatorio" }, { status: 400 })
    }

    const escala = await prisma.escala.findFirst({
      where: { id: escalaId, deleted_at: null },
      select: { es_borrador: true, autorizada: true, estado: true },
    })
    if (!escala) {
      return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
    }
    if (escala.es_borrador) {
      return NextResponse.json({ error: "La escala todavía es un borrador" }, { status: 409 })
    }
    if (escala.autorizada) {
      return NextResponse.json({ error: "La escala ya está autorizada, no se puede rechazar" }, { status: 409 })
    }
    if (["ABORTADA", "RECHAZADA"].includes(escala.estado)) {
      return NextResponse.json({ error: "La escala ya no está disponible para esta acción" }, { status: 409 })
    }

    const { autorizantePersonaId } = await calcularAutorizanteActivo()

    if (!autorizantePersonaId || autorizantePersonaId !== session.user.personaId) {
      return NextResponse.json(
        { error: "No sos el autorizante activo en este momento" },
        { status: 403 }
      )
    }

    const actualizada = await prisma.escala.update({
      where: { id: escalaId },
      data: {
        estado: "RECHAZADA",
        rechazada_por: session.user.id,
        motivo_rechazo: motivoRechazo,
        fecha_rechazo: new Date(),
        editado_por: session.user.id,
      },
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error PUT rechazar escala:", error)
    return NextResponse.json({ error: "Error interno al rechazar la escala" }, { status: 500 })
  }
}