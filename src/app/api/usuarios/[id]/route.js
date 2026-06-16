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

    const data = {
      rol_id:      Number(body.rol_id),
      editado_por: session.user.id,
    }

    if (body.password && body.password.trim() !== "") {
      data.password = await bcrypt.hash(body.password, 10)
    }

    if (Number(body.rol_id) === await obtenerIdRolComandante()) {
      const otroComandante = await prisma.usuario.findFirst({
        where: {
          rol:        { nombre: "Comandante" },
          activo:     true,
          deleted_at: null,
          id:         { not: Number(id) },
        },
      })

      if (otroComandante) {
        return NextResponse.json(
          { error: "Ya existe un Comandante activo en el sistema. Cambiá su rol primero antes de asignar uno nuevo." },
          { status: 409 }
        )
      }
    }

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
      select: {
        id:         true,
        username:   true,
        persona_id: true,
        rol_id:     true,
        activo:     true,
        updated_at: true,
      },
    })

    return NextResponse.json(usuario)
  } catch (error) {
    console.error("Error PUT usuarios:", error)
    return NextResponse.json({ error: "Error al editar usuario" }, { status: 500 })
  }
}

async function obtenerIdRolComandante() {
  const rol = await prisma.rol.findUnique({
    where:  { nombre: "Comandante" },
    select: { id: true },
  })
  return rol?.id ?? -1
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    await prisma.usuario.update({
      where: { id: Number(id) },
      data: {
        activo:        false,
        deleted_at:    new Date(),
        eliminado_por: session.user.id,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error DELETE usuarios:", error)
    return NextResponse.json({ error: "Error al desactivar usuario" }, { status: 500 })
  }
}