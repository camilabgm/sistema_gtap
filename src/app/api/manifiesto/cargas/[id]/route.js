// PUT    /api/manifiesto/cargas/<id> → edita un ítem de carga
// DELETE /api/manifiesto/cargas/<id> → borrado lógico

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { validarCarga, usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"

async function buscarCargaConEscala(id) {
  return prisma.escalaCarga.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      escala_id: true,
      escala: {
        select: {
          id: true,
          estado: true,
          hora_despegue_estimada: true,
          manifiesto_cerrado: true,
        },
      },
    },
  })
}

export const PUT = conSesion("MANIFIESTO", async (request, context, session) => {
  const { id } = await context.params
  const cargaId = parseInt(id, 10)
  if (!Number.isInteger(cargaId) || cargaId <= 0) {
    return NextResponse.json({ error: "Id de carga inválido" }, { status: 400 })
  }

  const carga = await buscarCargaConEscala(cargaId)
  if (!carga) {
    return NextResponse.json({ error: "Carga no encontrada" }, { status: 404 })
  }
  if (!usuarioPuedeGestionarManifiesto(session, carga.escala)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const resultado = validarCarga(body)
  if (resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: 400 })
  }

  const actualizada = await prisma.escalaCarga.update({
    where: { id: cargaId },
    data: { ...resultado.valor, editado_por: session.user.id },
  })

  return NextResponse.json(actualizada)
})

export const DELETE = conSesion("MANIFIESTO", async (request, context, session) => {
  const { id } = await context.params
  const cargaId = parseInt(id, 10)
  if (!Number.isInteger(cargaId) || cargaId <= 0) {
    return NextResponse.json({ error: "Id de carga inválido" }, { status: 400 })
  }

  const carga = await buscarCargaConEscala(cargaId)
  if (!carga) {
    return NextResponse.json({ error: "Carga no encontrada" }, { status: 404 })
  }
  if (!usuarioPuedeGestionarManifiesto(session, carga.escala)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  await prisma.escalaCarga.update({
    where: { id: cargaId },
    data: { deleted_at: new Date(), eliminado_por: session.user.id },
  })

  return NextResponse.json({ ok: true })
})