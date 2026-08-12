// Destino: src/app/api/usuarios/[id]/reactivar/route.js
//
// PUT /api/usuarios/<id>/reactivar
//
// Reactiva el Usuario — pero rechaza si su Persona sigue inactiva. Un
// Usuario nunca puede estar activo si su Persona no lo está.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

export const PUT = conPermiso("PERSONAS", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const usuarioId = Number(id)

  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId },
    select: {
      activo: true,
      persona: { select: { activo: true, apellido: true, nombre: true } },
    },
  })
  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }
  if (usuario.activo) {
    return NextResponse.json({ error: "Este usuario ya está activo" }, { status: 409 })
  }
  if (!usuario.persona.activo) {
    return NextResponse.json(
      { error: `${usuario.persona.apellido}, ${usuario.persona.nombre} está inactiva — reactivá primero a la persona antes de reactivar su acceso al sistema` },
      { status: 400 }
    )
  }

  const actualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      activo:        true,
      deleted_at:    null,
      eliminado_por: null,
      editado_por:   session.user.id,
    },
  })

  return NextResponse.json({ ok: true, id: actualizado.id })
})