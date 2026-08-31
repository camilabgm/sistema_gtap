// POST /api/manifiesto/<escalaId>/cargas → agrega un ítem de carga.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { validarCarga, usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"

export const POST = conSesion("MANIFIESTO", async (request, context, session) => {
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

  const body = await request.json()
  const resultado = validarCarga(body)
  if (resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: 400 })
  }

  const carga = await prisma.escalaCarga.create({
    data: { escala_id: id, ...resultado.valor, creado_por: session.user.id },
  })

  // Mismo mecanismo que en pasajeros — si lo primero que se carga en
  // este manifiesto es una carga (no un pasajero), igual queda marcado
  // quién lo creó.
  const dataEscala = { manifiesto_sin_carga: false }
  if (!escala.manifiesto_creado_por) {
    dataEscala.manifiesto_creado_por = session.user.id
    dataEscala.manifiesto_creado_en = new Date()
  }
  await prisma.escala.update({ where: { id }, data: dataEscala })

  return NextResponse.json(carga, { status: 201 })
})