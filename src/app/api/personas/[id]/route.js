// src/app/api/personas/[id]/route.js
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// PUT — actualiza datos personales e institucionales completos
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body   = await request.json()

    const persona = await prisma.persona.update({
      where: { id: Number(id) },
      data: {
        nombre:              body.nombre,
        apellido:            body.apellido,
        grado:               body.grado,
        nro_documento:       body.nro_documento,
        fecha_nacimiento:    body.fecha_nacimiento    ? new Date(body.fecha_nacimiento) : null,
        escuadron:           body.escuadron,
        unidad:              body.unidad,
        especialidad:        body.especialidad        || null,
        residencia:          body.residencia          || null,
        telefono:            body.telefono            || null,
        contacto_emergencia: body.contacto_emergencia || null,
        nro_pasaporte:       body.nro_pasaporte       || null,
        editado_por:         session.user.id,
      },
    })

    return NextResponse.json(persona)
  } catch (error) {
    console.error("Error PUT personas:", error)
    return NextResponse.json({ error: "Error al editar persona" }, { status: 500 })
  }
}

// PATCH — actualiza solo los campos enviados (usado por el modal de habilitaciones)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body   = await request.json()

    // Solo campos permitidos por PATCH para evitar updates masivos accidentales
    const camposPermitidos = ["hab_anual_habilitada", "nivel_operacional_habilitado"]
    const data = {}

    for (const campo of camposPermitidos) {
      if (campo in body) {
        data[campo] = body[campo]

        // Registrar quién y cuándo habilitó operacionalmente
        if (campo === "nivel_operacional_habilitado" && body[campo] === true) {
          data.nivel_operacional_aprobado_por = session.user.personaId || null
          data.nivel_operacional_fecha        = new Date()
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 400 })
    }

    data.editado_por = session.user.id

    const persona = await prisma.persona.update({
      where: { id: Number(id) },
      data,
    })

    return NextResponse.json(persona)
  } catch (error) {
    console.error("Error PATCH personas:", error)
    return NextResponse.json({ error: "Error al actualizar persona" }, { status: 500 })
  }
}

// DELETE — soft delete
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    await prisma.persona.update({
      where: { id: Number(id) },
      data: {
        activo:        false,
        deleted_at:    new Date(),
        eliminado_por: session.user.id,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error DELETE personas:", error)
    return NextResponse.json({ error: "Error al eliminar persona" }, { status: 500 })
  }
}
