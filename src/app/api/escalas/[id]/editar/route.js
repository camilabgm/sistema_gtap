// Destino: src/app/api/escalas/[id]/editar/route.js
//
// PUT /api/escalas/<id>/editar — edita una escala YA PUBLICADA.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"
import { parsearSubtipos } from "@/lib/tiposMision"
import { puedeEditarAhora, yaPasoLaHora, ESTADOS_EDITABLES_PUBLICADA } from "@/lib/escalas"
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
        estado: true,
        fecha: true,
        hora_despegue_estimada: true,
        aeronave_id: true,
        tipo_mision_id: true,
        solicitante: true,
        autorizada: true,
        tripulacion: { where: { deleted_at: null }, select: { persona_id: true } },
      },
    })
    if (!escala) {
      return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
    }
    if (escala.es_borrador) {
      return NextResponse.json(
        { error: "La escala todavía es un borrador. Para completarla, usá /api/escalas/[id]." },
        { status: 409 }
      )
    }
    if (!ESTADOS_EDITABLES_PUBLICADA.includes(escala.estado)) {
      return NextResponse.json(
        { error: `No se puede editar una escala en estado ${escala.estado}` },
        { status: 409 }
      )
    }
    if (!puedeEditarAhora(escala)) {
      return NextResponse.json(
        { error: "Ya pasó la hora de despegue estimada, no se puede editar" },
        { status: 409 }
      )
    }

    const veniaDeRechazada = escala.estado === "RECHAZADA"

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
    // Escala.fecha (la del vuelo) ya NO se lee del formData.
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
    const nombreArchivoEfectivo = hayArchivoNuevo ? archivoNuevo.name : solicitudActual?.archivo

    const canalRealmenteCambio = canalTocado && canalValor !== solicitudActual?.canal
    if (solicitudActual && (canalRealmenteCambio || hayArchivoNuevo)) {
      const errCanal = validarCanalConArchivo(canalEfectivo, nombreArchivoEfectivo)
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

    if (ventana && yaPasoLaHora(ventana.inicio)) {
      return NextResponse.json(
        { error: "No se puede guardar: el nuevo horario ya pasó la hora de despegue" },
        { status: 400 }
      )
    }

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
        { error: "No se pudo guardar la edición", detalles: errores },
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
      const dataEscala = {
        editado_por: session.user.id,
        autorizada: false,
        autorizada_por: null,
        rol_autoriza: null,
        fecha_autorizacion: null,
      }

      if (veniaDeRechazada) {
        dataEscala.estado = "PROGRAMADA"
        dataEscala.rechazada_por = null
        dataEscala.motivo_rechazo = null
        dataEscala.fecha_rechazo = null
      }

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
        await tx.acuseRecibo.updateMany({
        where: { escala_id: escalaId, deleted_at: null },
        data: { deleted_at: new Date(), eliminado_por: session.user.id },
        })
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

      await tx.acuseRecibo.deleteMany({ where: { escala_id: escalaId } })

      return tx.escala.update({ where: { id: escalaId }, data: dataEscala })
    })

    if (hayArchivoNuevo && solicitudActual?.archivo) {
      await borrarArchivoSolicitud(solicitudActual.archivo).catch(() => {})
    }

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error interno PUT editar escala:", error)
    if (rutaGuardadaNueva) {
      await borrarArchivoSolicitud(rutaGuardadaNueva).catch(() => {})
    }
    if (error.code === "P2002" && error.meta?.target?.includes("nro_orden")) {
      return NextResponse.json({ error: "Ese número de orden ya está en uso por otra escala" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error interno al editar la escala" }, { status: 500 })
  }
})