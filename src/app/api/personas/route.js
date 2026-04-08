import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const personas = await prisma.persona.findMany({
      where:   { activo: true },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    })

    return NextResponse.json(personas)
  } catch (error) {
    console.error("Error GET personas:", error)
    return NextResponse.json({ error: "Error al obtener personas" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()

    // Verificamos que el documento no exista ya
    const existe = await prisma.persona.findUnique({
      where: { nro_documento: body.nro_documento },
    })

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe una persona con ese número de documento" },
        { status: 400 }
      )
    }

    const persona = await prisma.persona.create({
      data: {
        nombre:                  body.nombre,
        apellido:                body.apellido,
        grado:                   body.grado,
        nro_documento:           body.nro_documento,
        fecha_nacimiento:        body.fecha_nacimiento        ? new Date(body.fecha_nacimiento)        : null,
        escuadron:               body.escuadron,
        unidad:                  body.unidad,
        especialidad:            body.especialidad            || null,
        residencia:              body.residencia              || null,
        telefono:                body.telefono                || null,
        contacto_emergencia:     body.contacto_emergencia     || null,
        nro_pasaporte:           body.nro_pasaporte           || null,
        hab_medica_vence:        body.hab_medica_vence        ? new Date(body.hab_medica_vence)        : null,
        nivel_operacional:       body.nivel_operacional       || null,
        nivel_operacional_vence: body.nivel_operacional_vence ? new Date(body.nivel_operacional_vence) : null,
        creado_por:              session.user.id,
      },
    })

    return NextResponse.json(persona, { status: 201 })
  } catch (error) {
    console.error("Error POST personas:", error)
    return NextResponse.json({ error: "Error al crear persona" }, { status: 500 })
  }
}