import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// ============================================
// GET — trae todas las aeronaves activas
// ============================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aeronaves = await prisma.aeronave.findMany({
      where: { activo: true },
      orderBy: { matricula: "asc" },
    })

    return NextResponse.json(aeronaves)
  } catch (error) {
    console.error("Error GET aeronaves:", error)
    return NextResponse.json({ error: "Error al obtener aeronaves" }, { status: 500 })
  }
}

// ============================================
// POST — crea una aeronave nueva
// ============================================
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()

    // ==========================================
    // VALIDACIONES
    // ==========================================

    // Matrícula obligatoria
    if (!body.matricula || body.matricula.trim() === "") {
      return NextResponse.json(
        { error: "La matrícula es obligatoria" },
        { status: 400 }
      )
    }

    // Tipo/modelo obligatorio
    if (!body.tipo || body.tipo.trim() === "") {
      return NextResponse.json(
        { error: "El tipo de aeronave es obligatorio" },
        { status: 400 }
      )
    }

    // Fabricante obligatorio
    if (!body.fabricante || body.fabricante.trim() === "") {
      return NextResponse.json(
        { error: "El fabricante es obligatorio" },
        { status: 400 }
      )
    }

    // Capacidad de pasajeros debe ser un número válido
    if (!body.capacidad_pasajeros || isNaN(Number(body.capacidad_pasajeros)) || Number(body.capacidad_pasajeros) < 0) {
      return NextResponse.json(
        { error: "La capacidad de pasajeros debe ser un número válido" },
        { status: 400 }
      )
    }

    // Si estado es NO_DISPONIBLE, el motivo es obligatorio
    if (body.estado === "NO_DISPONIBLE") {
      if (!body.motivo_no_disponible) {
        return NextResponse.json(
          { error: "Debe seleccionar un motivo de no disponibilidad" },
          { status: 400 }
        )
      }

      // Si el motivo es OTRO, la descripción es obligatoria
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
    // VERIFICACIÓN DE DUPLICADO
    // ==========================================
    const existe = await prisma.aeronave.findUnique({
      where: { matricula: body.matricula.trim() },
    })

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe una aeronave con esa matrícula" },
        { status: 400 }
      )
    }

    // ==========================================
    // CREACIÓN
    // ==========================================
    const aeronave = await prisma.aeronave.create({
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
        // Campos de motivo — se guardan solo si el estado es NO_DISPONIBLE
        motivo_no_disponible: body.estado === "NO_DISPONIBLE" ? body.motivo_no_disponible : null,
        motivo_otro:          body.estado === "NO_DISPONIBLE" && body.motivo_no_disponible === "OTRO"
                                ? body.motivo_otro.trim()
                                : null,
        creado_por:           session.user.id,
      },
    })

    return NextResponse.json(aeronave, { status: 201 })
  } catch (error) {
    console.error("Error POST aeronaves:", error)
    return NextResponse.json({ error: "Error al crear aeronave" }, { status: 500 })
  }
}