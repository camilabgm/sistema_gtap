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

    // Validaciones — mismas que en POST
    if (!body.nombre || body.nombre.trim() === "") {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    if (!body.apellido || body.apellido.trim() === "") {
      return NextResponse.json({ error: "El apellido es obligatorio" }, { status: 400 })
    }

    if (!body.nro_documento || body.nro_documento.trim() === "") {
      return NextResponse.json({ error: "El número de documento es obligatorio" }, { status: 400 })
    }

    if (!/^\d+$/.test(body.nro_documento)) {
      return NextResponse.json({ error: "El número de documento debe contener solo números, sin puntos ni guiones" }, { status: 400 })
    }

    if (!body.grado || body.grado.trim() === "") {
      return NextResponse.json({ error: "El grado es obligatorio" }, { status: 400 })
    }

    // Verificar duplicado excluyendo el registro actual
    const duplicado = await prisma.persona.findFirst({
      where: {
        nro_documento: body.nro_documento.trim(),
        id: { not: Number(id) },
      },
    })

    if (duplicado) {
      return NextResponse.json({ error: "Ya existe otra persona con ese número de documento" }, { status: 400 })
    }

    const persona = await prisma.persona.update({
      where: { id: Number(id) },
      data: {
        nombre:              body.nombre.trim(),
        apellido:            body.apellido.trim(),
        grado:               body.grado.trim(),
        nro_documento:       body.nro_documento.trim(),
        fecha_nacimiento:    body.fecha_nacimiento ? new Date(body.fecha_nacimiento) : null,
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

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body   = await request.json()

    const camposPermitidos = ["hab_anual_habilitada", "nivel_operacional_habilitado"]
    const data = {}

    for (const campo of camposPermitidos) {
      if (campo in body) {
        data[campo] = body[campo]

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