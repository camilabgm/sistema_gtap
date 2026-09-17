// Destino: src/app/api/sicem/eventos/route.js
//
// GET  /api/sicem/eventos?aeronave_id=&cerrado=
// POST /api/sicem/eventos
//
// Abre un Evento de Mantenimiento — no es una Orden de Trabajo con
// flujo de aprobación, es el registro simple que decidimos: tipo,
// lugar, observación libre, y (opcional) qué componente afecta. Al
// abrirse dentro de una transacción:
//   1. si es_cambio_componente, guarda una "foto" del componente en
//      HistorialComponenteMantenimiento y recién ahí resetea
//      horas_acumuladas_minutos a 0 (representa un overhaul/cambio real)
//   2. pone la aeronave en NO_DISPONIBLE con el motivo que corresponda
//
// Mismo criterio que Post-Vuelo con detalle_novedad: si el tipo es
// NO_PROGRAMADO, la observación es obligatoria — no alcanza con el
// tipo solo.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { motivoNoDisponiblePara } from "@/lib/sicem"
import { resolverNombresUsuarios } from "@/lib/auditoria"

const TIPOS_VALIDOS = ["PROGRAMADO", "NO_PROGRAMADO", "CALENDARIO"]
const LUGARES_VALIDOS = ["INTERNO", "TERCERIZADO"]

function validarCamposEvento(body) {
  if (!body.aeronave_id || !Number.isInteger(Number(body.aeronave_id))) {
    return "La aeronave es obligatoria"
  }

  if (!TIPOS_VALIDOS.includes(body.tipo)) {
    return "El tipo de evento no es válido"
  }

  if (body.lugar && !LUGARES_VALIDOS.includes(body.lugar)) {
    return "El lugar de mantenimiento no es válido"
  }

  if (body.tipo === "NO_PROGRAMADO" && !`${body.observacion || ""}`.trim()) {
    return "Para un mantenimiento no programado, la observación es obligatoria"
  }

  if (body.es_cambio_componente && !body.componente_id) {
    return "Un cambio de componente necesita indicar cuál componente"
  }

  return null
}

// ============================================
// GET — lista eventos, no oculta los cerrados (mismo criterio que
// Post-Vuelo/Manifiesto: nada desaparece de la lista al cerrarse)
// ============================================
export const GET = conPermiso("SICEM", "puede_ver", async (request) => {
  const { searchParams } = new URL(request.url)
  const aeronaveId = searchParams.get("aeronave_id")
  const cerrado = searchParams.get("cerrado")

  const eventos = await prisma.eventoMantenimiento.findMany({
    where: {
      deleted_at: null,
      ...(aeronaveId ? { aeronave_id: Number(aeronaveId) } : {}),
      ...(cerrado !== null ? { cerrado: cerrado === "true" } : {}),
    },
    include: {
      aeronave: { select: { id: true, matricula: true } },
      componente: { select: { id: true, tipo: true } },
    },
    orderBy: { created_at: "desc" },
  })

  const idsAResolver = [
    ...new Set(
      eventos.flatMap((ev) => [ev.creado_por, ev.editado_por, ev.cerrado_por]).filter(Boolean)
    ),
  ]
  const nombres = await resolverNombresUsuarios(idsAResolver)

  const eventosConNombres = eventos.map((ev) => ({
    ...ev,
    creado_por_nombre: ev.creado_por ? nombres[ev.creado_por] ?? null : null,
    editado_por_nombre: ev.editado_por ? nombres[ev.editado_por] ?? null : null,
    cerrado_por_nombre: ev.cerrado_por ? nombres[ev.cerrado_por] ?? null : null,
  }))

  return NextResponse.json(eventosConNombres)
})

// ============================================
// POST — abre un evento nuevo
// ============================================
export const POST = conPermiso("SICEM", "puede_crear", async (request, context, session) => {
  const body = await request.json()

  const errorValidacion = validarCamposEvento(body)
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 })
  }

  const aeronaveId = Number(body.aeronave_id)

  const aeronave = await prisma.aeronave.findFirst({
    where: { id: aeronaveId, deleted_at: null },
  })
  if (!aeronave) {
    return NextResponse.json({ error: "La aeronave indicada no existe" }, { status: 404 })
  }

  // Jerarquía: si Aeronaves ya la marcó No disponible por un motivo
  // propio (Otro), SICEM no abre un Evento nuevo para ella hasta que
  // se dé de alta desde ahí — evita que dos sistemas se pisen
  // escribiendo el mismo estado.
  if (aeronave.estado === "NO_DISPONIBLE" && aeronave.motivo_no_disponible === "OTRO") {
    return NextResponse.json(
      { error: `Esta aeronave está No disponible desde Aeronaves (${aeronave.motivo_otro || "Otro"}) — hay que darla de alta ahí antes de abrir un Evento.` },
      { status: 409 }
    )
  }

  let componente = null
  if (body.componente_id) {
    componente = await prisma.componenteMantenimiento.findFirst({
      where: { id: Number(body.componente_id), aeronave_id: aeronaveId, deleted_at: null },
    })
    if (!componente) {
      return NextResponse.json(
        { error: "El componente indicado no existe para esta aeronave" },
        { status: 404 }
      )
    }
  }

  const evento = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.eventoMantenimiento.create({
      data: {
        aeronave_id: aeronaveId,
        componente_id: componente?.id ?? null,
        tipo: body.tipo,
        lugar: body.lugar || null,
        es_cambio_componente: !!body.es_cambio_componente,
        observacion: body.observacion ? `${body.observacion}`.trim() : null,
        post_vuelo_id: body.post_vuelo_id ? Number(body.post_vuelo_id) : null,
        creado_por: session.user.id,
      },
    })

    if (body.es_cambio_componente && componente) {
      await tx.historialComponenteMantenimiento.create({
        data: {
          componente_id: componente.id,
          horas_acumuladas_minutos: componente.horas_acumuladas_minutos,
          umbral_horas_minutos: componente.umbral_horas_minutos,
          fecha_proxima_inspeccion: componente.fecha_proxima_inspeccion,
          motivo: "RESET_POR_EVENTO",
          evento_mantenimiento_id: nuevo.id,
          registrado_por: session.user.id,
        },
      })

      await tx.componenteMantenimiento.update({
        where: { id: componente.id },
        data: { horas_acumuladas_minutos: 0, editado_por: session.user.id },
      })
    }

    await tx.aeronave.update({
      where: { id: aeronaveId },
      data: {
        estado: "NO_DISPONIBLE",
        motivo_no_disponible: motivoNoDisponiblePara(!!body.es_accidente),
        editado_por: session.user.id,
      },
    })

    return nuevo
  })

  return NextResponse.json(evento, { status: 201 })
})