// Destino: src/app/api/sicem/eventos/[id]/cerrar/route.js
//
// PATCH /api/sicem/eventos/:id/cerrar
//
// Ruta dedicada para una sola acción puntual — mismo criterio que
// post-vuelo/combustible/route.js. Cierra el evento y, si la aeronave
// no tiene ningún otro evento abierto, la devuelve a DISPONIBLE. Si le
// queda otro evento abierto (ej. un cambio de hélice programado
// mientras se resuelve un incidente aparte), la aeronave sigue
// NO_DISPONIBLE hasta que se cierre también ese otro.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { puedeVolverADisponible } from "@/lib/sicem"

export const PATCH = conPermiso("SICEM", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const eventoId = Number(id)

  const evento = await prisma.eventoMantenimiento.findFirst({
    where: { id: eventoId, deleted_at: null },
  })
  if (!evento) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
  }
  if (evento.cerrado) {
    return NextResponse.json({ error: "Este evento ya está cerrado" }, { status: 409 })
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const cerrado = await tx.eventoMantenimiento.update({
      where: { id: eventoId },
      data: { cerrado: true, cerrado_por: session.user.id, cerrado_en: new Date() },
    })

    const otrosAbiertos = await tx.eventoMantenimiento.count({
      where: {
        aeronave_id: evento.aeronave_id,
        cerrado: false,
        deleted_at: null,
        id: { not: eventoId },
      },
    })

    if (puedeVolverADisponible(otrosAbiertos)) {
      await tx.aeronave.update({
        where: { id: evento.aeronave_id },
        data: { estado: "DISPONIBLE", motivo_no_disponible: null, editado_por: session.user.id },
      })
    }

    return cerrado
  })

  return NextResponse.json(actualizado)
})