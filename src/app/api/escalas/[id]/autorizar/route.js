// Destino: src/app/api/escalas/[id]/autorizar/route.js
//
// PUT /api/escalas/<id>/autorizar
//
// Recalcula EN VIVO quién es el autorizante activo y, si quien llama es
// esa persona, marca la escala como autorizada. Ahora también rechaza
// si ya pasó la hora estimada de despegue — no tiene sentido operativo
// autorizar un vuelo cuyo horario ya pasó; la escala tiene que
// reprogramarse primero (sigue siendo editable justamente para eso).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"
import { yaPasoLaHora } from "@/lib/escalas"

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

    const escala = await prisma.escala.findFirst({
      where: { id: escalaId, deleted_at: null },
      select: { es_borrador: true, autorizada: true, estado: true, hora_despegue_estimada: true },
    })
    if (!escala) {
      return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
    }
    if (escala.es_borrador) {
      return NextResponse.json({ error: "La escala todavía es un borrador" }, { status: 409 })
    }
    if (escala.autorizada) {
      return NextResponse.json({ error: "La escala ya está autorizada" }, { status: 409 })
    }
    if (["ABORTADA", "RECHAZADA"].includes(escala.estado)) {
      return NextResponse.json({ error: "La escala ya no está disponible para autorizar" }, { status: 409 })
    }
    if (yaPasoLaHora(escala.hora_despegue_estimada)) {
      return NextResponse.json(
        { error: "Ya pasó la hora de despegue estimada. Editá la escala para reprogramarla antes de autorizarla." },
        { status: 409 }
      )
    }

    const { autorizanteRol, autorizantePersonaId, pasos } = await calcularAutorizanteActivo()

    if (!autorizantePersonaId || autorizantePersonaId !== session.user.personaId) {
      return NextResponse.json(
        { error: "No sos el autorizante activo en este momento" },
        { status: 403 }
      )
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      for (let i = 0; i < pasos.length; i++) {
        const paso = pasos[i]
        await tx.escalaAutorizacion.create({
          data: {
            escala_id: escalaId,
            rol_autorizador: paso.rol_autorizador,
            persona_id: paso.persona_id,
            motivo_escalamiento: paso.motivo_escalamiento,
            autorizo: i === pasos.length - 1,
            creado_por: session.user.id,
          },
        })
      }

      return tx.escala.update({
        where: { id: escalaId },
        data: {
          autorizada: true,
          autorizada_por: session.user.id,
          rol_autoriza: autorizanteRol,
          fecha_autorizacion: new Date(),
          editado_por: session.user.id,
        },
      })
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error PUT autorizar escala:", error)
    return NextResponse.json({ error: "Error interno al autorizar la escala" }, { status: 500 })
  }
}