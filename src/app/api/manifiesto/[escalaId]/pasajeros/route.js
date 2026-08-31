// POST /api/manifiesto/<escalaId>/pasajeros → agrega un pasajero.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { validarPasajero, usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"

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
  const resultado = validarPasajero(body)
  if (resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: 400 })
  }

  try {
    const pasajero = await prisma.escalaPasajero.create({
      data: { escala_id: id, ...resultado.valor, creado_por: session.user.id },
    })

    // Primera vez que se toca el manifiesto de esta escala — se marca
    // quién y cuándo lo creó. Solo la primera vez: si ya estaba
    // marcado, no se pisa (no cambia el "creador" original solo porque
    // alguien más agregue un pasajero después).
    // Si ya estaba marcado "sin pasajeros" y ahora cargan uno real,
    // se corrige la contradicción de una sola vez, junto con el resto.
    const dataEscala = { manifiesto_sin_pasajeros: false }
    if (!escala.manifiesto_creado_por) {
      dataEscala.manifiesto_creado_por = session.user.id
      dataEscala.manifiesto_creado_en = new Date()
    }
    await prisma.escala.update({ where: { id }, data: dataEscala })

    return NextResponse.json(pasajero, { status: 201 })
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ese documento ya está cargado en esta escala" }, { status: 409 })
    }
    console.error("Error interno POST pasajeros:", error)
    return NextResponse.json({ error: "Error interno al agregar el pasajero" }, { status: 500 })
  }
})