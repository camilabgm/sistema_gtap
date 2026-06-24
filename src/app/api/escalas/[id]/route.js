import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { calcularVentana, verificarAeronave, verificarTripulante } from "@/lib/disponibilidad"

const ROLES_EN_VUELO = ["PILOTO", "COPILOTO", "TECNICO_DE_VUELO"]

// ── Validaciones de forma ─────────────────────────────────────────────
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

// Normaliza un id que puede venir, venir null (para limpiar) o no venir.
// Devuelve { tocado, valor } y un posible error.
function normalizarId(valor) {
  if (valor === undefined) return { tocado: false, valor: undefined, error: null }
  if (valor === null)      return { tocado: true,  valor: null,      error: null }
  const n = parseInt(valor, 10)
  if (!Number.isInteger(n) || n <= 0) return { tocado: true, valor: null, error: "id inválido" }
  return { tocado: true, valor: n, error: null }
}

// ── PUT /api/escalas/<id> ─────────────────────────────────────────────
// Completa el borrador: asigna aeronave, tipo de misión, itinerario y
// tripulación. NO publica la escala (sigue siendo borrador). Permite
// guardado parcial: lo que no venga en el body se deja como está.
export async function PUT(request, { params }) {
  try {
    // 1. Sesión + permiso de editar
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.permisos?.ESCALAS?.puede_editar) {
      return NextResponse.json({ error: "No tenés permiso para editar escalas" }, { status: 403 })
    }

    // 2. Id de la escala
    const { id } = await params
    const escalaId = parseInt(id, 10)
    if (!Number.isInteger(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
    }

    // 3. La escala debe existir y todavía ser borrador
    const escala = await prisma.escala.findFirst({
      where: { id: escalaId, deleted_at: null },
      select: {
        es_borrador: true,
        fecha: true,
        aeronave_id: true,
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

    // 4. Leer el body y validar lo que venga
    const body = await request.json()
    const { aeronave_id, tipo_mision_id, itinerarios, tripulacion } = body

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
    }
    if (tipoMision.tocado && tipoMision.valor !== null) {
      const tm = await prisma.tipoMision.findFirst({
        where: { id: tipoMision.valor, deleted_at: null },
        select: { id: true },
      })
      if (!tm) return NextResponse.json({ error: "El tipo de misión no existe" }, { status: 400 })
    }

    // 5. Calcular la ventana con el itinerario efectivo (el nuevo si vino;
    //    si no, el que la escala ya tiene guardado)
    let itinerarioEfectivo = itinerarios
    if (itinerarioEfectivo === undefined) {
      itinerarioEfectivo = await prisma.escalaItinerario.findMany({
        where: { escala_id: escalaId, deleted_at: null },
        select: { hora_estimada_salida: true, hora_estimada_llegada: true },
      })
    }
    const ventana = calcularVentana(itinerarioEfectivo)

    // 6. Chequeos de disponibilidad — si algo falla, se bloquea con el motivo
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

    // 7. Guardar todo de forma atómica
    const actualizada = await prisma.$transaction(async (tx) => {
      const dataEscala = { editado_por: session.user.id }
      if (aeronave.tocado)   dataEscala.aeronave_id    = aeronave.valor
      if (tipoMision.tocado) dataEscala.tipo_mision_id = tipoMision.valor

      // Reemplazar el itinerario completo si vino uno nuevo. En un borrador
      // los tramos son andamiaje: se reemplazan enteros (borrado físico) en
      // vez de soft-delete, para evitar choques de unicidad al recargar.
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
        // La ventana se mantiene en sincronía con los tramos
        dataEscala.hora_despegue_estimada = ventana ? ventana.inicio : null
        dataEscala.hora_arribo_estimada   = ventana ? ventana.fin    : null
      }

      // Reemplazar la tripulación completa si vino una nueva
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