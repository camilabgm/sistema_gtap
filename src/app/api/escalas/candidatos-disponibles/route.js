// Destino: src/app/api/escalas/candidatos-disponibles/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"

export const POST = conPermiso("ESCALAS", "puede_editar", async (request, context, session) => {
  const body = await request.json()
  const fecha = body.fecha ? new Date(body.fecha) : null
  const itinerarios = Array.isArray(body.itinerarios) ? body.itinerarios : []
  const escalaIdActual = Number.isInteger(body.escala_id) ? body.escala_id : -1

  if (!fecha || isNaN(fecha.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 })
  }

  const ventana = calcularVentana(itinerarios)

  const aeronaves = await prisma.aeronave.findMany({
    where: { deleted_at: null },
    select: { id: true, matricula: true },
  })
  const aeronavesDisponibles = []
  for (const a of aeronaves) {
    const r = await verificarAeronave(a.id, ventana, escalaIdActual)
    if (r.ok) aeronavesDisponibles.push({ id: a.id, matricula: a.matricula })
  }

  const personas = await prisma.persona.findMany({
    where: { activo: true, deleted_at: null },
    select: { id: true, nombre: true, apellido: true, grado: true, especialidades: true },
  })
  const personasDisponibles = []
  for (const p of personas) {
    const r = await verificarTripulante(p.id, fecha, ventana, escalaIdActual)
    if (r.ok) {
      personasDisponibles.push({
        id: p.id, nombre: p.nombre, apellido: p.apellido, grado: p.grado, especialidades: p.especialidades,
      })
    }
  }

  return NextResponse.json({ aeronaves: aeronavesDisponibles, personas: personasDisponibles })
})