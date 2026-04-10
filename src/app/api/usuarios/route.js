import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import bcrypt from "bcryptjs"

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()

    // Verificamos que el username no exista ya
    const existe = await prisma.usuario.findUnique({
      where: { username: body.username },
    })

    if (existe) {
      return NextResponse.json(
        { error: "Ese nombre de usuario ya está en uso" },
        { status: 400 }
      )
    }

    // Verificamos que la persona no tenga ya un usuario
    const personaYaTieneUsuario = await prisma.usuario.findUnique({
      where: { persona_id: Number(body.persona_id) },
    })

    if (personaYaTieneUsuario) {
      return NextResponse.json(
        { error: "Esta persona ya tiene un usuario asignado" },
        { status: 400 }
      )
    }

    // Encriptamos la contraseña antes de guardar
    const passwordHash = await bcrypt.hash(body.password, 10)

    const usuario = await prisma.usuario.create({
      data: {
        username:   body.username,
        password:   passwordHash,
        persona_id: Number(body.persona_id),
        rol_id:     Number(body.rol_id),
        nivel_id:   Number(body.nivel_id),
        creado_por: session.user.id,
      },
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    console.error("Error POST usuarios:", error)
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }
}