// Destino: src/app/api/post-vuelo/route.js
//
// GET /api/post-vuelo?q=...
//
// Lista general de escalas relevantes para Post-Vuelo — tanto las que
// todavía están "por reportar" como las que ya se completaron, mismo
// patrón que GET /api/manifiesto: nada desaparece de la lista al
// cerrarse, para que un usuario de matriz pueda entrar a corregir un
// cierre viejo.
//
// CAMBIO: post_vuelos ahora también trae combustible_consumido (antes
// solo el id) — teCorrespondeReportarPostVuelo() lo necesita para
// resaltar en ámbar las escalas donde a Jefe de Combustible le falta
// completar ese campo puntual, aunque el resto del post-vuelo ya esté
// cerrado.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { teCorrespondeReportarPostVuelo } from "@/lib/postVuelo"

export const GET = conSesion("POST_VUELO", async (request, context, session) => {
  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get("q")?.trim()

  const tienePermisoAmplio = !!session.user.permisos?.POST_VUELO?.puede_ver
  const personaId = session.user.personaId

  const escalas = await prisma.escala.findMany({
    where: {
      deleted_at: null,
      estado: { in: ["PROGRAMADA", "CUMPLIDA"] },
      autorizada: true,
      hora_despegue_estimada: { lte: new Date() },
      ...(tienePermisoAmplio
        ? {}
        : {
            OR: [
              { tripulacion: { some: { persona_id: personaId, deleted_at: null } } },
              { acuses: { some: { persona_id: personaId, rol: "SUPERVISOR_SEMANA", deleted_at: null } } },
            ],
          }),
      ...(busqueda
        ? {
            AND: [
              {
                OR: [
                  { nro_orden: { contains: busqueda, mode: "insensitive" } },
                  { aeronave: { matricula: { contains: busqueda, mode: "insensitive" } } },
                  { itinerarios: { some: { origen: { contains: busqueda, mode: "insensitive" } } } },
                  { itinerarios: { some: { destino: { contains: busqueda, mode: "insensitive" } } } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: { hora_despegue_estimada: "desc" },
    select: {
      id: true,
      nro_orden: true,
      fecha: true,
      hora_despegue_estimada: true,
      hora_arribo_estimada: true,
      solicitante: true,
      estado: true,
      autorizada: true,
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
          persona_id: true,
          rol_en_vuelo: true,
          persona: { select: { grado: true, apellido: true } },
        },
      },
      post_vuelos: {
        where: { deleted_at: null },
        select: { id: true, combustible_consumido: true },
        take: 1,
      },
    },
  })

  const resultado = escalas.map((e) => {
    const postVuelo = e.post_vuelos[0] ?? null
    const { post_vuelos, ...resto } = e
    return {
      ...resto,
      tiene_post_vuelo: !!postVuelo,
      te_corresponde: teCorrespondeReportarPostVuelo(session, e, postVuelo),
    }
  })

  return NextResponse.json(resultado)
})