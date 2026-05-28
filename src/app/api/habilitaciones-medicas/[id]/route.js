// src/app/api/habilitaciones-medicas/[id]/route.js
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    await prisma.habilitacionMedica.update({
      where: { id: parseInt(id) },
      data: {
        deleted_at:    new Date(),
        eliminado_por: session.user.id,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error DELETE habilitaciones-medicas:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
