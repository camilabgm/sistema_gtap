import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

function hoyComoFecha() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fechaParam = searchParams.get("fecha")
    const fecha = fechaParam ? new Date(fechaParam) : hoyComoFecha()

    const novedades = await prisma.parteDiario.findMany({
      where: { fecha, deleted_at: null },
      include: {
        persona: {
          select: { id: true, nombre: true, apellido: true, grado: true, escuadron: true },
        },
      },
      orderBy: { created_at: "asc" },
    })

    return NextResponse.json({ novedades, fecha: fecha.toISOString().slice(0, 10) })
  } catch (error) {
    console.error("Error GET parte-diario:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { persona_id, observacion } = body

    if (!persona_id) {
      return NextResponse.json({ error: "persona_id es obligatorio" }, { status: 400 })
    }

    const fecha = hoyComoFecha()

    const novedad = await prisma.parteDiario.upsert({
      where:  { fecha_persona_id: { fecha, persona_id: parseInt(persona_id) } },
      update: { observacion: observacion || null, deleted_at: null, eliminado_por: null },
      create: { fecha, persona_id: parseInt(persona_id), observacion: observacion || null, creado_por: session.user.id },
      include: {
        persona: { select: { id: true, nombre: true, apellido: true, grado: true } },
      },
    })

    return NextResponse.json(novedad, { status: 201 })
  } catch (error) {
    console.error("Error POST parte-diario:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const novedadId = parseInt(searchParams.get("novedadId"))

    if (!novedadId) {
      return NextResponse.json({ error: "novedadId es obligatorio" }, { status: 400 })
    }

    await prisma.parteDiario.update({
      where: { id: novedadId },
      data:  { deleted_at: new Date(), eliminado_por: session.user.id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error DELETE parte-diario:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}