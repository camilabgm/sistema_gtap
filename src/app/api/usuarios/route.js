import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import bcrypt from "bcryptjs"

export const POST = conPermiso("PERSONAS", "puede_editar", async (request, context, session) => {
  const body = await request.json()

  const existe = await prisma.usuario.findUnique({
    where: { username: body.username },
  })

  if (existe) {
    return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 400 })
  }

  const personaYaTieneUsuario = await prisma.usuario.findUnique({
    where: { persona_id: Number(body.persona_id) },
  })

  if (personaYaTieneUsuario) {
    return NextResponse.json({ error: "Esta persona ya tiene un usuario asignado" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(body.password, 10)

  const usuario = await prisma.usuario.create({
    data: {
      username:   String(body.username),
      password:   passwordHash,
      persona_id: Number(body.persona_id),
      rol_id:     Number(body.rol_id),
      creado_por: session.user.id,
    },
    select: {
      id:         true,
      username:   true,
      persona_id: true,
      rol_id:     true,
      activo:     true,
      created_at: true,
    },
  })

  return NextResponse.json(usuario, { status: 201 })
})