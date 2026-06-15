// src/app/api/personas/route.js
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
      include: {
        usuario: {
          select: {
            id:       true,
            username: true,
            rol:      true,
            activo:   true,
            // NO incluimos password ni otros datos sensibles
          },
        },
        habilitaciones_medicas: {
          where:   { deleted_at: null },
          orderBy: [{ anio: "desc" }, { periodo: "desc" }],
        },
      },
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

    // ==========================================
    // VALIDACIONES
    // ==========================================

    // Nombre obligatorio
    if (!body.nombre || body.nombre.trim() === "") {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      )
    }

    // Apellido obligatorio
    if (!body.apellido || body.apellido.trim() === "") {
      return NextResponse.json(
        { error: "El apellido es obligatorio" },
        { status: 400 }
      )
    }

    // Nro documento obligatorio
    if (!body.nro_documento || body.nro_documento.trim() === "") {
      return NextResponse.json(
        { error: "El número de documento es obligatorio" },
        { status: 400 }
      )
    }

    // Nro documento solo numérico (sin puntos, sin letras, sin guiones)
    if (!/^\d+$/.test(body.nro_documento)) {
      return NextResponse.json(
        { error: "El número de documento debe contener solo números, sin puntos ni guiones" },
        { status: 400 }
      )
    }

    // Grado obligatorio
    if (!body.grado || body.grado.trim() === "") {
      return NextResponse.json(
        { error: "El grado es obligatorio" },
        { status: 400 }
      )
    }

    // ==========================================
    // VERIFICACIÓN DE DUPLICADO
    // ==========================================
    const existe = await prisma.persona.findUnique({
      where: { nro_documento: body.nro_documento },
    })

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe una persona con ese número de documento" },
        { status: 400 }
      )
    }

    // ==========================================
    // CREACIÓN
    // ==========================================
    const persona = await prisma.persona.create({
      data: {
        nombre:              body.nombre.trim(),
        apellido:            body.apellido.trim(),
        grado:               body.grado.trim(),
        nro_documento:       body.nro_documento.trim(),
        fecha_nacimiento:    body.fecha_nacimiento    ? new Date(body.fecha_nacimiento) : null,
        escuadron:           body.escuadron,
        unidad:              body.unidad,
        especialidad:        body.especialidad        || null,
        residencia:          body.residencia          || null,
        telefono:            body.telefono            || null,
        contacto_emergencia: body.contacto_emergencia || null,
        nro_pasaporte:       body.nro_pasaporte       || null,
        creado_por:          session.user.id,
      },
    })

    return NextResponse.json(persona, { status: 201 })
  } catch (error) {
    console.error("Error POST personas:", error)
    return NextResponse.json({ error: "Error al crear persona" }, { status: 500 })
  }
}