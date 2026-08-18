// PUT /api/manifiesto/<escalaId>/cerrar → cierra el manifiesto de esta
// escala. A partir de acá, usuarioPuedeGestionarManifiesto() bloquea a
// todos menos a los roles de matriz — se puede cerrar en 0 pasajeros y
// 0 cargas (ej. vuelo sin pasajeros, o vuelo puramente de carga).

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
      manifiesto_cerrado: true,
      tripulacion: { where: { deleted_at: null }, select: { persona_id: true } },
      acuses: { where: { deleted_at: null, rol: "SUPERVISOR_SEMANA" }, select: { persona_id: true } },
    },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  if (!usuarioPuedeGestionarManifiesto(session, escala)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (escala.manifiesto_cerrado) {
    return NextResponse.json({ error: "Este manifiesto ya está cerrado" }, { status: 409 })
  }

  const actualizada = await prisma.escala.update({
    where: { id },
    data: {
      manifiesto_cerrado: true,
      manifiesto_cerrado_por: session.user.id,
      manifiesto_cerrado_en: new Date(),
      editado_por: session.user.id,
    },
  })

  return NextResponse.json({ ok: true, manifiesto_cerrado_en: actualizada.manifiesto_cerrado_en })
})