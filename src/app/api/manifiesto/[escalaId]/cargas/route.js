// POST /api/manifiesto/<escalaId>/cargas → agrega un ítem de carga.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { validarCarga, usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"

export const POST = conPermiso("MANIFIESTO", "puede_crear", async (request, context, session) => {
  const { escalaId } = await context.params
  const id = parseInt(escalaId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
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

  const body = await request.json()
  const resultado = validarCarga(body)
  if (resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: 400 })
  }

  const carga = await prisma.escalaCarga.create({
    data: { escala_id: id, ...resultado.valor, creado_por: session.user.id },
  })

  return NextResponse.json(carga, { status: 201 })
})