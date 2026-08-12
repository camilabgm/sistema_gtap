// Destino: src/app/api/escalas/candidatos-disponibles/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"
import { normalizarFechaSoloDia } from "@/lib/fechaSoloDia"
import { fechaEnParaguayDesdeInstante } from "@/lib/fechaHora"

export const POST = conPermiso("ESCALAS", "puede_editar", async (request, context, session) => {
  const body = await request.json()
  const itinerarios = Array.isArray(body.itinerarios) ? body.itinerarios : []
  const escalaIdActual = Number.isInteger(body.escala_id) ? body.escala_id : -1

  const ventana = calcularVentana(itinerarios)
  if (!ventana) {
    return NextResponse.json(
      { error: "Completá la hora estimada de salida y llegada del itinerario antes de buscar disponibilidad" },
      { status: 400 }
    )
  }

  // La fecha de referencia (para habilitación médica y Parte Diario) ya
  // no la manda el cliente — se calcula acá mismo, a partir de la
  // ventana del itinerario que ya llegó.
  const fecha = normalizarFechaSoloDia(fechaEnParaguayDesdeInstante(ventana.inicio))

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