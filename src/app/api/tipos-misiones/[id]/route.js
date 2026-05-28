// src/app/api/tipos-misiones/[id]/route.js
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"

const CLASIFICACIONES_VALIDAS = ["OPERACIONAL", "TIPO_VUELO", "LOGISTICA"]

export async function PUT(request, { params }) {
  try {
    const sesion = await getServerSession(authOptions)
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body   = await request.json()
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

    if (tiene_subtipo && !subtipo?.trim()) {
      return NextResponse.json(
        { error: "Debés ingresar el sub-tipo si marcaste que tiene sub-tipo" },
        { status: 400 }
      )
    }

    // Verificar que no use un código ya existente en otro registro
    const codigoDuplicado = await prisma.tipoMision.findFirst({
      where: { codigo: codigo.toUpperCase(), NOT: { id: parseInt(id) } },
    })

    if (codigoDuplicado) {
      return NextResponse.json(
        { error: `El código ${codigo.toUpperCase()} ya está en uso` },
        { status: 400 }
      )
    }

    const actualizado = await prisma.tipoMision.update({
      where: { id: parseInt(id) },
      data: {
        codigo:        codigo.toUpperCase(),
        nombre,
        clasificacion,
        descripcion:   descripcion   || null,
        tiene_subtipo: tiene_subtipo || false,
        subtipo:       tiene_subtipo ? subtipo.trim() : null,
        editado_por:   sesion.user.id,
      },
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error("Error PUT tipos-misiones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const sesion = await getServerSession(authOptions)
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    await prisma.tipoMision.update({
      where: { id: parseInt(id) },
      data: {
        activo:        false,
        deleted_at:    new Date(),
        eliminado_por: sesion.user.id,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error DELETE tipos-misiones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
