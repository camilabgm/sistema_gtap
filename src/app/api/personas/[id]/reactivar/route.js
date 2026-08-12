// Destino: src/app/api/personas/[id]/reactivar/route.js
//
// PUT /api/personas/<id>/reactivar
//
// Reactiva SOLO la Persona — no toca su Usuario, aunque lo tenga. Volver
// a habilitarle el login es una decisión aparte y deliberada (ver
// usuarios/[id]/reactivar/route.js), no algo que deba pasar solo porque
// la Persona volvió a estar activa.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

export const PUT = conPermiso("PERSONAS", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const personaId = Number(id)

  const persona = await prisma.persona.findFirst({
    where: { id: personaId },
    select: { activo: true },
  })
  if (!persona) {
    return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
  }
  if (persona.activo) {
    return NextResponse.json({ error: "Esta persona ya está activa" }, { status: 409 })
  }

  const actualizada = await prisma.persona.update({
    where: { id: personaId },
    data: {
      activo:        true,
      deleted_at:    null,
      eliminado_por: null,
      editado_por:   session.user.id,
    },
  })

  return NextResponse.json(actualizada)
})