// src/app/api/personas/[id]/route.js
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

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
        fecha_nacimiento:    body.fecha_nacimiento    ? new Date(body.fecha_nacimiento)    : null,
        escuadron:           body.escuadron,
        unidad:              body.unidad,
        especialidad:        body.especialidad        || null,
        residencia:          body.residencia          || null,
        telefono:            body.telefono            || null,
        contacto_emergencia: body.contacto_emergencia || null,
        nro_pasaporte:       body.nro_pasaporte       || null,

        // Habilitación médica
        hab_medica_vence:    body.hab_medica_vence    ? new Date(body.hab_medica_vence)    : null,
        hab_medica_periodo:  body.hab_medica_periodo  || null,
        hab_medica_anio:     body.hab_medica_anio     ? parseInt(body.hab_medica_anio)     : null,

        // Habilitación operacional
        nivel_operacional_habilitado: body.nivel_operacional_habilitado || false,
        // Si alguien habilita operacionalmente, registramos quién y cuándo
        ...(body.nivel_operacional_habilitado && {
          nivel_operacional_aprobado_por: session.user.personaId || null,
          nivel_operacional_fecha:        new Date(),
        }),

        editado_por: session.user.id,
      },
    })

    return NextResponse.json(persona)
  } catch (error) {
    console.error("Error PUT personas:", error)
    return NextResponse.json({ error: "Error al editar persona" }, { status: 500 })
  }
}

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
