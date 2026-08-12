// Destino: src/app/api/escalas/[id]/route.js
//
// GET    /api/escalas/<id>     → detalle completo, para precargar edición
// PUT    /api/escalas/<id>     → completa el borrador
// DELETE /api/escalas/<id>     → borrado lógico EN CASCADA

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"
import { parsearSubtipos } from "@/lib/tiposMision"
import { guardarArchivoSolicitud, borrarArchivoSolicitud } from "@/lib/almacenamiento"
import { paraguayInputAFechaUTC, fechaEnParaguayDesdeInstante } from "@/lib/fechaHora"
import { normalizarFechaSoloDia } from "@/lib/fechaSoloDia"
import {
  validarItinerarios,
  validarTripulacion,
  validarEspecialidadTripulacion,
  normalizarObservaciones,
  normalizarSubtipoElegido,
  normalizarSolicitante,
  normalizarFecha,
  normalizarIdFormData,
  normalizarNroOrden,
  validarCanalConArchivo,
} from "@/lib/validacionEscala"

export const GET = conPermiso("ESCALAS", "puede_ver", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id: escalaId, deleted_at: null },
    select: {
      id: true,
      nro_orden: true,
      fecha: true,
      es_borrador: true,
      estado: true,
      autorizada: true,
      rol_autoriza: true,
      fecha_autorizacion: true,
      rechazada_por: true,
      motivo_rechazo: true,
      fecha_rechazo: true,
      hora_despegue_estimada: true,
      hora_arribo_estimada: true,
      solicitante: true,
      observaciones: true,
      subtipo_elegido: true,
      aeronave_id: true,
      aeronave: { select: { id: true, matricula: true, tipo: true } },
      tipo_mision_id: true,
      tipo_mision: {
        select: { id: true, codigo: true, nombre: true, tiene_subtipo: true, subtipo: true },
      },
      itinerarios: {
        where: { deleted_at: null },
        orderBy: { orden: "asc" },
        select: {
          id: true,
          orden: true,
          origen: true,
          destino: true,
          hora_estimada_salida: true,
          hora_estimada_llegada: true,
        },
      },
      tripulacion: {
        where: { deleted_at: null },
        select: {
          persona_id: true,
          rol_en_vuelo: true,
          persona: { select: { id: true, nombre: true, apellido: true, grado: true } },
        },
      },
      solicitudes: {
        orderBy: { fecha_recepcion: "asc" },
        take: 1,
        select: { id: true, canal: true, fecha_recepcion: true, archivo: true, nombre_archivo_original: true },
      },
    },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  return NextResponse.json(escala)
})

export const PUT = conPermiso("ESCALAS", "puede_editar", async (request, context, session) => {
  let rutaGuardadaNueva = null

  try {
    const { id } = await context.params
    const escalaId = parseInt(id, 10)
    if (!Number.isInteger(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
    }

    const escala = await prisma.escala.findFirst({
      where: { id: escalaId, deleted_at: null },
      select: {
        es_borrador: true,
        fecha: true,
        aeronave_id: true,
        tipo_mision_id: true,
        tripulacion: { where: { deleted_at: null }, select: { persona_id: true } },
      },
    })
    if (!escala) {
      return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
    }
    if (!escala.es_borrador) {
      return NextResponse.json(
        { error: "La escala ya está publicada. Para editarla, usá /api/escalas/[id]/editar." },
        { status: 409 }
      )
    }

    const solicitudActual = await prisma.solicitud.findFirst({
      where: { escala_id: escalaId, deleted_at: null },
      orderBy: { fecha_recepcion: "asc" },
      select: { id: true, canal: true, archivo: true },
    })

    const formData = await request.formData()

    const solicitanteRaw = formData.get("solicitante")
    const solicitanteRes = normalizarSolicitante(solicitanteRaw === null ? undefined : solicitanteRaw)
    if (solicitanteRes.error) return NextResponse.json({ error: solicitanteRes.error }, { status: 400 })

    // fecha_recepcion de la Solicitud — mismo patrón "tocado" que canal.
    // Escala.fecha (la del vuelo) ya NO se lee del formData — se
    // recalcula sola más abajo, a partir del itinerario.
    const fechaRecepcionRaw = formData.get("fecha_recepcion")
    const fechaRecepcionRes = normalizarFecha(fechaRecepcionRaw === null ? undefined : fechaRecepcionRaw)
    if (fechaRecepcionRes.error) return NextResponse.json({ error: fechaRecepcionRes.error }, { status: 400 })

    const nroOrdenNuevo = normalizarNroOrden(formData.get("nro_orden"))

    const aeronave = normalizarIdFormData(formData.get("aeronave_id"))
    if (aeronave.error) return NextResponse.json({ error: "Aeronave inválida" }, { status: 400 })

    const tipoMision = normalizarIdFormData(formData.get("tipo_mision_id"))
    if (tipoMision.error) return NextResponse.json({ error: "Tipo de misión inválido" }, { status: 400 })

    let itinerarios
    const itinerariosRaw = formData.get("itinerarios")
    if (itinerariosRaw !== null) {
      try { itinerarios = JSON.parse(itinerariosRaw) }
      catch { return NextResponse.json({ error: "Itinerarios con formato inválido" }, { status: 400 }) }
      const err = validarItinerarios(itinerarios)
      if (err) return NextResponse.json({ error: err }, { status: 400 })
    }

    let tripulacion
    const tripulacionRaw = formData.get("tripulacion")
    if (tripulacionRaw !== null) {
      try { tripulacion = JSON.parse(tripulacionRaw) }
      catch { return NextResponse.json({ error: "Tripulación con formato inválido" }, { status: 400 }) }
      const err = validarTripulacion(tripulacion)
      if (err) return NextResponse.json({ error: err }, { status: 400 })

      const errEspecialidad = await validarEspecialidadTripulacion(tripulacion)
      if (errEspecialidad) return NextResponse.json({ error: errEspecialidad }, { status: 400 })
    }

    const observacionesNueva = normalizarObservaciones(formData.get("observaciones"))
    const subtipoRaw = formData.get("subtipo_elegido")
    const subtipoElegido = normalizarSubtipoElegido(subtipoRaw === null ? undefined : subtipoRaw)

    const canalRaw = formData.get("canal")
    const canalTocado = canalRaw !== null
    const canalValor = canalTocado ? `${canalRaw}`.trim().toUpperCase() : undefined

    const archivoNuevo = formData.get("archivo")
    const hayArchivoNuevo =
      archivoNuevo && typeof archivoNuevo.arrayBuffer === "function" && archivoNuevo.size > 0

    const canalEfectivo = canalTocado ? canalValor : (solicitudActual?.canal ?? null)
    const nombreArchivoParaValidar = hayArchivoNuevo ? archivoNuevo.name : solicitudActual?.archivo

    const canalRealmenteCambio = canalTocado && canalValor !== solicitudActual?.canal
    if (solicitudActual && (canalRealmenteCambio || hayArchivoNuevo)) {
      const errCanal = validarCanalConArchivo(canalEfectivo, nombreArchivoParaValidar)
      if (errCanal) return NextResponse.json({ error: errCanal }, { status: 400 })
    }

    let tipoMisionNuevoInfo = null
    if (tipoMision.tocado && tipoMision.valor !== null) {
      tipoMisionNuevoInfo = await prisma.tipoMision.findFirst({
        where: { id: tipoMision.valor, deleted_at: null },
        select: { id: true, tiene_subtipo: true, subtipo: true },
      })
      if (!tipoMisionNuevoInfo) {
        return NextResponse.json({ error: "El tipo de misión no existe" }, { status: 400 })
      }
    }

    let tipoMisionEfectivo = tipoMisionNuevoInfo
    if (!tipoMision.tocado && escala.tipo_mision_id) {
      tipoMisionEfectivo = await prisma.tipoMision.findFirst({
        where: { id: escala.tipo_mision_id, deleted_at: null },
        select: { id: true, tiene_subtipo: true, subtipo: true },
      })
    }

    if (subtipoElegido.tocado && subtipoElegido.valor !== null) {
      if (!tipoMisionEfectivo) {
        return NextResponse.json(
          { error: "No se puede elegir un subtipo sin un tipo de misión asignado" },
          { status: 400 }
        )
      }
      if (!tipoMisionEfectivo.tiene_subtipo) {
        return NextResponse.json({ error: "Este tipo de misión no tiene subtipos" }, { status: 400 })
      }
      const opcionesValidas = parsearSubtipos(tipoMisionEfectivo.subtipo)
      if (!opcionesValidas.includes(subtipoElegido.valor)) {
        return NextResponse.json(
          { error: "El subtipo elegido no es una opción válida para este tipo de misión" },
          { status: 400 }
        )
      }
    }

    const limpiarSubtipoPorCambioDeTipo =
      tipoMision.tocado && tipoMisionNuevoInfo && !tipoMisionNuevoInfo.tiene_subtipo && !subtipoElegido.tocado

    let itinerarioEfectivo = itinerarios
    if (itinerarioEfectivo === undefined) {
      itinerarioEfectivo = await prisma.escalaItinerario.findMany({
        where: { escala_id: escalaId, deleted_at: null },
        select: { hora_estimada_salida: true, hora_estimada_llegada: true },
      })
    }
    const ventana = calcularVentana(itinerarioEfectivo)

    // La "fecha" de referencia para chequear habilitación médica y
    // Parte Diario sale del itinerario efectivo (nuevo o ya guardado en
    // la base) — no de un campo aparte del formulario. Si todavía no
    // hay ningún tramo con salida y llegada cargadas, no hay fecha
    // (escala.fecha puede ser null en un borrador recién creado).
    const fechaEfectiva = ventana
      ? normalizarFechaSoloDia(fechaEnParaguayDesdeInstante(ventana.inicio))
      : escala.fecha

    const errores = []

    const aeronaveAChequear = aeronave.tocado ? aeronave.valor : escala.aeronave_id
    if (aeronaveAChequear) {
      const r = await verificarAeronave(aeronaveAChequear, ventana, escalaId)
      if (!r.ok) errores.push(r.motivo)
    }

    const tripAChequear = (tripulacion !== undefined)
      ? tripulacion
      : escala.tripulacion.map((t) => ({ persona_id: t.persona_id }))
    for (const t of tripAChequear) {
      if (!fechaEfectiva) {
        errores.push("Completá la hora estimada de salida y llegada del itinerario antes de asignar tripulación")
        break
      }
      const r = await verificarTripulante(parseInt(t.persona_id, 10), fechaEfectiva, ventana, escalaId)
      if (!r.ok) errores.push(r.motivo)
    }

    if (errores.length > 0) {
      return NextResponse.json(
        { error: "No se pudo completar la asignación", detalles: errores },
        { status: 409 }
      )
    }

    let nombreOriginalNuevo = null
    if (hayArchivoNuevo) {
      try {
        const resultado = await guardarArchivoSolicitud(archivoNuevo, escalaId)
        rutaGuardadaNueva = resultado.rutaRelativa
        nombreOriginalNuevo = resultado.nombreOriginal
      } catch (errorArchivo) {
        return NextResponse.json({ error: errorArchivo.message }, { status: 400 })
      }
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const dataEscala = { editado_por: session.user.id }
      if (solicitanteRes.tocado) dataEscala.solicitante = solicitanteRes.valor
      if (nroOrdenNuevo !== undefined) dataEscala.nro_orden = nroOrdenNuevo
      if (aeronave.tocado)   dataEscala.aeronave_id    = aeronave.valor
      if (tipoMision.tocado) dataEscala.tipo_mision_id = tipoMision.valor
      if (observacionesNueva !== undefined) dataEscala.observaciones = observacionesNueva

      if (subtipoElegido.tocado) {
        dataEscala.subtipo_elegido = subtipoElegido.valor
      } else if (limpiarSubtipoPorCambioDeTipo) {
        dataEscala.subtipo_elegido = null
      }

      if (itinerarios !== undefined) {
        await tx.escalaItinerario.deleteMany({ where: { escala_id: escalaId } })
        for (const t of itinerarios) {
          await tx.escalaItinerario.create({
            data: {
              escala_id:             escalaId,
              orden:                 t.orden,
              origen:                `${t.origen}`.trim().toUpperCase(),
              destino:               `${t.destino}`.trim().toUpperCase(),
              hora_estimada_salida:  paraguayInputAFechaUTC(t.hora_estimada_salida),
              hora_estimada_llegada: paraguayInputAFechaUTC(t.hora_estimada_llegada),
              creado_por:            session.user.id,
            },
          })
        }
        dataEscala.hora_despegue_estimada = ventana ? ventana.inicio : null
        dataEscala.hora_arribo_estimada   = ventana ? ventana.fin    : null
        // Fecha del vuelo, recalculada junto con el resto del itinerario.
        dataEscala.fecha = ventana ? normalizarFechaSoloDia(fechaEnParaguayDesdeInstante(ventana.inicio)) : null
      }

      if (tripulacion !== undefined) {
        await tx.escalaTripulacion.deleteMany({ where: { escala_id: escalaId } })
        for (const t of tripulacion) {
          await tx.escalaTripulacion.create({
            data: {
              escala_id:    escalaId,
              persona_id:   parseInt(t.persona_id, 10),
              rol_en_vuelo: t.rol_en_vuelo,
              creado_por:   session.user.id,
            },
          })
        }
      }

      if (solicitudActual && (canalRealmenteCambio || hayArchivoNuevo || fechaRecepcionRes.tocado)) {
        const dataSolicitud = { editado_por: session.user.id }
        if (canalRealmenteCambio) dataSolicitud.canal = canalValor
        if (hayArchivoNuevo) {
          dataSolicitud.archivo = rutaGuardadaNueva
          dataSolicitud.nombre_archivo_original = nombreOriginalNuevo
        }
        if (fechaRecepcionRes.tocado) dataSolicitud.fecha_recepcion = fechaRecepcionRes.valor
        await tx.solicitud.update({ where: { id: solicitudActual.id }, data: dataSolicitud })
      }

      return tx.escala.update({ where: { id: escalaId }, data: dataEscala })
    })

    if (hayArchivoNuevo && solicitudActual?.archivo) {
      await borrarArchivoSolicitud(solicitudActual.archivo).catch(() => {})
    }

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error interno PUT escalas:", error)
    if (rutaGuardadaNueva) {
      await borrarArchivoSolicitud(rutaGuardadaNueva).catch(() => {})
    }
    if (error.code === "P2002" && error.meta?.target?.includes("nro_orden")) {
      return NextResponse.json({ error: "Ese número de orden ya está en uso por otra escala" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error interno al completar la escala" }, { status: 500 })
  }
})

// DELETE — borrado lógico EN CASCADA. Depende únicamente del permiso
// ESCALAS.puede_eliminar — sin ninguna restricción de estado.
export const DELETE = conPermiso("ESCALAS", "puede_eliminar", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id: escalaId, deleted_at: null },
    select: { id: true },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    const ahora = new Date()
    const dataBorrado = { deleted_at: ahora, eliminado_por: session.user.id }

    await tx.escala.update({ where: { id: escalaId }, data: dataBorrado })
    await tx.escalaItinerario.updateMany({ where: { escala_id: escalaId, deleted_at: null }, data: dataBorrado })
    await tx.escalaTripulacion.updateMany({ where: { escala_id: escalaId, deleted_at: null }, data: dataBorrado })
    await tx.solicitud.updateMany({ where: { escala_id: escalaId, deleted_at: null }, data: dataBorrado })
    await tx.escalaAutorizacion.updateMany({ where: { escala_id: escalaId, deleted_at: null }, data: dataBorrado })
    await tx.acuseRecibo.updateMany({ where: { escala_id: escalaId, deleted_at: null }, data: dataBorrado })
    await tx.postVuelo.updateMany({ where: { escala_id: escalaId, deleted_at: null }, data: dataBorrado })
  })

  return NextResponse.json({ ok: true })
})