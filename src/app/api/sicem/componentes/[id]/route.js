// Destino: src/app/api/sicem/componentes/[id]/route.js
//
// PUT    /api/sicem/componentes/:id
// DELETE /api/sicem/componentes/:id
//
// Edita umbral, fecha de calendario, y (excepcionalmente) las horas
// acumuladas de un componente ya creado. No permite cambiar
// aeronave_id ni tipo — son la identidad del componente; si hace falta
// cambiarlos, se crea uno nuevo.
//
// El historial solo se registra cuando el PUT trae de verdad algún
// campo de datos (umbral, horas acumuladas o fecha) — un toggle puro
// de "activo" (desactivar/reactivar desde la tabla) NO genera
// historial, porque no cambió ningún dato real del componente.
//
// DELETE es un borrado REAL (no soft) — se permite si el componente
// nunca tuvo un Evento de Mantenimiento real. Ediciones manuales
// (correcciones de tipeo mientras se está configurando) NO cuentan
// para esto, aunque hayan generado historial — ese historial se borra
// junto con el componente, porque no representa nada operacional
// real. Si ya tiene Eventos, se rechaza y hay que usar el PUT con
// activo:false (desactivar) en su lugar.

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
    const anio = fecha.getFullYear()
    if (anio < 2000 || anio > 2100) return "La fecha de próxima inspección tiene un año fuera de rango"
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

  const esEdicionDeDatos =
    body.umbral_horas_minutos !== undefined ||
    body.horas_acumuladas_minutos !== undefined ||
    body.fecha_proxima_inspeccion !== undefined

  const actualizado = await prisma.$transaction(async (tx) => {
    if (esEdicionDeDatos) {
      await tx.historialComponenteMantenimiento.create({
        data: {
          componente_id: existente.id,
          horas_acumuladas_minutos: existente.horas_acumuladas_minutos,
          umbral_horas_minutos: existente.umbral_horas_minutos,
          fecha_proxima_inspeccion: existente.fecha_proxima_inspeccion,
          motivo: "EDICION_MANUAL",
          registrado_por: session.user.id,
        },
      })
    }

    return tx.componenteMantenimiento.update({
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
  })

  return NextResponse.json(actualizado)
})

export const DELETE = conPermiso("SICEM", "puede_eliminar", async (request, { params }) => {
  const { id } = await params
  const componenteId = Number(id)

  const existente = await prisma.componenteMantenimiento.findFirst({
    where: { id: componenteId, deleted_at: null },
    include: { _count: { select: { eventos: true } } },
  })
  if (!existente) {
    return NextResponse.json({ error: "Componente no encontrado" }, { status: 404 })
  }

  if (existente._count.eventos > 0) {
    return NextResponse.json(
      { error: "Este componente ya tiene eventos de mantenimiento asociados — no se puede eliminar. Desactivalo en su lugar." },
      { status: 409 }
    )
  }

  // Si tiene eventos = 0, cualquier fila de historial que tenga es
  // necesariamente de ediciones manuales (nunca de un reseteo por
  // evento) — no representa nada operacional real, se borra junto
  // con el componente sin perder nada que importe.
  await prisma.$transaction(async (tx) => {
    await tx.historialComponenteMantenimiento.deleteMany({ where: { componente_id: componenteId } })
    await tx.componenteMantenimiento.delete({ where: { id: componenteId } })
  })

  return NextResponse.json({ ok: true })
})