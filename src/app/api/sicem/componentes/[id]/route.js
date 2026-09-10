// Destino: src/app/api/sicem/componentes/[id]/route.js
//
// PUT /api/sicem/componentes/:id
//
// Edita umbral, fecha de calendario, y (excepcionalmente) las horas
// acumuladas de un componente ya creado. No permite cambiar
// aeronave_id ni tipo — son la identidad del componente; si hace falta
// cambiarlos, se crea uno nuevo.
//
// horas_acumuladas_minutos queda editable acá para el caso manual
// (APU) y para correcciones puntuales de MOTOR/HELICE — pero en el uso
// normal esos dos se actualizan solos al cerrar un tramo de
// Post-Vuelo (ver sincronizarSicemPorTramo en post-vuelo/route.js), no
// por acá.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

function validarEdicionComponente(body) {
  if (body.umbral_horas_minutos !== undefined && body.umbral_horas_minutos !== null) {
    const umbral = Number(body.umbral_horas_minutos)
    if (!Number.isInteger(umbral) || umbral < 0) return "El umbral de horas no es válido"
  }

  if (body.horas_acumuladas_minutos !== undefined && body.horas_acumuladas_minutos !== null) {
    const horas = Number(body.horas_acumuladas_minutos)
    if (!Number.isInteger(horas) || horas < 0) return "Las horas acumuladas no son válidas"
  }

  if (body.fecha_proxima_inspeccion) {
    const fecha = new Date(body.fecha_proxima_inspeccion)
    if (isNaN(fecha.getTime())) return "La fecha de próxima inspección no es válida"
  }

  return null
}

export const PUT = conPermiso("SICEM", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const componenteId = Number(id)

  const existente = await prisma.componenteMantenimiento.findFirst({
    where: { id: componenteId, deleted_at: null },
  })
  if (!existente) {
    return NextResponse.json({ error: "Componente no encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const errorValidacion = validarEdicionComponente(body)
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 })
  }

  const actualizado = await prisma.componenteMantenimiento.update({
    where: { id: componenteId },
    data: {
      umbral_horas_minutos:
        body.umbral_horas_minutos !== undefined && body.umbral_horas_minutos !== null
          ? Number(body.umbral_horas_minutos)
          : existente.umbral_horas_minutos,
      horas_acumuladas_minutos:
        body.horas_acumuladas_minutos !== undefined && body.horas_acumuladas_minutos !== null
          ? Number(body.horas_acumuladas_minutos)
          : existente.horas_acumuladas_minutos,
      fecha_proxima_inspeccion: body.fecha_proxima_inspeccion
        ? new Date(body.fecha_proxima_inspeccion)
        : existente.fecha_proxima_inspeccion,
      activo: body.activo !== undefined ? !!body.activo : existente.activo,
      editado_por: session.user.id,
    },
  })

  return NextResponse.json(actualizado)
})