// Destino: src/app/api/informes/vuelos/route.js
//
// GET /api/informes/vuelos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
//   &aeronave_id=&tipo_mision_id=&solicitante=
//
// desde/hasta son obligatorios (evita traer los 1801 vuelos históricos
// de una sola vez). Los otros 3 filtros son opcionales y se combinan
// entre sí (AND).
//
// Todos los nombres de campo confirmados contra schema.prisma real —
// horas de vuelo ya vienen calculadas en PostVuelo.horas_vuelo_minutos,
// no hace falta sumar tramos a mano.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

function formatearHoras(minutos) {
  if (minutos == null) return "—"
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${h}h ${m}min`
}

export const GET = conPermiso("INFORMES", "puede_ver", async (request, context, session) => {
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")
  const aeronaveId = searchParams.get("aeronave_id")
  const tipoMisionId = searchParams.get("tipo_mision_id")
  const solicitante = searchParams.get("solicitante")

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Rango de fechas (desde/hasta) es obligatorio" }, { status: 400 })
  }

  const where = {
    estado: "CUMPLIDA",
    deleted_at: null,
    hora_despegue_estimada: {
      gte: new Date(`${desde}T00:00:00`),
      lte: new Date(`${hasta}T23:59:59.999`),
    },
  }
  if (aeronaveId) where.aeronave_id = Number(aeronaveId)
  if (tipoMisionId) where.tipo_mision_id = Number(tipoMisionId)
  if (solicitante) where.solicitante = { contains: solicitante, mode: "insensitive" }

  const escalas = await prisma.escala.findMany({
    where,
    select: {
      id: true,
      nro_orden: true,
      solicitante: true,
      hora_despegue_estimada: true,
      aeronave: { select: { matricula: true } },
      tipo_mision: { select: { codigo: true } },
      itinerarios: {
        where: { deleted_at: null },
        orderBy: { orden: "asc" },
        select: { origen: true, destino: true },
      },
      tripulacion: {
        where: { deleted_at: null },
        select: { persona: { select: { grado: true, apellido: true } } },
      },
      post_vuelos: {
        where: { deleted_at: null },
        take: 1,
        select: {
          combustible_consumido: true,
          pasajeros: true,
          carga_kg: true,
          horas_vuelo_minutos: true,
        },
      },
    },
    orderBy: { hora_despegue_estimada: "asc" },
  })

  const filas = escalas.map((e) => {
    const pv = e.post_vuelos[0] ?? null
    const primerTramo = e.itinerarios[0]
    const ultimoTramo = e.itinerarios[e.itinerarios.length - 1]

    return {
      id: e.id,
      nro_orden: e.nro_orden,
      solicitante: e.solicitante,
      hora_despegue_estimada: e.hora_despegue_estimada,
      aeronave_matricula: e.aeronave?.matricula ?? "—",
      tipo_mision_codigo: e.tipo_mision?.codigo ?? "—",
      ruta: primerTramo && ultimoTramo ? `${primerTramo.origen} → ${ultimoTramo.destino}` : "—",
      tripulacion: e.tripulacion.map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", "),
      horas_vuelo_texto: formatearHoras(pv?.horas_vuelo_minutos),
      // Decimal de Prisma no serializa limpio en JSON — se convierte
      // a Number explícitamente antes de mandarlo.
      combustible_litros: pv?.combustible_consumido != null ? Number(pv.combustible_consumido) : null,
      pasajeros: pv?.pasajeros ?? null,
      carga_kg: pv?.carga_kg != null ? Number(pv.carga_kg) : null,
    }
  })

  return NextResponse.json(filas)
})