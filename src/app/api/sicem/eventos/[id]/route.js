// Destino: src/app/api/sicem/eventos/[id]/route.js
//
// PUT /api/sicem/eventos/:id
//
// Edita tipo, componente afectado, lugar y observación de un evento
// ya creado — para el caso real que Cami señaló: se abre un evento
// con poca información ("hubo un incidente"), y más tarde, al
// inspeccionar, se sabe con precisión qué pasó y qué componente se
// vio afectado.
//
// Lo que NO se puede tocar acá:
//  - aeronave_id: identidad del evento, no se reasigna.
//  - es_accidente / el motivo en Aeronaves: es una decisión tomada al
//    abrir el evento, no se revisita desde acá (si hace falta
//    corregirla, es un ajuste manual aparte, fuera de este alcance).
//  - deshacer un reseteo ya aplicado: si es_cambio_componente ya era
//    true, no se puede cambiar el componente ni volver a poner
//    es_cambio_componente en false — el reseteo ya pasó de verdad.
//
// Lo que SÍ es nuevo: si es_cambio_componente pasa de false a true
// durante la edición (ej. "ahora que inspeccionamos, sí hubo que
// cambiar la hélice"), recién ahí se aplica el reseteo — con su
// snapshot de historial, igual que si hubiera pasado al crear.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

const TIPOS_VALIDOS = ["PROGRAMADO", "NO_PROGRAMADO", "CALENDARIO"]
const LUGARES_VALIDOS = ["INTERNO", "TERCERIZADO"]

function validarEdicionEvento(body) {
  if (body.tipo && !TIPOS_VALIDOS.includes(body.tipo)) {
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

export const PUT = conPermiso("SICEM", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const eventoId = Number(id)

  const existente = await prisma.eventoMantenimiento.findFirst({
    where: { id: eventoId, deleted_at: null },
  })
  if (!existente) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const errorValidacion = validarEdicionEvento(body)
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 })
  }

  const nuevoComponenteId = body.componente_id ? Number(body.componente_id) : null

  if (existente.es_cambio_componente) {
    if (nuevoComponenteId !== existente.componente_id) {
      return NextResponse.json(
        { error: "Este evento ya reseteó un componente — no se puede cambiar cuál desde acá" },
        { status: 409 }
      )
    }
    if (body.es_cambio_componente === false) {
      return NextResponse.json(
        { error: "No se puede deshacer un reseteo ya aplicado desde acá" },
        { status: 409 }
      )
    }
  }

  const activaResetAhora = !existente.es_cambio_componente && !!body.es_cambio_componente

  let componente = null
  if (activaResetAhora) {
    componente = await prisma.componenteMantenimiento.findFirst({
      where: { id: nuevoComponenteId, aeronave_id: existente.aeronave_id, deleted_at: null },
    })
    if (!componente) {
      return NextResponse.json(
        { error: "El componente indicado no existe para esta aeronave" },
        { status: 404 }
      )
    }
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    if (activaResetAhora) {
      await tx.historialComponenteMantenimiento.create({
        data: {
          componente_id: componente.id,
          horas_acumuladas_minutos: componente.horas_acumuladas_minutos,
          umbral_horas_minutos: componente.umbral_horas_minutos,
          fecha_proxima_inspeccion: componente.fecha_proxima_inspeccion,
          motivo: "RESET_POR_EVENTO",
          evento_mantenimiento_id: existente.id,
          registrado_por: session.user.id,
        },
      })
      await tx.componenteMantenimiento.update({
        where: { id: componente.id },
        data: { horas_acumuladas_minutos: 0, editado_por: session.user.id },
      })
    }

    return tx.eventoMantenimiento.update({
      where: { id: eventoId },
      data: {
        tipo: body.tipo ?? existente.tipo,
        componente_id: existente.es_cambio_componente ? existente.componente_id : (nuevoComponenteId ?? existente.componente_id),
        lugar: body.lugar !== undefined ? body.lugar || null : existente.lugar,
        es_cambio_componente: existente.es_cambio_componente || !!body.es_cambio_componente,
        observacion: body.observacion !== undefined ? (`${body.observacion}`.trim() || null) : existente.observacion,
        editado_por: session.user.id,
      },
    })
  })

  return NextResponse.json(actualizado)
})

// ============================================
// DELETE — borra el evento de verdad, deshaciendo en cadena todo lo
// que causó al abrirse:
//   1. Si reseteó un componente, lo restaura al valor que tenía justo
//      antes (usando la foto guardada en el historial) y borra esa
//      fila de historial — dejó de tener sentido, el reseteo nunca
//      "pasó" si el evento que lo originó tampoco existe.
//   2. Si el evento seguía abierto y era el único motivo de que la
//      aeronave estuviera No disponible, la devuelve a Disponible.
// ============================================
export const DELETE = conPermiso("SICEM", "puede_eliminar", async (request, { params }, session) => {
  const { id } = await params
  const eventoId = Number(id)

  const existente = await prisma.eventoMantenimiento.findFirst({
    where: { id: eventoId, deleted_at: null },
  })
  if (!existente) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
  }

  const historialDelReset = existente.es_cambio_componente
    ? await prisma.historialComponenteMantenimiento.findFirst({
        where: { evento_mantenimiento_id: eventoId, motivo: "RESET_POR_EVENTO" },
      })
    : null

  await prisma.$transaction(async (tx) => {
    if (historialDelReset) {
      await tx.componenteMantenimiento.update({
        where: { id: historialDelReset.componente_id },
        data: {
          horas_acumuladas_minutos: historialDelReset.horas_acumuladas_minutos,
          umbral_horas_minutos: historialDelReset.umbral_horas_minutos,
          fecha_proxima_inspeccion: historialDelReset.fecha_proxima_inspeccion,
          editado_por: session.user.id,
        },
      })
      await tx.historialComponenteMantenimiento.delete({ where: { id: historialDelReset.id } })
    }

    await tx.eventoMantenimiento.delete({ where: { id: eventoId } })

    if (!existente.cerrado) {
      const otrosAbiertos = await tx.eventoMantenimiento.count({
        where: { aeronave_id: existente.aeronave_id, cerrado: false, deleted_at: null },
      })
      if (otrosAbiertos === 0) {
        await tx.aeronave.update({
          where: { id: existente.aeronave_id },
          data: { estado: "DISPONIBLE", motivo_no_disponible: null, motivo_otro: null, editado_por: session.user.id },
        })
      }
    }
  })

  return NextResponse.json({ ok: true })
})