// Destino: src/app/api/escalas/[id]/publicar/route.js
//
// PUT /api/escalas/<id>/publicar
//
// Transición de una escala de BORRADOR a OFICIAL. No crea ni edita
// contenido de la escala (eso ya lo hacen el POST de crear y el PUT de
// completar) — solo valida que esté lista, vuelve a chequear
// disponibilidad, calcula quién es el autorizante activo ahora mismo
// (cascada como fallback, nunca aprobación multinivel obligatoria) y deja
// la escala esperando esa autorización.
//
// Body opcional: { nro_orden?: string }
// El nro_orden es opcional para TODOS los tipos de misión (sin excepción
// por tipo) — se guarda tal cual venga, sin validar formato ni unicidad.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import {
  calcularVentana,
  verificarAeronave,
  verificarTripulante,
} from "@/lib/disponibilidad"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"

export async function PUT(request, { params }) {
  try {
    // 1. Sesión
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // 2. Permiso — mismo campo que crear/editar escalas
    if (!session.user.permisos?.ESCALAS?.puede_editar) {
      return NextResponse.json({ error: "No tenés permiso para publicar escalas" }, { status: 403 })
    }

    // 3. Id de la escala
    const { id } = await params
    const escalaId = parseInt(id, 10)
    if (!Number.isInteger(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
    }

    // 4. Body opcional: nro_orden
    const body = await request.json().catch(() => ({}))
    const nroOrden = typeof body.nro_orden === "string" ? (body.nro_orden.trim() || null) : undefined

    // 5. Buscar la escala con todo lo necesario para validar y re-chequear
    const escala = await prisma.escala.findFirst({
      where: { id: escalaId, deleted_at: null },
      select: {
        es_borrador: true,
        fecha: true,
        aeronave_id: true,
        tipo_mision_id: true,
        itinerarios: {
          where: { deleted_at: null },
          select: { hora_estimada_salida: true, hora_estimada_llegada: true },
        },
        tripulacion: {
          where: { deleted_at: null },
          select: { persona_id: true },
        },
      },
    })
    if (!escala) {
      return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
    }
    if (!escala.es_borrador) {
      return NextResponse.json({ error: "La escala ya está publicada" }, { status: 409 })
    }

    // 6. Validar que el borrador esté completo
    const faltantes = []
    if (!escala.aeronave_id) faltantes.push("aeronave")
    if (!escala.tipo_mision_id) faltantes.push("tipo de misión")
    if (escala.itinerarios.length === 0) faltantes.push("itinerario")
    if (escala.tripulacion.length === 0) faltantes.push("tripulación")
    if (faltantes.length > 0) {
      return NextResponse.json(
        { error: `Faltan datos para publicar: ${faltantes.join(", ")}` },
        { status: 400 }
      )
    }

    // 7. Re-chequeo de disponibilidad (pudo cambiar algo desde que se armó el borrador)
    const ventana = calcularVentana(escala.itinerarios)
    const motivos = []

    const chequeoAeronave = await verificarAeronave(escala.aeronave_id, ventana, escalaId)
    if (!chequeoAeronave.ok) motivos.push(chequeoAeronave.motivo)

    for (const t of escala.tripulacion) {
      const chequeoPersona = await verificarTripulante(t.persona_id, escala.fecha, ventana, escalaId)
      if (!chequeoPersona.ok) motivos.push(chequeoPersona.motivo)
    }

    if (motivos.length > 0) {
      return NextResponse.json(
        { error: "No se puede publicar por conflictos de disponibilidad", detalles: motivos },
        { status: 409 }
      )
    }

    // 8. Calcular el autorizante activo (cascada como fallback, titular → adjunto → siguiente cargo)
    const { autorizantePersonaId, pasos } = await calcularAutorizanteActivo()
    if (!autorizantePersonaId) {
      return NextResponse.json(
        { error: "No hay ningún autorizante disponible en este momento. No se puede publicar la escala." },
        { status: 409 }
      )
    }

    // 9. Escritura atómica: publicar + dejar registrado el recorrido de autorización
    const actualizada = await prisma.$transaction(async (tx) => {
      const dataEscala = {
        es_borrador: false,
        editado_por: session.user.id,
      }
      if (nroOrden !== undefined) dataEscala.nro_orden = nroOrden

      const escalaPublicada = await tx.escala.update({
        where: { id: escalaId },
        data: dataEscala,
      })

      for (const paso of pasos) {
        await tx.escalaAutorizacion.create({
          data: {
            escala_id: escalaId,
            rol_autorizador: paso.rol_autorizador,
            persona_id: paso.persona_id,
            motivo_escalamiento: paso.motivo_escalamiento,
            autorizo: false,
            creado_por: session.user.id,
          },
        })
      }

      return escalaPublicada
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error PUT publicar escala:", error)
    return NextResponse.json({ error: "Error interno al publicar la escala" }, { status: 500 })
  }
}