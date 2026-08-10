// Destino: src/app/api/escalas/[id]/acuse/route.js
//
// GET — ¿la persona logueada tiene un acuse pendiente para esta escala?
// PUT — marca el acuse propio como confirmado.
// Ambos autoscopeados por session.user.personaId, sin chequeo de módulo.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"

export const GET = conSesion("ESCALAS", async (request, context, session) => {
  if (!session.user.personaId) {
    return NextResponse.json({ acuse: null })
  }

  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const acuse = await prisma.acuseRecibo.findFirst({
    where: { escala_id: escalaId, persona_id: session.user.personaId, deleted_at: null },
    select: { id: true, rol: true, fecha_acuse: true },
  })

  return NextResponse.json({ acuse: acuse || null })
})

export const PUT = conSesion("ESCALAS", async (request, context, session) => {
  if (!session.user.personaId) {
    return NextResponse.json({ error: "Tu usuario no tiene una persona asociada" }, { status: 403 })
  }

  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const acuse = await prisma.acuseRecibo.findFirst({
    where: { escala_id: escalaId, persona_id: session.user.personaId, deleted_at: null },
  })
  if (!acuse) {
    return NextResponse.json({ error: "No tenés ningún acuse pendiente para esta escala" }, { status: 404 })
  }
  if (acuse.fecha_acuse) {
    return NextResponse.json({ error: "Ya habías acusado recibo de esta escala" }, { status: 409 })
  }

  const actualizado = await prisma.acuseRecibo.update({
    where: { id: acuse.id },
    data: { fecha_acuse: new Date(), editado_por: session.user.id },
  })

  return NextResponse.json(actualizado)
})