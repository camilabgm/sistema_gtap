// Destino: src/app/api/autorizadores/derivar/route.js
//
// GET   — devuelve tu derivación activa (si tenés una) o null
// POST  — crea una derivación general hasta que la cierres con PATCH
// PATCH — cierra tu derivación activa ("ya volví")
//
// GET y PATCH son autoscopeados por session.user.personaId — no chequean
// esCargoDeCascada a propósito: PATCH tiene que poder cerrar una
// derivación abierta aunque la persona ya haya perdido el cargo.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion, conCascada } from "@/lib/api-helpers"

const MOTIVOS_VALIDOS = ["TAREA_ADMINISTRATIVA", "FUERA_DE_LA_UNIDAD", "OTRO"]

export const GET = conSesion("ESCALAS", async (request, context, session) => {
  const activa = await prisma.autorizadorNoDisponible.findFirst({
    where: { persona_id: session.user.personaId, deleted_at: null, hasta: null },
  })

  return NextResponse.json(activa)
})

export const POST = conCascada("ESCALAS", async (request, context, session) => {
  const body = await request.json()
  const motivo = body.motivo

  if (!MOTIVOS_VALIDOS.includes(motivo)) {
    return NextResponse.json({ error: "Motivo inválido" }, { status: 400 })
  }
  const motivoDetalle = typeof body.motivo_detalle === "string" ? body.motivo_detalle.trim() : ""
  if (motivo === "OTRO" && !motivoDetalle) {
    return NextResponse.json({ error: "Debés indicar el detalle del motivo" }, { status: 400 })
  }

  const yaActiva = await prisma.autorizadorNoDisponible.findFirst({
    where: { persona_id: session.user.personaId, deleted_at: null, hasta: null },
  })
  if (yaActiva) {
    return NextResponse.json(
      { error: "Ya tenés una derivación activa. Cerrala con 'Ya volví' antes de crear otra." },
      { status: 409 }
    )
  }

  const nueva = await prisma.autorizadorNoDisponible.create({
    data: {
      persona_id: session.user.personaId,
      desde: new Date(),
      hasta: null,
      motivo,
      motivo_detalle: motivo === "OTRO" ? motivoDetalle : null,
      creado_por: session.user.id,
    },
  })

  return NextResponse.json(nueva, { status: 201 })
})

export const PATCH = conSesion("ESCALAS", async (request, context, session) => {
  const activa = await prisma.autorizadorNoDisponible.findFirst({
    where: { persona_id: session.user.personaId, deleted_at: null, hasta: null },
  })
  if (!activa) {
    return NextResponse.json({ error: "No tenés ninguna derivación activa" }, { status: 400 })
  }

  const cerrada = await prisma.autorizadorNoDisponible.update({
    where: { id: activa.id },
    data: { hasta: new Date(), editado_por: session.user.id },
  })

  return NextResponse.json(cerrada)
})