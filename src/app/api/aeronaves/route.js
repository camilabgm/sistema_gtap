import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// ============================================
// GET — trae todas las aeronaves activas
// ============================================
export async function GET() {
  try {
    // Verificamos que el usuario esté logueado
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Traemos todas las aeronaves que no están eliminadas
    // ordenadas por matrícula alfabéticamente
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
    // Verificamos que el usuario esté logueado
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Leemos los datos que mandó la UI
    const body = await request.json()

    // Verificamos que la matrícula no exista ya en la base de datos
    const existe = await prisma.aeronave.findUnique({
      where: { matricula: body.matricula },
    })

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe una aeronave con esa matrícula" },
        { status: 400 }
      )
    }

    // Creamos la aeronave nueva con los datos recibidos
    const aeronave = await prisma.aeronave.create({
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
        creado_por:          session.user.id,
      },
    })

    return NextResponse.json(aeronave, { status: 201 })
  } catch (error) {
    console.error("Error POST aeronaves:", error)
    return NextResponse.json({ error: "Error al crear aeronave" }, { status: 500 })
  }
}