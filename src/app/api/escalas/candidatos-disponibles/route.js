// Destino: src/app/api/escalas/candidatos-disponibles/route.js
//
// POST /api/escalas/candidatos-disponibles
//
// Devuelve, para una fecha y un itinerario (aún sin guardar), qué
// aeronaves y qué personas están realmente disponibles — reutilizando
// verificarAeronave() y verificarTripulante() de disponibilidad.js.
// Incluye las especialidades de cada persona (ahora una lista) para que
// el frontend pueda filtrar por rol de vuelo sin pedir nada nuevo al
// servidor.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.permisos?.ESCALAS?.puede_editar) {
      return NextResponse.json({ error: "No tenés permiso para editar escalas" }, { status: 403 })
    }

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
  } catch (error) {
    console.error("Error POST candidatos-disponibles:", error)
    return NextResponse.json({ error: "Error al calcular disponibilidad" }, { status: 500 })
  }
}