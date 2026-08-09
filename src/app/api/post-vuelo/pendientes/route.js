// Destino: src/app/api/post-vuelo/pendientes/route.js
//
// GET /api/post-vuelo/pendientes
//
// Escalas listas para cargarles el post-vuelo. Con permiso amplio
// (POST_VUELO.puede_ver) se ven todas; sin ese permiso, solo las que
// tienen a la persona como tripulante.
//
// Devuelve el mismo shape que GET /api/escalas (aeronave, itinerarios,
// tripulación, etc.) — así la pantalla de la Cola puede reusar
// PanelDetalleEscala directamente al expandir una fila, sin necesitar
// un fetch aparte solo para traer los datos básicos de la escala.

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

    const tienePermisoAmplio = !!session.user.permisos?.POST_VUELO?.puede_ver

    const escalas = await prisma.escala.findMany({
      where: {
        estado: "PROGRAMADA",
        autorizada: true,
        deleted_at: null,
        hora_despegue_estimada: { lte: new Date() },
        ...(tienePermisoAmplio
          ? {}
          : { tripulacion: { some: { persona_id: session.user.personaId, deleted_at: null } } }),
      },
      orderBy: { hora_despegue_estimada: "asc" },
      select: {
        id: true,
        nro_orden: true,
        fecha: true,
        hora_despegue_estimada: true,
        hora_arribo_estimada: true,
        solicitante: true,
        estado: true,
        autorizada: true,
        motivo_abortada: true,
        observacion_aborto: true,
        motivo_rechazo: true,
        aeronave: { select: { matricula: true } },
        tipo_mision: { select: { codigo: true } },
        itinerarios: {
          where: { deleted_at: null },
          orderBy: { orden: "asc" },
          select: { orden: true, origen: true, destino: true },
        },
        tripulacion: {
          where: { deleted_at: null },
          select: {
            rol_en_vuelo: true,
            persona: { select: { grado: true, apellido: true } },
          },
        },
      },
    })

    return NextResponse.json(escalas)
  } catch (error) {
    console.error("Error GET post-vuelo pendientes:", error)
    return NextResponse.json({ error: "Error interno al obtener los pendientes" }, { status: 500 })
  }
}