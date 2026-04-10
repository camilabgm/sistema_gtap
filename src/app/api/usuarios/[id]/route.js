import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import bcrypt from "bcryptjs"

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body   = await request.json()

    // Construimos el objeto de datos a actualizar
    // La contraseña solo se actualiza si el usuario mandó una nueva
    const data = {
      rol_id:     Number(body.rol_id),
      nivel_id:   Number(body.nivel_id),
      editado_por: session.user.id,
    }

    // Si mandaron contraseña nueva la encriptamos y la incluimos
    if (body.password && body.password.trim() !== "") {
      data.password = await bcrypt.hash(body.password, 10)
    }

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data,
    })

    return NextResponse.json(usuario)
  } catch (error) {
    console.error("Error PUT usuarios:", error)
    return NextResponse.json({ error: "Error al editar usuario" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: {
        activo:        false,
        deleted_at:    new Date(),
        eliminado_por: session.user.id,
      },
    })

    return NextResponse.json(usuario)
  } catch (error) {
    console.error("Error DELETE usuarios:", error)
    return NextResponse.json({ error: "Error al desactivar usuario" }, { status: 500 })
  }
}