import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

// PUT - Editar un tipo de misión
export async function PUT(request, { params }) {
  try {
    const sesion = await getServerSession(authOptions)
    if (!sesion) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const id = parseInt(params.id)
    const body = await request.json()
    const { codigo, nombre, categoria, descripcion } = body

    // Validaciones básicas
    if (!codigo || !nombre || !categoria) {
      return NextResponse.json(
        { error: 'Código, nombre y categoría son obligatorios' },
        { status: 400 }
      )
    }

    // Verificar que exista y no esté eliminado
    const existente = await prisma.tipoMision.findFirst({
      where: {
        id,
        deleted_at: null
      }
    })

    if (!existente) {
      return NextResponse.json(
        { error: 'Tipo de misión no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el código no lo use otro registro
    const codigoDuplicado = await prisma.tipoMision.findFirst({
      where: {
        codigo: codigo.toUpperCase(),
        NOT: { id }
      }
    })

    if (codigoDuplicado) {
      return NextResponse.json(
        { error: `El código ${codigo.toUpperCase()} ya está en uso` },
        { status: 400 }
      )
    }

    const actualizado = await prisma.tipoMision.update({
      where: { id },
      data: {
        codigo: codigo.toUpperCase(),
        nombre,
        categoria,
        descripcion: descripcion || null,
        editado_por: sesion.user.id
      }
    })

    return NextResponse.json(actualizado)

  } catch (error) {
    console.error('Error al editar tipo de misión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete (desactivar)
export async function DELETE(request, { params }) {
  try {
    const sesion = await getServerSession(authOptions)
    if (!sesion) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const id = parseInt(params.id)

    // Verificar que exista y no esté ya eliminado
    const existente = await prisma.tipoMision.findFirst({
      where: {
        id,
        deleted_at: null
      }
    })

    if (!existente) {
      return NextResponse.json(
        { error: 'Tipo de misión no encontrado' },
        { status: 404 }
      )
    }

    const eliminado = await prisma.tipoMision.update({
      where: { id },
      data: {
        activo: false,
        deleted_at: new Date(),
        eliminado_por: sesion.user.id
      }
    })

    return NextResponse.json(eliminado)

  } catch (error) {
    console.error('Error al eliminar tipo de misión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}