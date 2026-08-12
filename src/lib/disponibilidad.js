// Destino: src/lib/disponibilidad.js
//
// Lógica de disponibilidad de aeronaves y tripulantes.
// Se usa al completar una escala, al publicarla, y se reutilizará en el dashboard.

import prisma from "@/lib/prisma"
import { paraguayInputAFechaUTC } from "@/lib/fechaHora"

// Ventana de OCUPACIÓN a partir de los tramos: desde la salida más temprana
// hasta la llegada más tardía. Incluye el tiempo en tierra entre tramos.
// Devuelve null si no se puede calcular (faltan horarios).
//
// calcularVentana() recibe itinerarios de DOS orígenes distintos según
// quién la llama, y paraguayInputAFechaUTC() maneja los dos casos bien:
//   - Desde crear/editar/candidatos-disponibles: vienen del body del
//     cliente, strings de <input type="datetime-local"> sin zona — se
//     interpretan como hora de Paraguay.
//   - Desde publicar: vienen ya leídos de la base (Date objects
//     correctamente guardados) — se devuelven tal cual, sin reinterpretar.
export function calcularVentana(itinerarios) {
  if (!Array.isArray(itinerarios) || itinerarios.length === 0) return null

  const salidas = []
  const llegadas = []
  for (const t of itinerarios) {
    const salida  = paraguayInputAFechaUTC(t.hora_estimada_salida)
    const llegada = paraguayInputAFechaUTC(t.hora_estimada_llegada)
    if (salida)  salidas.push(salida.getTime())
    if (llegada) llegadas.push(llegada.getTime())
  }
  if (salidas.length === 0 || llegadas.length === 0) return null

  return {
    inicio: new Date(Math.min(...salidas)),
    fin:    new Date(Math.max(...llegadas)),
  }
}

// Filtro común: "vuelos que ocupan de verdad" un tripulante o aeronave.
// Excluye:
//   - borradores (nunca se publicaron)
//   - ABORTADA y RECHAZADA (nunca ocurrieron de verdad)
//   - una escala NUNCA autorizada, cuya hora YA PASÓ — no representa
//     ningún compromiso operativo real (mismo criterio que
//     puedeEditarAhora en lib/escalas.js: el tiempo pasado solo importa
//     si la escala llegó a autorizarse)
//
// Una escala SIN autorizar pero con hora TODAVÍA VIGENTE sigue
// bloqueando a propósito — si no, dos pedidos podrían competir por el
// mismo recurso sin que el sistema avise, y recién chocarían al
// intentar autorizar el segundo.
export function condicionSolape(ventana, escalaIdActual) {
  const ahora = new Date()
  return {
    es_borrador: false,
    estado: { notIn: ["ABORTADA", "RECHAZADA"] },
    deleted_at: null,
    id: { not: escalaIdActual },
    hora_despegue_estimada: { lt: ventana.fin },
    hora_arribo_estimada:   { gt: ventana.inicio },
    OR: [
      { autorizada: true },
      { hora_despegue_estimada: { gt: ahora } },
    ],
  }
}

// Verifica una aeronave. Devuelve { ok: true } o { ok: false, motivo }.
export async function verificarAeronave(aeronaveId, ventana, escalaIdActual) {
  const aeronave = await prisma.aeronave.findFirst({
    where: { id: aeronaveId, deleted_at: null },
    select: { matricula: true, estado: true },
  })
  if (!aeronave) return { ok: false, motivo: "La aeronave seleccionada no existe" }

  if (aeronave.estado === "NO_DISPONIBLE") {
    return {
      ok: false,
      motivo: `Aeronave ${aeronave.matricula}: NO DISPONIBLE (mantenimiento o accidente)`,
    }
  }

  if (ventana) {
    const choque = await prisma.escala.findFirst({
      where: { ...condicionSolape(ventana, escalaIdActual), aeronave_id: aeronaveId },
      select: { id: true, nro_orden: true },
    })
    if (choque) {
      const ref = choque.nro_orden || `#${choque.id}`
      return {
        ok: false,
        motivo: `Aeronave ${aeronave.matricula}: ya está asignada a la escala ${ref} en ese horario`,
      }
    }
  }

  return { ok: true }
}

// Verifica un tripulante. Devuelve { ok: true } o { ok: false, motivo }.
export async function verificarTripulante(personaId, fecha, ventana, escalaIdActual) {
  const persona = await prisma.persona.findFirst({
    where: { id: personaId, deleted_at: null, activo: true },
    select: {
      grado: true,
      apellido: true,
      hab_anual_habilitada: true,
      nivel_operacional_habilitado: true,
      habilitaciones_medicas: {
        where: { deleted_at: null, vence: { gte: fecha } },
        select: { id: true },
        take: 1,
      },
    },
  })
  if (!persona) return { ok: false, motivo: "Una de las personas no existe o está inactiva" }

  const quien = `${persona.grado} ${persona.apellido}`

  const anualVigente     = persona.hab_anual_habilitada === true
  const semestralVigente = persona.habilitaciones_medicas.length > 0
  if (!anualVigente && !semestralVigente) {
    return { ok: false, motivo: `${quien}: sin habilitación médica vigente (ni anual ni semestral)` }
  }

  if (!persona.nivel_operacional_habilitado) {
    return { ok: false, motivo: `${quien}: nivel operacional no habilitado` }
  }

  const novedad = await prisma.parteDiario.findFirst({
    where: { persona_id: personaId, fecha, deleted_at: null },
    select: { observacion: true },
  })
  if (novedad) {
    const detalle = novedad.observacion ? ` (${novedad.observacion})` : ""
    return { ok: false, motivo: `${quien}: con novedad en el parte del día${detalle}` }
  }

  if (ventana) {
    const choque = await prisma.escala.findFirst({
      where: {
        ...condicionSolape(ventana, escalaIdActual),
        tripulacion: { some: { persona_id: personaId, deleted_at: null } },
      },
      select: { id: true, nro_orden: true },
    })
    if (choque) {
      const ref = choque.nro_orden || `#${choque.id}`
      return { ok: false, motivo: `${quien}: ya vuela en la escala ${ref} en ese horario` }
    }
  }

  return { ok: true }
}

// ── Disponibilidad para AUTORIZAR (no para volar) ──────────────
export async function estaDisponibleAhora(personaId) {
  const ahora = new Date()

  const derivacion = await prisma.autorizadorNoDisponible.findFirst({
    where: {
      persona_id: personaId,
      deleted_at: null,
      desde: { lte: ahora },
      OR: [{ hasta: null }, { hasta: { gte: ahora } }],
    },
    select: { id: true },
  })
  if (derivacion) return { disponible: false, motivo: "DERIVACION_MANUAL" }

  // "En vuelo ahora" ya solo cuenta escalas efectivamente AUTORIZADAS —
  // con el fix de condicionSolape de arriba, una escala sin autorizar
  // nunca puede satisfacer simultáneamente "despegue antes de ahora" Y
  // "despegue después de ahora", así que esto queda correcto sin
  // ningún cambio adicional acá.
  const enVuelo = await prisma.escala.findFirst({
    where: {
      ...condicionSolape({ inicio: ahora, fin: ahora }, -1),
      tripulacion: { some: { persona_id: personaId, deleted_at: null } },
    },
    select: { id: true },
  })
  if (enVuelo) return { disponible: false, motivo: "EN_VUELO" }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const novedadHoy = await prisma.parteDiario.findFirst({
    where: { persona_id: personaId, fecha: hoy, deleted_at: null },
    select: { id: true },
  })
  if (novedadHoy) return { disponible: false, motivo: "PARTE_DIARIO" }

  return { disponible: true }
}