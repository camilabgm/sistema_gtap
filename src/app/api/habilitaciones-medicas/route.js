// src/app/api/habilitaciones-medicas/route.js
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

function calcularVencimiento(periodo, anio) {
  if (periodo === "1P") return new Date(`${anio}-09-30`)
  if (periodo === "2P") return new Date(`${anio + 1}-03-31`)
  throw new Error("Período inválido")
}

// GET /api/habilitaciones-medicas?personaId=X
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const personaId = parseInt(searchParams.get("personaId"))

    if (!personaId) {
      return NextResponse.json({ error: "personaId es obligatorio" }, { status: 400 })
    }

    const habilitaciones = await prisma.habilitacionMedica.findMany({
      where:   { persona_id: personaId, deleted_at: null },
      orderBy: [{ anio: "desc" }, { periodo: "desc" }],
    })

    return NextResponse.json(habilitaciones)
  } catch (error) {
    console.error("Error GET habilitaciones-medicas:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST /api/habilitaciones-medicas
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { persona_id, periodo, anio, fecha_examen } = body

    if (!persona_id || !periodo || !anio || !fecha_examen) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      )
    }

    if (!["1P", "2P"].includes(periodo)) {
      return NextResponse.json({ error: "Período inválido" }, { status: 400 })
    }

    const vence = calcularVencimiento(periodo, parseInt(anio))

    // Verificar si ya existe este período para esta persona
    const existente = await prisma.habilitacionMedica.findUnique({
      where: {
        persona_id_periodo_anio: {
          persona_id: parseInt(persona_id),
          periodo,
          anio: parseInt(anio),
        },
      },
    })

    if (existente && !existente.deleted_at) {
      return NextResponse.json(
        { error: `Ya existe un registro para el período ${periodo}/${anio}` },
        { status: 400 }
      )
    }

    // Si existía pero estaba eliminado, lo restauramos
    if (existente) {
      const restaurado = await prisma.habilitacionMedica.update({
        where: { id: existente.id },
        data: {
          fecha_examen: new Date(fecha_examen),
          vence,
          deleted_at:    null,
          eliminado_por: null,
          editado_por:   session.user.id,
        },
      })
      return NextResponse.json(restaurado, { status: 201 })
    }

    const nueva = await prisma.habilitacionMedica.create({
      data: {
        persona_id:   parseInt(persona_id),
        periodo,
        anio:         parseInt(anio),
        fecha_examen: new Date(fecha_examen),
        vence,
        creado_por:   session.user.id,
      },
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error("Error POST habilitaciones-medicas:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
