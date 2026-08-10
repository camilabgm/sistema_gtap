// Destino: src/app/api/post-vuelo/pendientes/route.js
//
// GET /api/post-vuelo/pendientes — con permiso amplio ve todas, sin
// permiso amplio se autofiltra por tripulante.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"

export const GET = conSesion("POST_VUELO", async (request, context, session) => {
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
})