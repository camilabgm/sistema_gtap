// Destino: src/app/api/acuses/pendientes/route.js
//
// GET — todos los acuses de recibo pendientes de la persona logueada,
// sin importar en qué escala. Se usa para el contador del menú.

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
    if (!session.user.personaId) {
      return NextResponse.json([])
    }

    const acuses = await prisma.acuseRecibo.findMany({
      where: { persona_id: session.user.personaId, fecha_acuse: null, deleted_at: null },
      select: {
        id: true,
        escala_id: true,
        rol: true,
        escala: {
          select: {
            nro_orden: true,
            hora_despegue_estimada: true,
            aeronave: { select: { matricula: true } },
          },
        },
      },
    })

    return NextResponse.json(acuses)
  } catch (error) {
    console.error("Error GET acuses pendientes:", error)
    return NextResponse.json({ error: "Error interno al obtener los acuses pendientes" }, { status: 500 })
  }
}