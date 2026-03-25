import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/auth"
import prisma from '@/lib/prisma'

// GET - Listar todos los tipos de misión
export async function GET() {
  try {
    const sesion = await getServerSession(authOptions)
    if (!sesion) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const tipos = await prisma.tipoMision.findMany({
      where: {
        deleted_at: null
      },
      orderBy: [
        { categoria: 'asc' },
        { codigo: 'asc' }
      ]
    })

    return NextResponse.json(tipos)

  } catch (error) {
    console.error('Error al listar tipos de misión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear un nuevo tipo de misión
export async function POST(request) {
  try {
    const sesion = await getServerSession(authOptions)
    if (!sesion) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { codigo, nombre, categoria, descripcion } = body

    // Validaciones básicas
    if (!codigo || !nombre || !categoria) {
      return NextResponse.json(
        { error: 'Código, nombre y categoría son obligatorios' },
        { status: 400 }
      )
    }

    // Verificar que el código no exista ya
    const existente = await prisma.tipoMision.findUnique({
      where: { codigo: codigo.toUpperCase() }
    })

    if (existente) {
      return NextResponse.json(
        { error: `El código ${codigo.toUpperCase()} ya existe` },
        { status: 400 }
      )
    }

    const nuevo = await prisma.tipoMision.create({
      data: {
        codigo: codigo.toUpperCase(),
        nombre,
        categoria,
        descripcion: descripcion || null,
        creado_por: sesion.user.id
      }
    })

    return NextResponse.json(nuevo, { status: 201 })

  } catch (error) {
    console.error('Error al crear tipo de misión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}