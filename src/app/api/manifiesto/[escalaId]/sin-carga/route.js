// Destino: src/app/api/manifiesto/[escalaId]/sin-carga/route.js
//
// PUT — declara explícitamente "no hubo carga en esta escala". Mismo
// mecanismo que sin-pasajeros, campo aparte porque son dos cosas
// independientes: puede haber pasajeros sin carga, o carga sin
// pasajeros.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"

export const PUT = conSesion("MANIFIESTO", async (request, context, session) => {
  const { escalaId } = await context.params
  const id = parseInt(escalaId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      estado: true,
      hora_despegue_estimada: true,
      manifiesto_cerrado: true,
      manifiesto_creado_por: true,
    },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }
  if (!usuarioPuedeGestionarManifiesto(session, escala)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const hayCarga = await prisma.escalaCarga.count({
    where: { escala_id: id, deleted_at: null },
  })
  if (hayCarga > 0) {
    return NextResponse.json(
      { error: "No se puede confirmar 'sin carga' — ya hay carga cargada en esta escala" },
      { status: 409 }
    )
  }

  const data = { manifiesto_sin_carga: true, editado_por: session.user.id }
  if (!escala.manifiesto_creado_por) {
    data.manifiesto_creado_por = session.user.id
    data.manifiesto_creado_en = new Date()
  }

  await prisma.escala.update({ where: { id }, data })

  return NextResponse.json({ ok: true })
})