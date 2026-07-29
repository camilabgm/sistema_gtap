import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

const CLASIFICACIONES_VALIDAS = ["OPERACIONAL", "TIPO_VUELO", "LOGISTICA"]

export const GET = conPermiso("TIPOS_MISIONES", "puede_ver", async (request, context, session) => {
  const tipos = await prisma.tipoMision.findMany({
    where:   { deleted_at: null },
    orderBy: [{ clasificacion: "asc" }, { codigo: "asc" }],
  })

  return NextResponse.json(tipos)
})

export const POST = conPermiso("TIPOS_MISIONES", "puede_crear", async (request, context, session) => {
  const body = await request.json()
  const { codigo, nombre, clasificacion, descripcion, tiene_subtipo, subtipo } = body

  if (!codigo || !nombre || !clasificacion) {
    return NextResponse.json(
      { error: "Código, nombre y clasificación son obligatorios" },
      { status: 400 }
    )
  }

  if (!CLASIFICACIONES_VALIDAS.includes(clasificacion)) {
    return NextResponse.json(
      { error: "Clasificación inválida" },
      { status: 400 }
    )
  }

  // Si tiene subtipo, el campo subtipo no puede estar vacío
  if (tiene_subtipo && !subtipo?.trim()) {
    return NextResponse.json(
      { error: "Debés ingresar el sub-tipo si marcaste que tiene sub-tipo" },
      { status: 400 }
    )
  }

  // Verificar que el código no exista ya
  const existente = await prisma.tipoMision.findUnique({
    where: { codigo: codigo.toUpperCase() },
  })

  if (existente) {
    return NextResponse.json(
      { error: `El código ${codigo.toUpperCase()} ya existe` },
      { status: 400 }
    )
  }

  const nuevo = await prisma.tipoMision.create({
    data: {
      codigo:        codigo.toUpperCase(),
      nombre,
      clasificacion,
      descripcion:   descripcion   || null,
      tiene_subtipo: tiene_subtipo || false,
      subtipo:       tiene_subtipo ? subtipo.trim() : null,
      creado_por:    session.user.id,
    },
  })

  return NextResponse.json(nuevo, { status: 201 })
})