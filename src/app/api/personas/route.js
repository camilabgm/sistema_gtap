import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { normalizarEspecialidades } from "@/lib/personas"
import { normalizarFechaSoloDia } from "@/lib/fechaSoloDia"

// ?incluirInactivas=true trae también las desactivadas — pero solo si
// quien pide tiene puede_editar. Sin ese permiso, el filtro se ignora
// en silencio y siempre devuelve activas, aunque alguien arme la URL a
// mano — el candado real está acá, no en que el frontend no muestre el
// botón.
export const GET = conPermiso("PERSONAS", "puede_ver", async (request, context, session) => {
  const { searchParams } = new URL(request.url)
  const pidioInactivas = searchParams.get("incluirInactivas") === "true"
  const puedeVerInactivas = pidioInactivas && !!session.user.permisos?.PERSONAS?.puede_editar

  const personas = await prisma.persona.findMany({
    where:   puedeVerInactivas ? {} : { activo: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    include: {
      usuario: {
        select: {
          id:       true,
          username: true,
          rol_id:   true,
          activo:   true,
          rol: {
            select: { nombre: true },
          },
        },
      },
      habilitaciones_medicas: {
        where:   { deleted_at: null },
        orderBy: [{ anio: "desc" }, { periodo: "desc" }],
      },
    },
  })

  return NextResponse.json(personas)
})

export const POST = conPermiso("PERSONAS", "puede_crear", async (request, context, session) => {
  const body = await request.json()

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

  const existe = await prisma.persona.findUnique({
    where: { nro_documento: body.nro_documento.trim() },
  })

  if (existe) {
    return NextResponse.json({ error: "Ya existe una persona con ese número de documento" }, { status: 400 })
  }

  const persona = await prisma.persona.create({
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
      creado_por:          session.user.id,
    },
  })

  return NextResponse.json(persona, { status: 201 })
})