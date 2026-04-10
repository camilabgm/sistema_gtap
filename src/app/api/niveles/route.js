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

    const niveles = await prisma.nivelAcceso.findMany({
      orderBy: { nivel: "asc" },
    })

    return NextResponse.json(niveles)
  } catch (error) {
    console.error("Error GET niveles:", error)
    return NextResponse.json({ error: "Error al obtener niveles" }, { status: 500 })
  }
}