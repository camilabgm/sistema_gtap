// Destino: src/app/api/escalas/[id]/autorizar/route.js
//
// PUT /api/escalas/<id>/autorizar
//
// No depende de un permiso de módulo — depende de recalcular en vivo
// quién es el autorizante activo y comparar contra quien llama.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"
import { yaPasoLaHora } from "@/lib/escalas"

export const PUT = conSesion("ESCALAS", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id: escalaId, deleted_at: null },
    select: {
      es_borrador: true,
      autorizada: true,
      estado: true,
      hora_despegue_estimada: true,
      tripulacion: {
        where: { deleted_at: null },
        select: { persona_id: true, rol_en_vuelo: true },
      },
    },
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
  if (escala.estado === "ABORTADA") {
    return NextResponse.json({ error: "La escala ya no está disponible para autorizar" }, { status: 409 })
  }
  if (yaPasoLaHora(escala.hora_despegue_estimada)) {
    return NextResponse.json(
      { error: "Ya pasó la hora de despegue estimada. Editá la escala para reprogramarla antes de autorizarla." },
      { status: 409 }
    )
  }

  const { autorizanteRol, autorizantePersonaId, autorizanteOrden, pasos } = await calcularAutorizanteActivo()

  if (!autorizantePersonaId || autorizantePersonaId !== session.user.personaId) {
    return NextResponse.json(
      { error: "No sos el autorizante activo en este momento" },
      { status: 403 }
    )
  }

  const supervisoresDeSemana = await prisma.usuario.findMany({
    where: { activo: true, deleted_at: null, rol: { nombre: "Supervisor de Semana" } },
    select: { persona_id: true },
  })

  const actualizada = await prisma.$transaction(async (tx) => {
    for (let i = 0; i < pasos.length; i++) {
      const paso = pasos[i]
      await tx.escalaAutorizacion.create({
        data: {
          escala_id: escalaId,
          rol_autorizador: paso.rol_autorizador,
          persona_id: paso.persona_id,
          orden: paso.orden,
          motivo_escalamiento: paso.motivo_escalamiento,
          autorizo: i === pasos.length - 1,
          creado_por: session.user.id,
        },
      })
    }

    const resultado = await tx.escala.update({
      where: { id: escalaId },
      data: {
        autorizada: true,
        autorizada_por: session.user.id,
        rol_autoriza: autorizanteRol,
        orden_autorizante: autorizanteOrden,
        fecha_autorizacion: new Date(),
        editado_por: session.user.id,
      },
    })

    const acusesACrear = [
      ...escala.tripulacion.map((t) => ({
        escala_id: escalaId,
        persona_id: t.persona_id,
        rol: t.rol_en_vuelo,
        creado_por: session.user.id,
      })),
      ...supervisoresDeSemana.map((u) => ({
        escala_id: escalaId,
        persona_id: u.persona_id,
        rol: "SUPERVISOR_SEMANA",
        creado_por: session.user.id,
      })),
    ]

    if (acusesACrear.length > 0) {
      await tx.acuseRecibo.createMany({ data: acusesACrear, skipDuplicates: true })
    }

    return resultado
  })

  return NextResponse.json(actualizada)
})