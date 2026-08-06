// Destino: src/app/api/escalas/[id]/editar/route.js
//
// PUT /api/escalas/<id>/editar
//
// Edita una escala YA PUBLICADA (es_borrador: false). Cualquier cambio
// la manda de nuevo a autorización completa — no hay campos "livianos"
// que se salteen la re-autorización.
//
// Qué hace, en orden:
//   1. Verifica que la escala esté en un estado editable y que todavía
//      no haya pasado la hora estimada de despegue.
//   2. Valida y aplica los cambios (helpers compartidos con completar-borrador).
//   3. Resetea la autorización: autorizada, autorizada_por, rol_autoriza
//      y fecha_autorizacion vuelven a su estado inicial. Si estaba
//      RECHAZADA, vuelve a PROGRAMADA y limpia rechazada_por/
//      motivo_rechazo/fecha_rechazo.
//   4. Borra los acuses de recibo existentes.
//
// Sobre canal/archivo: el frontend reenvía SIEMPRE el canal actual
// (es un <select> controlado), aunque no lo estés tocando. Por eso la
// validación de canal↔archivo solo se dispara si el canal REALMENTE
// cambió respecto al que ya tenía la Solicitud, o si subiste un archivo
// nuevo — nunca solo porque el campo vino en el body. Sin esto, una
// escala con un desajuste viejo (de antes de la validación estricta)
// queda imposible de editar para NADA, aunque solo quieras cambiar el
// Nro. de orden.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"
import { parsearSubtipos } from "@/lib/tiposMision"
import { puedeEditarAhora, yaPasoLaHora, ESTADOS_EDITABLES_PUBLICADA } from "@/lib/escalas"
import { guardarArchivoSolicitud, borrarArchivoSolicitud } from "@/lib/almacenamiento"
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

export async function PUT(request, { params }) {
  let rutaGuardadaNueva = null

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.permisos?.ESCALAS?.puede_editar) {
      return NextResponse.json({ error: "No tenés permiso para editar escalas" }, { status: 403 })
    }

    const { id } = await params
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

    // Capturado ANTES de la transacción, sobre el dato original — el
    // reset de estado más abajo depende de saber si venía de RECHAZADA.
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

    const fechaRaw = formData.get("fecha")
    const fechaRes = normalizarFecha(fechaRaw === null ? undefined : fechaRaw)
    if (fechaRes.error) return NextResponse.json({ error: fechaRes.error }, { status: 400 })

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

    // FIX: antes se revalidaba SIEMPRE que hubiera solicitudActual, sin
    // importar si el canal realmente cambió — como el frontend reenvía
    // el mismo canal en cada guardado, esto bloqueaba cualquier edición
    // (aunque no tocara canal/archivo) si había un desajuste viejo entre
    // canal y archivo cargado antes de la validación estricta. Ahora
    // solo se revalida si el canal cambió de verdad o si hay archivo nuevo.
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

    const fechaEfectiva = fechaRes.tocado ? fechaRes.valor : escala.fecha

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
        // Reset de autorización — el corazón de la re-autorización.
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
      if (fechaRes.tocado)       dataEscala.fecha        = fechaRes.valor
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
              hora_estimada_salida:  new Date(t.hora_estimada_salida),
              hora_estimada_llegada: new Date(t.hora_estimada_llegada),
              creado_por:            session.user.id,
            },
          })
        }
        dataEscala.hora_despegue_estimada = ventana ? ventana.inicio : null
        dataEscala.hora_arribo_estimada   = ventana ? ventana.fin    : null
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

      if (solicitudActual && (canalRealmenteCambio || hayArchivoNuevo)) {
        const dataSolicitud = { editado_por: session.user.id }
        if (canalRealmenteCambio) dataSolicitud.canal = canalValor
        if (hayArchivoNuevo) {
          dataSolicitud.archivo = rutaGuardadaNueva
          dataSolicitud.nombre_archivo_original = nombreOriginalNuevo
        }
        await tx.solicitud.update({ where: { id: solicitudActual.id }, data: dataSolicitud })
      }

      // Reset de acuses de recibo — todos los involucrados vuelven a
      // tener que confirmar que vieron la versión actualizada.
      await tx.acuseRecibo.deleteMany({ where: { escala_id: escalaId } })

      return tx.escala.update({ where: { id: escalaId }, data: dataEscala })
    })

    if (hayArchivoNuevo && solicitudActual?.archivo) {
      await borrarArchivoSolicitud(solicitudActual.archivo).catch(() => {})
    }

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error PUT editar escala:", error)
    if (rutaGuardadaNueva) {
      await borrarArchivoSolicitud(rutaGuardadaNueva).catch(() => {})
    }
    if (error.code === "P2002" && error.meta?.target?.includes("nro_orden")) {
      return NextResponse.json({ error: "Ese número de orden ya está en uso por otra escala" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error interno al editar la escala" }, { status: 500 })
  }
}