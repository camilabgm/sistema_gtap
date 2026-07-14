// Destino: src/app/api/escalas/[id]/route.js
//
// PUT /api/escalas/<id>
//
// Completa el borrador: asigna aeronave, tipo de misión (+ subtipo si
// corresponde), itinerario, tripulación y observaciones. NO publica la
// escala. Permite guardado parcial: lo que no venga en el body se deja
// como está.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"
import { parsearSubtipos } from "@/lib/tiposMision"

const ROLES_EN_VUELO = ["PILOTO", "COPILOTO", "TECNICO_DE_VUELO"]

function validarItinerarios(itinerarios) {
  if (!Array.isArray(itinerarios)) return "El itinerario debe ser una lista"
  for (const t of itinerarios) {
    if (t.orden === undefined || t.orden === null) return "Cada tramo necesita un orden"
    if (!t.origen || !`${t.origen}`.trim())   return "Cada tramo necesita un origen"
    if (!t.destino || !`${t.destino}`.trim())  return "Cada tramo necesita un destino"
    if (!t.hora_estimada_salida || !t.hora_estimada_llegada) {
      return "Cada tramo necesita hora estimada de salida y de llegada"
    }
    const salida  = new Date(t.hora_estimada_salida).getTime()
    const llegada = new Date(t.hora_estimada_llegada).getTime()
    if (isNaN(salida) || isNaN(llegada)) return "Hay un tramo con horarios inválidos"
    if (salida >= llegada) {
      return "En un tramo la salida no puede ser igual o posterior a la llegada"
    }
  }
  return null
}

function validarTripulacion(tripulacion) {
  if (!Array.isArray(tripulacion)) return "La tripulación debe ser una lista"
  const vistos = new Set()
  for (const t of tripulacion) {
    const pid = parseInt(t.persona_id, 10)
    if (!Number.isInteger(pid) || pid <= 0) return "Hay un tripulante con id inválido"
    if (!ROLES_EN_VUELO.includes(t.rol_en_vuelo)) return "Hay un tripulante con un rol inválido"
    if (vistos.has(pid)) return "No se puede asignar la misma persona dos veces"
    vistos.add(pid)
  }
  return null
}

// Segunda pasada, ya contra la base: cada persona tiene que tener, entre
// sus especialidades (ahora una lista — puede tener más de una), la que
// corresponde al rol_en_vuelo que le están asignando en esta escala.
async function validarEspecialidadTripulacion(tripulacion) {
  const ids = tripulacion.map((t) => parseInt(t.persona_id, 10))
  const personas = await prisma.persona.findMany({
    where: { id: { in: ids } },
    select: { id: true, especialidades: true, grado: true, apellido: true },
  })
  const porId = new Map(personas.map((p) => [p.id, p]))

  for (const t of tripulacion) {
    const pid = parseInt(t.persona_id, 10)
    const persona = porId.get(pid)
    if (!persona) return "Una de las personas de la tripulación no existe"
    if (!(persona.especialidades || []).includes(t.rol_en_vuelo)) {
      const quien = `${persona.grado} ${persona.apellido}`
      const rolTexto = t.rol_en_vuelo.replace(/_/g, " ").toLowerCase()
      return `${quien} no tiene la especialidad "${rolTexto}"`
    }
  }
  return null
}

function normalizarId(valor) {
  if (valor === undefined) return { tocado: false, valor: undefined, error: null }
  if (valor === null)      return { tocado: true,  valor: null,      error: null }
  const n = parseInt(valor, 10)
  if (!Number.isInteger(n) || n <= 0) return { tocado: true, valor: null, error: "id inválido" }
  return { tocado: true, valor: n, error: null }
}

function normalizarObservaciones(valor) {
  if (typeof valor !== "string") return undefined
  const recortado = valor.trim()
  return recortado === "" ? null : recortado
}

function normalizarSubtipoElegido(valor) {
  if (valor === undefined) return { tocado: false, valor: undefined }
  if (valor === null) return { tocado: true, valor: null }
  const recortado = `${valor}`.trim()
  return { tocado: true, valor: recortado === "" ? null : recortado }
}

export async function PUT(request, { params }) {
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
        { error: "La escala ya está publicada. Editarla requiere el flujo de re-autorización (aún no implementado)." },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { aeronave_id, tipo_mision_id, itinerarios, tripulacion, observaciones, subtipo_elegido } = body

    const aeronave = normalizarId(aeronave_id)
    if (aeronave.error) return NextResponse.json({ error: "Aeronave inválida" }, { status: 400 })

    const tipoMision = normalizarId(tipo_mision_id)
    if (tipoMision.error) return NextResponse.json({ error: "Tipo de misión inválido" }, { status: 400 })

    if (itinerarios !== undefined) {
      const err = validarItinerarios(itinerarios)
      if (err) return NextResponse.json({ error: err }, { status: 400 })
    }
    if (tripulacion !== undefined) {
      const err = validarTripulacion(tripulacion)
      if (err) return NextResponse.json({ error: err }, { status: 400 })

      const errEspecialidad = await validarEspecialidadTripulacion(tripulacion)
      if (errEspecialidad) return NextResponse.json({ error: errEspecialidad }, { status: 400 })
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

    const observacionesNueva = normalizarObservaciones(observaciones)
    const subtipoElegido = normalizarSubtipoElegido(subtipo_elegido)

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
      const r = await verificarTripulante(parseInt(t.persona_id, 10), escala.fecha, ventana, escalaId)
      if (!r.ok) errores.push(r.motivo)
    }

    if (errores.length > 0) {
      return NextResponse.json(
        { error: "No se pudo completar la asignación", detalles: errores },
        { status: 409 }
      )
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const dataEscala = { editado_por: session.user.id }
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

      return tx.escala.update({ where: { id: escalaId }, data: dataEscala })
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error PUT escalas:", error)
    return NextResponse.json({ error: "Error interno al completar la escala" }, { status: 500 })
  }
}