// src/app/api/informes/vuelos/route.js
//
// GET /api/informes/vuelos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
//   &aeronave_id=&tipo_mision_id=&solicitante=
//
// desde/hasta son obligatorios (evita traer los 1801 vuelos históricos
// de una sola vez). Los otros 3 filtros son opcionales y se combinan
// entre sí (AND). Las horas de vuelo ya vienen calculadas en
// PostVuelo.horas_vuelo_minutos.
//
// CAMBIO (rama feat/pdf-manifiesto-memo40):
//   - FIX zona horaria: el rango se armaba con
//     new Date("2026-09-30T23:59:59.999"), que usa la zona horaria del
//     SERVIDOR. Con el servidor en UTC, el día se cortaba 3 horas antes
//     y un vuelo del 30/09 a las 21:30 de Paraguay quedaba afuera del
//     informe "1 al 30 de septiembre". Ahora el rango se calcula en hora
//     de Paraguay con paraguayInputAFechaUTC (fechaHora.js), el mismo
//     patrón que ya usa el resto del sistema.
//   - Campos NUEVOS en cada fila, para el PDF estilo Memo 40 (los que
//     ya existían no cambian — la pantalla del informe los sigue usando):
//       aeronave_tipo        → columna "Avión"
//       puntos_ruta          → ruta completa: ["SGAS","PIRAJUI","SGAS"]
//       horas_vuelo_minutos  → horas como número, para el formato "01:10"
//       observaciones, novedad, detalle_novedad → columna "Observación"

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { paraguayInputAFechaUTC } from "@/lib/fechaHora"

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

  // Inicio y fin del rango en hora de PARAGUAY, convertidos al instante
  // UTC correcto — sin depender de la zona horaria del servidor. Al fin
  // se le suman 999 ms para incluir todo el último segundo del día.
  const inicio = paraguayInputAFechaUTC(`${desde}T00:00:00`)
  const finSegundo = paraguayInputAFechaUTC(`${hasta}T23:59:59`)
  if (!inicio || !finSegundo) {
    return NextResponse.json({ error: "Formato de fecha inválido (se espera AAAA-MM-DD)" }, { status: 400 })
  }
  const fin = new Date(finSegundo.getTime() + 999)

  const where = {
    estado: "CUMPLIDA",
    deleted_at: null,
    hora_despegue_estimada: { gte: inicio, lte: fin },
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
      aeronave: { select: { matricula: true, tipo: true } },
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
          novedad: true,
          detalle_novedad: true,
          observaciones: true,
        },
      },
    },
    orderBy: { hora_despegue_estimada: "asc" },
  })

  const filas = escalas.map((e) => {
    const pv = e.post_vuelos[0] ?? null
    const primerTramo = e.itinerarios[0]
    const ultimoTramo = e.itinerarios[e.itinerarios.length - 1]

    // Ruta completa: el origen del primer tramo y el destino de cada
    // tramo, en orden → ["SGAS", "PIRAJUI", "SGAS"].
    const puntosRuta = primerTramo
      ? [primerTramo.origen, ...e.itinerarios.map((t) => t.destino)]
      : []

    return {
      id: e.id,
      nro_orden: e.nro_orden,
      solicitante: e.solicitante,
      hora_despegue_estimada: e.hora_despegue_estimada,
      aeronave_matricula: e.aeronave?.matricula ?? "—",
      aeronave_tipo: e.aeronave?.tipo ?? null,
      tipo_mision_codigo: e.tipo_mision?.codigo ?? "—",
      ruta: primerTramo && ultimoTramo ? `${primerTramo.origen} → ${ultimoTramo.destino}` : "—",
      puntos_ruta: puntosRuta,
      tripulacion: e.tripulacion.map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", "),
      horas_vuelo_texto: formatearHoras(pv?.horas_vuelo_minutos),
      horas_vuelo_minutos: pv?.horas_vuelo_minutos ?? null,
      // Decimal de Prisma no serializa limpio en JSON — se convierte
      // a Number explícitamente antes de mandarlo.
      combustible_litros: pv?.combustible_consumido != null ? Number(pv.combustible_consumido) : null,
      pasajeros: pv?.pasajeros ?? null,
      carga_kg: pv?.carga_kg != null ? Number(pv.carga_kg) : null,
      novedad: pv?.novedad ?? null,
      detalle_novedad: pv?.detalle_novedad ?? null,
      observaciones: pv?.observaciones ?? null,
    }
  })

  return NextResponse.json(filas)
})