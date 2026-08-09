// Destino: src/app/api/escalas/[id]/acuse/route.js
//
// GET — ¿la persona logueada tiene un acuse de recibo pendiente para
//        esta escala puntual? (null = no le corresponde ninguno, no es error)
// PUT — marca el acuse propio como confirmado (fecha_acuse = ahora)

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.personaId) {
      return NextResponse.json({ acuse: null })
    }

    const { id } = await params
    const escalaId = parseInt(id, 10)
    if (!Number.isInteger(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
    }

    const acuse = await prisma.acuseRecibo.findFirst({
      where: { escala_id: escalaId, persona_id: session.user.personaId, deleted_at: null },
      select: { id: true, rol: true, fecha_acuse: true },
    })

    return NextResponse.json({ acuse: acuse || null })
  } catch (error) {
    console.error("Error GET acuse:", error)
    return NextResponse.json({ error: "Error interno al obtener el acuse" }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.personaId) {
      return NextResponse.json({ error: "Tu usuario no tiene una persona asociada" }, { status: 403 })
    }

    const { id } = await params
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
  } catch (error) {
    console.error("Error PUT acuse:", error)
    return NextResponse.json({ error: "Error interno al acusar recibo" }, { status: 500 })
  }
}