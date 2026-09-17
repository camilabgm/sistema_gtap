import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

// ============================================
// PUT — edita una aeronave existente
//
// CAMBIO: ya no toca estado/motivo_no_disponible/motivo_otro — esos
// campos salieron de este endpoint. El caso "Otro" tiene su propio
// PATCH dedicado (ver /api/aeronaves/[id]/disponibilidad/route.js),
// y el resto de los motivos (Accidentada, En mantenimiento) los
// escribe únicamente SICEM desde sus propios endpoints de Eventos.
// ============================================
export const PUT = conPermiso("AERONAVES", "puede_editar", async (request, { params }, session) => {
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
      editado_por:          session.user.id,
    },
  })

  return NextResponse.json(aeronave)
})

// ============================================
// DELETE — soft delete, no borra el registro
// ============================================
export const DELETE = conPermiso("AERONAVES", "puede_eliminar", async (request, { params }, session) => {
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
})