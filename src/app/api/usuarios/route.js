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

  // Rol secundario — mismo candado que en usuarios/[id]/route.js: nunca
  // puede ser Comandante.
  if (body.rol_secundario_id) {
    const rolComandante = await prisma.rol.findUnique({
      where:  { nombre: "Comandante" },
      select: { id: true },
    })
    if (Number(body.rol_secundario_id) === rolComandante?.id) {
      return NextResponse.json({ error: "El rol secundario no puede ser Comandante" }, { status: 400 })
    }
  }

  const passwordHash = await bcrypt.hash(body.password, 10)

  const usuario = await prisma.usuario.create({
    data: {
      username:   String(body.username),
      password:   passwordHash,
      persona_id: Number(body.persona_id),
      rol_id:     Number(body.rol_id),
      rol_secundario_id:           body.rol_secundario_id ? Number(body.rol_secundario_id) : null,
      rol_secundario_combina:      body.rol_secundario_id ? !!body.rol_secundario_combina : true,
      rol_secundario_asignado_por: body.rol_secundario_id ? session.user.id : null,
      rol_secundario_desde:        body.rol_secundario_id ? new Date() : null,
      creado_por: session.user.id,
    },
    select: {
      id:         true,
      username:   true,
      persona_id: true,
      rol_id:     true,
      rol_secundario_id:      true,
      rol_secundario_combina: true,
      activo:     true,
      created_at: true,
    },
  })

  return NextResponse.json(usuario, { status: 201 })
})