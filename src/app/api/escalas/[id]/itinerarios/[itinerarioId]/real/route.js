// Destino: src/app/api/escalas/[id]/itinerarios/[itinerarioId]/real/route.js
//
// PUT — carga o corrige la hora real de salida y/o llegada de UN tramo.
//
// Mientras no exista un PostVuelo para esta escala, tripulante o
// Supervisor de Semana pueden cargar/corregir tramos libremente, las
// veces que haga falta (decisión: se deja así, sin candado de "una
// sola vez" por tramo — el único paso irreversible sigue siendo el
// cierre del Post-Vuelo). Una vez que el post-vuelo ya se creó,
// corregir un tramo pasa a ser exclusivo de los 4 roles globales —
// Jefe de Combustible YA NO entra acá (antes sí, por el bit de matriz
// crudo — ver postVuelo.js).
//
// CAMBIO (rama fix/sicem-sincronizacion-post-vuelo): si el post-vuelo
// YA ESTÁ CERRADO, corregir un tramo ahora recalcula, en la misma
// transacción:
//   1. las horas guardadas en el PostVuelo (vuelo, tierra y total), y
//   2. SICEM, sumando o restando SOLO la diferencia, ahí donde viven
//      hoy las horas de este vuelo (lib/sicemSincronizacion.js).
// Antes el tramo quedaba corregido pero el PostVuelo y SICEM seguían
// con el valor viejo hasta que alguien volviera a guardar el cierre.
//
// Con el post-vuelo cerrado, además, el tramo NO puede quedar sin
// salida o llegada real: el recálculo daría horas parciales y le
// restaría a SICEM horas que sí se volaron.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { esTripulanteDeEscala, calcularHorasDesdeTramosReales, ROLES_GLOBAL_POST_VUELO } from "@/lib/postVuelo"
import { ajustarHorasDeVueloCerrado } from "@/lib/sicemSincronizacion"
import { paraguayInputAFechaUTC } from "@/lib/fechaHora"

export const PUT = conSesion("POST_VUELO", async (request, context, session) => {
  const { id, itinerarioId } = await context.params
  const escalaId = parseInt(id, 10)
  const tramoId = parseInt(itinerarioId, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0 || !Number.isInteger(tramoId) || tramoId <= 0) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id: escalaId, deleted_at: null },
    select: {
      estado: true,
      aeronave_id: true, // SICEM — para el recálculo con post-vuelo cerrado
      tripulacion: { where: { deleted_at: null }, select: { persona_id: true } },
      itinerarios: {
        where: { deleted_at: null },
        select: { id: true, orden: true, hora_real_salida: true, hora_real_llegada: true },
      },
    },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  if (!["PROGRAMADA", "CUMPLIDA"].includes(escala.estado)) {
    return NextResponse.json(
      { error: "No se puede cargar la hora real de un tramo en este estado de la escala" },
      { status: 409 }
    )
  }

  const postVueloExistente = await prisma.postVuelo.findFirst({
    where: { escala_id: escalaId, deleted_at: null },
    select: { id: true, horas_vuelo_minutos: true, created_at: true },
  })

  const esTripulante = esTripulanteDeEscala(escala, session.user.personaId)
  const puedeMatriz = ROLES_GLOBAL_POST_VUELO.includes(session.user.rol)

  // Si el post-vuelo ya existe, solo los 4 roles globales. Mientras no
  // exista todavía, matriz o tripulante. Supervisor de Semana YA NO
  // entra acá — según la observación de la matriz, no toca tramos ni
  // el resto del Post-Vuelo, solo el campo de combustible aparte.
  const tienePermiso = postVueloExistente
    ? puedeMatriz
    : puedeMatriz || esTripulante

  if (!tienePermiso) {
    return NextResponse.json({ error: "No tenés permiso para cargar este tramo" }, { status: 403 })
  }

  const tramo = escala.itinerarios.find((t) => t.id === tramoId)
  if (!tramo) {
    return NextResponse.json({ error: "Tramo no encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const data = { editado_por: session.user.id }

  if (body.hora_real_salida !== undefined) {
    data.hora_real_salida = body.hora_real_salida ? paraguayInputAFechaUTC(body.hora_real_salida) : null
  }
  if (body.hora_real_llegada !== undefined) {
    data.hora_real_llegada = body.hora_real_llegada ? paraguayInputAFechaUTC(body.hora_real_llegada) : null
  }

  const salidaEfectiva = data.hora_real_salida !== undefined ? data.hora_real_salida : tramo.hora_real_salida
  const llegadaEfectiva = data.hora_real_llegada !== undefined ? data.hora_real_llegada : tramo.hora_real_llegada
  if (salidaEfectiva && llegadaEfectiva && salidaEfectiva >= llegadaEfectiva) {
    return NextResponse.json(
      { error: "La hora real de salida no puede ser posterior o igual a la de llegada" },
      { status: 400 }
    )
  }

  // ── Post-vuelo todavía abierto: solo se guarda el tramo ──────────────
  if (!postVueloExistente) {
    const actualizado = await prisma.escalaItinerario.update({
      where: { id: tramoId },
      data,
    })
    return NextResponse.json(actualizado)
  }

  // ── Post-vuelo cerrado: tramo + recálculo de Post-Vuelo y SICEM ──────
  if (!salidaEfectiva || !llegadaEfectiva) {
    return NextResponse.json(
      { error: "El post-vuelo ya está cerrado: el tramo tiene que tener salida y llegada reales" },
      { status: 400 }
    )
  }

  // Se calcula con TODOS los tramos, reemplazando este por sus valores
  // nuevos — antes de escribir nada, para poder rechazar sin tocar la base.
  const tramosConCambio = escala.itinerarios.map((t) =>
    t.id === tramoId ? { ...t, hora_real_salida: salidaEfectiva, hora_real_llegada: llegadaEfectiva } : t
  )
  const calculo = calcularHorasDesdeTramosReales(tramosConCambio)
  if (!calculo.completo) {
    return NextResponse.json(
      { error: "Hay otro tramo de esta escala sin horas reales completas — corregilo primero" },
      { status: 409 }
    )
  }

  const deltaMinutos = calculo.horas_vuelo_minutos - postVueloExistente.horas_vuelo_minutos

  const actualizado = await prisma.$transaction(async (tx) => {
    const tramoActualizado = await tx.escalaItinerario.update({
      where: { id: tramoId },
      data,
    })

    await tx.postVuelo.update({
      where: { id: postVueloExistente.id },
      data: {
        horas_vuelo_minutos: calculo.horas_vuelo_minutos,
        horas_tierra_minutos: calculo.horas_tierra_minutos,
        total_minutos: calculo.horas_vuelo_minutos + calculo.horas_tierra_minutos,
        editado_por: session.user.id,
      },
    })

    await ajustarHorasDeVueloCerrado(tx, {
      aeronaveId: escala.aeronave_id,
      cerradoEn: postVueloExistente.created_at,
      deltaMinutos,
    })

    return tramoActualizado
  })

  return NextResponse.json(actualizado)
})