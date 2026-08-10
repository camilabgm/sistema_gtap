// Destino: src/app/api/escalas/[id]/publicar/route.js
//
// PUT /api/escalas/<id>/publicar — transición de BORRADOR a OFICIAL.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"

export const PUT = conPermiso("ESCALAS", "puede_editar", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const nroOrden = typeof body.nro_orden === "string" ? (body.nro_orden.trim() || null) : undefined

  const escala = await prisma.escala.findFirst({
    where: { id: escalaId, deleted_at: null },
    select: {
      es_borrador: true,
      fecha: true,
      aeronave_id: true,
      tipo_mision_id: true,
      itinerarios: {
        where: { deleted_at: null },
        select: { hora_estimada_salida: true, hora_estimada_llegada: true },
      },
      tripulacion: {
        where: { deleted_at: null },
        select: { persona_id: true },
      },
    },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }
  if (!escala.es_borrador) {
    return NextResponse.json({ error: "La escala ya está publicada" }, { status: 409 })
  }

  const faltantes = []
  if (!escala.aeronave_id) faltantes.push("aeronave")
  if (!escala.tipo_mision_id) faltantes.push("tipo de misión")
  if (escala.itinerarios.length === 0) faltantes.push("itinerario")
  if (escala.tripulacion.length === 0) faltantes.push("tripulación")
  if (faltantes.length > 0) {
    return NextResponse.json(
      { error: `Faltan datos para publicar: ${faltantes.join(", ")}` },
      { status: 400 }
    )
  }

  const ventana = calcularVentana(escala.itinerarios)
  const motivos = []

  const chequeoAeronave = await verificarAeronave(escala.aeronave_id, ventana, escalaId)
  if (!chequeoAeronave.ok) motivos.push(chequeoAeronave.motivo)

  for (const t of escala.tripulacion) {
    const chequeoPersona = await verificarTripulante(t.persona_id, escala.fecha, ventana, escalaId)
    if (!chequeoPersona.ok) motivos.push(chequeoPersona.motivo)
  }

  if (motivos.length > 0) {
    return NextResponse.json(
      { error: "No se puede publicar por conflictos de disponibilidad", detalles: motivos },
      { status: 409 }
    )
  }

  const { autorizantePersonaId, pasos } = await calcularAutorizanteActivo()
  if (!autorizantePersonaId) {
    return NextResponse.json(
      { error: "No hay ningún autorizante disponible en este momento. No se puede publicar la escala." },
      { status: 409 }
    )
  }

  const actualizada = await prisma.$transaction(async (tx) => {
    const dataEscala = {
      es_borrador: false,
      editado_por: session.user.id,
    }
    if (nroOrden !== undefined) dataEscala.nro_orden = nroOrden

    const escalaPublicada = await tx.escala.update({
      where: { id: escalaId },
      data: dataEscala,
    })

    for (const paso of pasos) {
      await tx.escalaAutorizacion.create({
        data: {
          escala_id: escalaId,
          rol_autorizador: paso.rol_autorizador,
          persona_id: paso.persona_id,
          motivo_escalamiento: paso.motivo_escalamiento,
          autorizo: false,
          creado_por: session.user.id,
        },
      })
    }

    return escalaPublicada
  })

  return NextResponse.json(actualizada)
})