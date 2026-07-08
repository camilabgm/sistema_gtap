// Destino: src/app/api/escalas/[id]/publicar/route.js
// (carpeta NUEVA "publicar" adentro de la carpeta [id] que ya existe)
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
  estaDisponibleAhora,
} from "@/lib/disponibilidad"

// Orden de la cascada de autorización. Es un fallback: si el titular de
// un cargo no está disponible, se pasa al siguiente. No es aprobación
// multinivel — un solo autorizante está "activo" por vez.
const CASCADA_AUTORIZACION = [
  "JEFE_OPERACIONES",
  "COMANDANTE",
  "CMDTE_ESC_AEREO",
  "CMDTE_ESC_MANTENIMIENTO",
  "JEFE_PERSONAL",
]

// Recorre la cascada y arma el historial de pasos para EscalaAutorizacion.
// Cada fila explica, con su propio motivo_escalamiento, por qué la
// responsabilidad LLEGÓ a ese cargo: la primera fila siempre es "INICIAL"
// (punto de partida por defecto); si esa persona no está disponible, la
// razón de ese salto queda anotada en la fila SIGUIENTE (Opción X). Así,
// leer solo la última fila alcanza para saber quién autoriza ahora y por qué.
//
// Devuelve { autorizanteRol, autorizantePersonaId, pasos }.
// Si nadie en la cascada está disponible, autorizantePersonaId es null.
async function calcularAutorizanteActivo() {
  const pasos = []
  let motivoDeEsteRol = "INICIAL"

  for (const rol of CASCADA_AUTORIZACION) {
    const titular = await prisma.cargoAutorizacion.findFirst({
      where: { rol_autorizador: rol, orden: 1, activo: true, deleted_at: null },
      select: { usuario: { select: { persona_id: true } } },
    })

    // Sin titular cargado para este cargo: se salta, sin motivo nuevo que registrar.
    if (!titular) {
      pasos.push({ rol_autorizador: rol, persona_id: null, motivo_escalamiento: motivoDeEsteRol })
      continue
    }

    const personaId = titular.usuario.persona_id
    const disponibilidad = await estaDisponibleAhora(personaId)

    pasos.push({ rol_autorizador: rol, persona_id: personaId, motivo_escalamiento: motivoDeEsteRol })

    if (disponibilidad.disponible) {
      return { autorizanteRol: rol, autorizantePersonaId: personaId, pasos }
    }

    motivoDeEsteRol = disponibilidad.motivo
  }

  return { autorizanteRol: null, autorizantePersonaId: null, pasos }
}

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

    // 8. Calcular el autorizante activo (cascada como fallback)
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