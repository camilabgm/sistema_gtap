// src/app/api/parte-diario/route.js
//
// Migrado de PERSONAS a su propio módulo PARTE_DIARIO — antes vivía
// piggybacked sobre los permisos de Personas, ahora tiene los suyos
// propios en la matriz (ver seed.js).
//
// FIX: el POST ya no hace upsert silencioso — si ya existe una
// novedad activa para esa persona hoy, devuelve error en vez de
// pisarla sin que el usuario lo pida explícitamente. Corregir una
// novedad ya cargada es ahora una acción separada (PUT), gateada por
// puede_editar — no puede_crear — mismo criterio que Tipos de Misión
// (crear y editar son permisos distintos, no una sola acción).
//
// FIX: el DELETE ahora exige puede_eliminar (antes pedía puede_editar
// por error — no coincidía con el botón "Quitar novedad" del
// frontend, que se muestra según puede_eliminar).

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { normalizarFechaSoloDia, hoyEnParaguay } from "@/lib/fechaSoloDia"

export const GET = conPermiso("PARTE_DIARIO", "puede_ver", async (request, context, session) => {
  const { searchParams } = new URL(request.url)
  const fechaParam = searchParams.get("fecha")
  const fecha = fechaParam ? normalizarFechaSoloDia(fechaParam) : hoyEnParaguay()

  const novedades = await prisma.parteDiario.findMany({
    where: { fecha, deleted_at: null },
    include: {
      persona: {
        select: { id: true, nombre: true, apellido: true, grado: true, escuadron: true },
      },
    },
    orderBy: { created_at: "asc" },
  })

  return NextResponse.json({ novedades, fecha: fecha.toISOString().slice(0, 10) })
})

export const POST = conPermiso("PARTE_DIARIO", "puede_crear", async (request, context, session) => {
  const body = await request.json()
  const { persona_id, observacion } = body

  if (!persona_id) {
    return NextResponse.json({ error: "persona_id es obligatorio" }, { status: 400 })
  }

  const fecha = hoyEnParaguay()

  // FIX: antes esto era un upsert silencioso — si la persona ya
  // tenía novedad hoy, la pisaba sin avisar. Ahora se rechaza acá, y
  // corregirla pasa a ser una acción explícita de EDITAR (ver PUT).
  const existente = await prisma.parteDiario.findUnique({
    where: { fecha_persona_id: { fecha, persona_id: parseInt(persona_id) } },
  })
  if (existente && !existente.deleted_at) {
    return NextResponse.json(
      { error: "Esta persona ya tiene una novedad cargada hoy. Editala en vez de crear una nueva." },
      { status: 409 }
    )
  }

  const novedad = await prisma.parteDiario.upsert({
    where:  { fecha_persona_id: { fecha, persona_id: parseInt(persona_id) } },
    update: { observacion: observacion || null, deleted_at: null, eliminado_por: null },
    create: { fecha, persona_id: parseInt(persona_id), observacion: observacion || null, creado_por: session.user.id },
    include: {
      persona: { select: { id: true, nombre: true, apellido: true, grado: true } },
    },
  })

  return NextResponse.json(novedad, { status: 201 })
})

export const PUT = conPermiso("PARTE_DIARIO", "puede_editar", async (request, context, session) => {
  const body = await request.json()
  const { novedadId, observacion } = body

  if (!novedadId) {
    return NextResponse.json({ error: "novedadId es obligatorio" }, { status: 400 })
  }

  const novedad = await prisma.parteDiario.update({
    where: { id: parseInt(novedadId) },
    data:  { observacion: observacion || null, editado_por: session.user.id },
    include: {
      persona: { select: { id: true, nombre: true, apellido: true, grado: true } },
    },
  })

  return NextResponse.json(novedad)
})

export const DELETE = conPermiso("PARTE_DIARIO", "puede_eliminar", async (request, context, session) => {
  const { searchParams } = new URL(request.url)
  const novedadId = parseInt(searchParams.get("novedadId"))

  if (!novedadId) {
    return NextResponse.json({ error: "novedadId es obligatorio" }, { status: 400 })
  }

  await prisma.parteDiario.update({
    where: { id: novedadId },
    data:  { deleted_at: new Date(), eliminado_por: session.user.id },
  })

  return NextResponse.json({ ok: true })
})