// Destino: src/app/api/informes/progreso-anual/route.js
//
// GET /api/informes/progreso-anual?anio=2026
//
// Cuenta, mes a mes, cuántas escalas del año se programaron y en qué
// terminaron. Usa Escala.fecha (fecha solo-día, ya calculada sola a
// partir del itinerario) para agrupar por mes — no hora_despegue_estimada,
// que es datetime completo.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

export const GET = conPermiso("INFORMES", "puede_ver", async (request, context, session) => {
  const { searchParams } = new URL(request.url)
  const anio = Number(searchParams.get("anio")) || new Date().getFullYear()

  const desde = new Date(`${anio}-01-01T00:00:00.000Z`)
  const hasta = new Date(`${anio}-12-31T23:59:59.999Z`)

  const escalas = await prisma.escala.findMany({
    where: {
      es_borrador: false,
      deleted_at: null,
      fecha: { gte: desde, lte: hasta },
    },
    select: { fecha: true, estado: true },
  })

  const meses = Array.from({ length: 12 }, (_, i) => ({
    mes: i,
    programados: 0,
    cumplidos: 0,
    abortados: 0,
  }))

  for (const e of escalas) {
    if (!e.fecha) continue
    // fecha es @db.Date (solo día, sin hora real) — se guarda en UTC,
    // por eso se lee con getUTCMonth() y no getMonth(), para no correr
    // el mes según la zona horaria del servidor.
    const mesIndex = new Date(e.fecha).getUTCMonth()
    meses[mesIndex].programados += 1
    if (e.estado === "CUMPLIDA") meses[mesIndex].cumplidos += 1
    if (e.estado === "ABORTADA") meses[mesIndex].abortados += 1
  }

  return NextResponse.json({ anio, meses })
})