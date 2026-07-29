// src/app/api/habilitaciones-medicas/route.js
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso, conAdmin } from "@/lib/api-helpers"

function calcularVencimiento(periodo, anio) {
  if (periodo === "1P") return new Date(`${anio}-09-30`)
  if (periodo === "2P") return new Date(`${anio + 1}-03-31`)
  throw new Error("Período inválido")
}

// GET /api/habilitaciones-medicas?personaId=X
export const GET = conPermiso("PERSONAS", "puede_ver", async (request, context, session) => {
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
})

// POST /api/habilitaciones-medicas — solo Jefe de Operaciones y Comandante
export const POST = conAdmin("HABILITACIONES_MEDICAS", async (request, context, session) => {
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
})