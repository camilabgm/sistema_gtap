// Destino: src/app/api/informes/totales/route.js
//
// GET /api/informes/totales?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
//
// Trae las escalas CUMPLIDA del período (una sola consulta) y agrega
// en JS por tripulante, por aeronave, y por tipo de misión —
// evita 3 consultas separadas a la base para lo mismo.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

function formatearHoras(minutos) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${h}h ${m}min`
}

export const GET = conPermiso("INFORMES", "puede_ver", async (request, context, session) => {
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Rango de fechas (desde/hasta) es obligatorio" }, { status: 400 })
  }

  const escalas = await prisma.escala.findMany({
    where: {
      estado: "CUMPLIDA",
      deleted_at: null,
      hora_despegue_estimada: {
        gte: new Date(`${desde}T00:00:00`),
        lte: new Date(`${hasta}T23:59:59.999`),
      },
    },
    select: {
      aeronave: { select: { id: true, matricula: true } },
      tipo_mision: { select: { id: true, codigo: true, nombre: true } },
      tripulacion: {
        where: { deleted_at: null },
        select: { persona: { select: { id: true, grado: true, apellido: true } } },
      },
      post_vuelos: {
        where: { deleted_at: null },
        take: 1,
        select: { horas_vuelo_minutos: true, combustible_consumido: true },
      },
    },
  })

  const porTripulante = new Map()
  const porAeronave = new Map()
  const porTipoMision = new Map()

  for (const e of escalas) {
    const pv = e.post_vuelos[0]
    if (!pv) continue
    const minutos = pv.horas_vuelo_minutos || 0
    const combustible = pv.combustible_consumido != null ? Number(pv.combustible_consumido) : 0

    for (const t of e.tripulacion) {
      const key = t.persona.id
      if (!porTripulante.has(key)) {
        porTripulante.set(key, { nombre: `${t.persona.grado} ${t.persona.apellido}`, vuelos: 0, minutos: 0 })
      }
      const entry = porTripulante.get(key)
      entry.vuelos += 1
      entry.minutos += minutos
    }

    if (e.aeronave) {
      const key = e.aeronave.id
      if (!porAeronave.has(key)) {
        porAeronave.set(key, { matricula: e.aeronave.matricula, vuelos: 0, minutos: 0 })
      }
      const entry = porAeronave.get(key)
      entry.vuelos += 1
      entry.minutos += minutos
    }

    if (e.tipo_mision) {
      const key = e.tipo_mision.id
      if (!porTipoMision.has(key)) {
        porTipoMision.set(key, { nombre: `${e.tipo_mision.codigo} — ${e.tipo_mision.nombre}`, vuelos: 0, litros: 0 })
      }
      const entry = porTipoMision.get(key)
      entry.vuelos += 1
      entry.litros += combustible
    }
  }

  const respuesta = {
    por_tripulante: [...porTripulante.values()]
      .map((e) => ({ ...e, horas_texto: formatearHoras(e.minutos) }))
      .sort((a, b) => b.minutos - a.minutos),
    por_aeronave: [...porAeronave.values()]
      .map((e) => ({ ...e, horas_texto: formatearHoras(e.minutos) }))
      .sort((a, b) => b.minutos - a.minutos),
    por_tipo_mision: [...porTipoMision.values()]
      .map((e) => ({ ...e, litros: Math.round(e.litros * 100) / 100 }))
      .sort((a, b) => b.litros - a.litros),
  }

  return NextResponse.json(respuesta)
})