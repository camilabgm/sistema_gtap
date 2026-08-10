// Destino: src/app/api/personas/[id]/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso, conAdmin } from "@/lib/api-helpers"
import { normalizarEspecialidades } from "@/lib/personas"
import { normalizarFechaSoloDia } from "@/lib/fechaSoloDia"

export const PUT = conPermiso("PERSONAS", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const body   = await request.json()

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

  const especialidades = normalizarEspecialidades(body.especialidades)
  if (especialidades.error) {
    return NextResponse.json({ error: especialidades.error }, { status: 400 })
  }

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
      fecha_nacimiento:    normalizarFechaSoloDia(body.fecha_nacimiento),
      escuadron:           body.escuadron,
      unidad:              body.unidad,
      especialidades:      especialidades.valor,
      residencia:          body.residencia          || null,
      telefono:            body.telefono            || null,
      contacto_emergencia: body.contacto_emergencia || null,
      nro_pasaporte:       body.nro_pasaporte       || null,
      editado_por:         session.user.id,
    },
  })

  return NextResponse.json(persona)
})

// Solo Comandante y Jefe de Operaciones pueden confirmar habilitaciones
// médicas anuales u operacionales — no depende de PERSONAS.puede_editar.
export const PATCH = conAdmin("PERSONAS", async (request, { params }, session) => {
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
})

export const DELETE = conPermiso("PERSONAS", "puede_eliminar", async (request, { params }, session) => {
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
})