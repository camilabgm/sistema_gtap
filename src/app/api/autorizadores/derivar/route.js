// Destino: src/app/api/autorizadores/derivar/route.js
//
// GET   — devuelve tu derivación activa (si tenés una) o null
// POST  — crea una derivación general (te saca de disponible para
//         autorizar CUALQUIER escala, no una puntual) hasta que la
//         cierres con PATCH
// PATCH — cierra tu derivación activa ("ya volví")
//
// Body de POST: { motivo: "TAREA_ADMINISTRATIVA" | "FUERA_DE_LA_UNIDAD" | "OTRO", motivo_detalle?: string }

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { esCargoDeCascada } from "@/lib/autorizacion"

const MOTIVOS_VALIDOS = ["TAREA_ADMINISTRATIVA", "FUERA_DE_LA_UNIDAD", "OTRO"]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const activa = await prisma.autorizadorNoDisponible.findFirst({
      where: { persona_id: session.user.personaId, deleted_at: null, hasta: null },
    })

    return NextResponse.json(activa)
  } catch (error) {
    console.error("Error GET derivar:", error)
    return NextResponse.json({ error: "Error al consultar la derivación" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!esCargoDeCascada(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

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
  } catch (error) {
    console.error("Error POST derivar:", error)
    return NextResponse.json({ error: "Error al derivar" }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

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
  } catch (error) {
    console.error("Error PATCH derivar:", error)
    return NextResponse.json({ error: "Error al cerrar la derivación" }, { status: 500 })
  }
}