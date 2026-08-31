// GET /api/manifiesto → lista de escalas para el panel izquierdo:
// fecha, estado, ruta, aeronave, cantidad de pasajeros cargados, y si
// el manifiesto ya está cerrado + si le corresponde completarlo a
// quien está pidiendo la lista (para el resaltado en pantalla).

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { teCorrespondeCompletarManifiesto } from "@/lib/manifiesto"

export const GET = conPermiso("MANIFIESTO", "puede_ver", async (request, context, session) => {
  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get("q")?.trim()

  const escalas = await prisma.escala.findMany({
    where: {
      deleted_at: null,
      ...(busqueda
        ? {
            OR: [
              { nro_orden: { contains: busqueda, mode: "insensitive" } },
              { aeronave: { matricula: { contains: busqueda, mode: "insensitive" } } },
              { itinerarios: { some: { origen: { contains: busqueda, mode: "insensitive" } } } },
              { itinerarios: { some: { destino: { contains: busqueda, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: { hora_despegue_estimada: "desc" },
    select: {
      id: true,
      nro_orden: true,
      fecha: true,
      estado: true,
      hora_despegue_estimada: true,
      manifiesto_cerrado: true,
      aeronave: { select: { matricula: true, tipo: true } },
      itinerarios: {
        where: { deleted_at: null },
        orderBy: { orden: "asc" },
        select: { orden: true, origen: true, destino: true },
      },
      _count: { select: { pasajeros: { where: { deleted_at: null } } } },
    },
  })

  const resultado = escalas.map((e) => {
    const primero = e.itinerarios[0]
    const ultimo = e.itinerarios[e.itinerarios.length - 1]
    return {
      id: e.id,
      nro_orden: e.nro_orden,
      fecha: e.fecha,
      estado: e.estado,
      hora_despegue_estimada: e.hora_despegue_estimada,
      origen: primero?.origen ?? null,
      destino: ultimo?.destino ?? null,
      aeronave_matricula: e.aeronave?.matricula ?? null,
      cantidad_pasajeros: e._count.pasajeros,
      manifiesto_cerrado: e.manifiesto_cerrado,
      te_corresponde: teCorrespondeCompletarManifiesto(session, e),
    }
  })

  return NextResponse.json(resultado)
})