import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// ============================================
// PUT — edita una aeronave existente
// ============================================
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // ==========================================
    // VALIDACIONES
    // ==========================================

    if (!body.matricula || body.matricula.trim() === "") {
      return NextResponse.json(
        { error: "La matrícula es obligatoria" },
        { status: 400 }
      )
    }

    if (!body.tipo || body.tipo.trim() === "") {
      return NextResponse.json(
        { error: "El tipo de aeronave es obligatorio" },
        { status: 400 }
      )
    }

    if (!body.fabricante || body.fabricante.trim() === "") {
      return NextResponse.json(
        { error: "El fabricante es obligatorio" },
        { status: 400 }
      )
    }

    if (body.estado === "NO_DISPONIBLE") {
      if (!body.motivo_no_disponible) {
        return NextResponse.json(
          { error: "Debe seleccionar un motivo de no disponibilidad" },
          { status: 400 }
        )
      }

      if (body.motivo_no_disponible === "OTRO") {
        if (!body.motivo_otro || body.motivo_otro.trim() === "") {
          return NextResponse.json(
            { error: "Debe describir el motivo de no disponibilidad" },
            { status: 400 }
          )
        }
      }
    }

    // ==========================================
    // VERIFICACIÓN DE DUPLICADO (excluyendo la aeronave actual)
    // ==========================================
    const existe = await prisma.aeronave.findFirst({
      where: {
        matricula: body.matricula.trim(),
        id: { not: Number(id) },
      },
    })

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe otra aeronave con esa matrícula" },
        { status: 400 }
      )
    }

    // ==========================================
    // ACTUALIZACIÓN
    // ==========================================
    const aeronave = await prisma.aeronave.update({
      where: { id: Number(id) },
      data: {
        matricula:            body.matricula.trim(),
        tipo:                 body.tipo.trim(),
        fabricante:           body.fabricante.trim(),
        anio_fabricacion:     Number(body.anio_fabricacion),
        anio_incorporacion:   Number(body.anio_incorporacion),
        capacidad_pasajeros:  Number(body.capacidad_pasajeros),
        tipo_combustible:     body.tipo_combustible,
        velocidad_crucero:    body.velocidad_crucero ? Number(body.velocidad_crucero) : null,
        estela_turbulencia:   body.estela_turbulencia || null,
        color:                body.color || null,
        categoria:            body.categoria,
        estado:               body.estado,
        motivo_no_disponible: body.estado === "NO_DISPONIBLE" ? body.motivo_no_disponible : null,
        motivo_otro:          body.estado === "NO_DISPONIBLE" && body.motivo_no_disponible === "OTRO"
                                ? body.motivo_otro.trim()
                                : null,
        editado_por:          session.user.id,
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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

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