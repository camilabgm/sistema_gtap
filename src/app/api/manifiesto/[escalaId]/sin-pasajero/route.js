// Destino: src/app/api/manifiesto/[escalaId]/sin-pasajeros/route.js
//
// PUT — declara explícitamente "no hubo pasajeros en esta escala".
// Existe para distinguir "todavía nadie lo revisó" de "ya se revisó y
// no había nadie" — las dos se ven idénticas en pantalla si no se
// declara nada (0 pasajeros en los dos casos).
//
// Reutiliza manifiesto_creado_por/en — confirmar "sin pasajeros" cuenta
// como la primera vez que alguien trabajó el manifiesto, igual que
// cargar un pasajero real. No hace falta un campo de auditoría aparte.

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

  const hayPasajeros = await prisma.escalaPasajero.count({
    where: { escala_id: id, deleted_at: null },
  })
  if (hayPasajeros > 0) {
    return NextResponse.json(
      { error: "No se puede confirmar 'sin pasajeros' — ya hay pasajeros cargados en esta escala" },
      { status: 409 }
    )
  }

  const data = { manifiesto_sin_pasajeros: true, editado_por: session.user.id }
  // Solo la primera vez — no pisa un manifiesto_creado_por que ya
  // exista de antes (ej. si primero cargaron carga y ahora confirman
  // que no hay pasajeros).
  if (!escala.manifiesto_creado_por) {
    data.manifiesto_creado_por = session.user.id
    data.manifiesto_creado_en = new Date()
  }

  await prisma.escala.update({ where: { id }, data })

  return NextResponse.json({ ok: true })
})