// Destino: src/app/api/sicem/aeronaves/[id]/datos-generales/route.js
//
// PATCH /api/sicem/aeronaves/:id/datos-generales
//
// Edita ÚNICAMENTE los 4 campos de Aeronave que le pertenecen a SICEM
// (odómetro, ciclos, aterrizajes, y si esta aeronave trackea ciclos y
// aterrizajes o no). A propósito NO es el mismo endpoint que
// /api/aeronaves/:id — ese está gateado por el permiso AERONAVES, y el
// Jefe de SICEM tiene Ver en Aeronaves pero no Editar. Esta ruta
// separada, con permiso SICEM, es la única forma de que esa persona
// pueda cargar estos datos sin también poder editar el resto de la
// aeronave.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

function validarDatosGenerales(body) {
  const trackea = !!body.trackea_ciclos_aterrizajes

  if (body.horas_vuelo_totales_minutos !== undefined) {
    const h = Number(body.horas_vuelo_totales_minutos)
    if (!Number.isInteger(h) || h < 0) return "Las horas totales de vuelo no son válidas"
  }

  if (trackea) {
    if (body.ciclos_acumulados !== undefined) {
      const c = Number(body.ciclos_acumulados)
      if (!Number.isInteger(c) || c < 0) return "Los ciclos acumulados no son válidos"
    }
    if (body.aterrizajes_acumulados !== undefined) {
      const a = Number(body.aterrizajes_acumulados)
      if (!Number.isInteger(a) || a < 0) return "Los aterrizajes acumulados no son válidos"
    }
  }

  return null
}

export const PATCH = conPermiso("SICEM", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const aeronaveId = Number(id)

  const existente = await prisma.aeronave.findFirst({
    where: { id: aeronaveId, deleted_at: null },
  })
  if (!existente) {
    return NextResponse.json({ error: "Aeronave no encontrada" }, { status: 404 })
  }

  const body = await request.json()
  const errorValidacion = validarDatosGenerales(body)
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 })
  }

  const trackea = !!body.trackea_ciclos_aterrizajes

  const actualizada = await prisma.aeronave.update({
    where: { id: aeronaveId },
    data: {
      horas_vuelo_totales_minutos:
        body.horas_vuelo_totales_minutos !== undefined
          ? Number(body.horas_vuelo_totales_minutos)
          : existente.horas_vuelo_totales_minutos,
      trackea_ciclos_aterrizajes: trackea,
      // Si se destildó el checkbox, no se borran los valores que ya
      // hubiera — simplemente se deja de pedirlos/mostrarlos en la
      // pantalla mientras esté destildado (ver SicemDatosGeneralesAeronave.js).
      ciclos_acumulados:
        trackea && body.ciclos_acumulados !== undefined
          ? Number(body.ciclos_acumulados)
          : existente.ciclos_acumulados,
      aterrizajes_acumulados:
        trackea && body.aterrizajes_acumulados !== undefined
          ? Number(body.aterrizajes_acumulados)
          : existente.aterrizajes_acumulados,
      editado_por: session.user.id,
    },
  })

  return NextResponse.json(actualizada)
})