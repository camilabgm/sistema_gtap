import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body   = await request.json()

    const data = {
      rol_id:      Number(body.rol_id),
      editado_por: session.user.id,
    }

    if (body.password && body.password.trim() !== "") {
      data.password = await bcrypt.hash(body.password, 10)
    }

    // Si cambia el rol invalidamos la sesión del usuario afectado
    const usuarioActual = await prisma.usuario.findUnique({
      where:  { id: Number(id) },
      select: { rol_id: true },
    })

    if (usuarioActual?.rol_id !== Number(body.rol_id)) {
      data.sesion_invalidada_en = new Date()
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