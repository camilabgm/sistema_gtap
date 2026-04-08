import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// ============================================
// PUT — edita una aeronave existente
// ============================================
export async function PUT(request, { params }) {
  try {
    // Verificamos que el usuario esté logueado
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // En Next.js 15 params debe ser esperado con await
    const { id } = await params
    const body = await request.json()

    // Actualizamos la aeronave con el id recibido en la URL
    const aeronave = await prisma.aeronave.update({
      where: { id: Number(id) },
      data: {
        matricula:           body.matricula,
        tipo:                body.tipo,
        fabricante:          body.fabricante,
        anio_fabricacion:    Number(body.anio_fabricacion),
        anio_incorporacion:  Number(body.anio_incorporacion),
        capacidad_pasajeros: Number(body.capacidad_pasajeros),
        tipo_combustible:    body.tipo_combustible,
        velocidad_crucero:   body.velocidad_crucero ? Number(body.velocidad_crucero) : null,
        estela_turbulencia:  body.estela_turbulencia || null,
        color:               body.color || null,
        categoria:           body.categoria,
        estado:              body.estado,
        editado_por:         session.user.id,
      },
    })

    return NextResponse.json(aeronave)
  } catch (error) {
    console.error("Error PUT aeronaves:", error)
    return NextResponse.json({ error: "Error al editar aeronave" }, { status: 500 })
  }
}

// ============================================
// DELETE — soft delete, no borra el registro
// ============================================
export async function DELETE(request, { params }) {
  try {
    // Verificamos que el usuario esté logueado
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // En Next.js 15 params debe ser esperado con await
    const { id } = await params

    // No borramos el registro — solo lo marcamos como inactivo
    // Así conservamos el historial completo
    const aeronave = await prisma.aeronave.update({
      where: { id: Number(id) },
      data: {
        activo:        false,
        deleted_at:    new Date(),
        eliminado_por: session.user.id,
      },
    })

    return NextResponse.json(aeronave)
  } catch (error) {
    console.error("Error DELETE aeronaves:", error)
    return NextResponse.json({ error: "Error al eliminar aeronave" }, { status: 500 })
  }
}