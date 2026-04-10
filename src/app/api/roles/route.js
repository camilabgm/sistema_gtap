import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const roles = await prisma.rol.findMany({
      where:   { deleted_at: null },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(roles)
  } catch (error) {
    console.error("Error GET roles:", error)
    return NextResponse.json({ error: "Error al obtener roles" }, { status: 500 })
  }
}