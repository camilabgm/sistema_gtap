// Destino: src/lib/disponibilidad.js
// (reemplaza tu archivo actual completo — es tu mismo contenido + los 2 agregados)
//
// Lógica de disponibilidad de aeronaves y tripulantes.
// Se usa al completar una escala, al publicarla, y se reutilizará en el dashboard.

import prisma from "@/lib/prisma"

// Ventana de OCUPACIÓN a partir de los tramos: desde la salida más temprana
// hasta la llegada más tardía. Incluye el tiempo en tierra entre tramos.
// Devuelve null si no se puede calcular (faltan horarios).
export function calcularVentana(itinerarios) {
  if (!Array.isArray(itinerarios) || itinerarios.length === 0) return null

  const salidas = []
  const llegadas = []
  for (const t of itinerarios) {
    if (t.hora_estimada_salida)  salidas.push(new Date(t.hora_estimada_salida).getTime())
    if (t.hora_estimada_llegada) llegadas.push(new Date(t.hora_estimada_llegada).getTime())
  }
  if (salidas.length === 0 || llegadas.length === 0) return null

  return {
    inicio: new Date(Math.min(...salidas)),
    fin:    new Date(Math.max(...llegadas)),
  }
}

// Filtro común: "vuelos confirmados" que ocupan de verdad (no borradores,
// no abortados, ni esta misma escala) y que se solapan con la ventana.
// La condición de solape es la clásica: empieza antes de que termine la
// nuestra Y termina después de que empieza la nuestra.
//
// AHORA EXPORTADA: la reutiliza estaDisponibleAhora() más abajo, para no
// duplicar la lógica de solape en el chequeo de autorización.
export function condicionSolape(ventana, escalaIdActual) {
  return {
    es_borrador: false,
    estado: { not: "ABORTADA" },
    deleted_at: null,
    id: { not: escalaIdActual },
    hora_despegue_estimada: { lt: ventana.fin },
    hora_arribo_estimada:   { gt: ventana.inicio },
  }
}

// Verifica una aeronave. Devuelve { ok: true } o { ok: false, motivo }.
export async function verificarAeronave(aeronaveId, ventana, escalaIdActual) {
  const aeronave = await prisma.aeronave.findFirst({
    where: { id: aeronaveId, deleted_at: null },
    select: { matricula: true, estado: true },
  })
  if (!aeronave) return { ok: false, motivo: "La aeronave seleccionada no existe" }

  // Estado del módulo Aeronaves (mantenimiento / accidente)
  if (aeronave.estado === "NO_DISPONIBLE") {
    return {
      ok: false,
      motivo: `Aeronave ${aeronave.matricula}: NO DISPONIBLE (mantenimiento o accidente)`,
    }
  }

  // Choque de horario con otro vuelo confirmado (solo si hay ventana)
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
      // ¿Tiene alguna habilitación médica semestral (1P/2P) todavía vigente
      // para la fecha del vuelo? Traemos solo una para saber si existe.
      habilitaciones_medicas: {
        where: { deleted_at: null, vence: { gte: fecha } },
        select: { id: true },
        take: 1,
      },
    },
  })
  if (!persona) return { ok: false, motivo: "Una de las personas no existe o está inactiva" }

  const quien = `${persona.grado} ${persona.apellido}`

  // 1. Habilitación médica — alcanza con que esté vigente la ANUAL o la SEMESTRAL
  const anualVigente     = persona.hab_anual_habilitada === true
  const semestralVigente = persona.habilitaciones_medicas.length > 0
  if (!anualVigente && !semestralVigente) {
    return { ok: false, motivo: `${quien}: sin habilitación médica vigente (ni anual ni semestral)` }
  }

  // 2. Nivel operacional — debe estar habilitado para volar
  if (!persona.nivel_operacional_habilitado) {
    return { ok: false, motivo: `${quien}: nivel operacional no habilitado` }
  }

  // 3. Novedad en el parte diario de esa fecha (permiso, vacaciones, reposo…)
  const novedad = await prisma.parteDiario.findFirst({
    where: { persona_id: personaId, fecha, deleted_at: null },
    select: { observacion: true },
  })
  if (novedad) {
    const detalle = novedad.observacion ? ` (${novedad.observacion})` : ""
    return { ok: false, motivo: `${quien}: con novedad en el parte del día${detalle}` }
  }

  // 4. Ya vuela en otra escala confirmada que se solapa
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

// ── NUEVA: disponibilidad para AUTORIZAR (no para volar) ──────────────
// Revisa las tres fuentes de no-disponibilidad, en este orden de prioridad:
// derivación manual > en vuelo > novedad en el parte diario de hoy.
// Se usa al publicar una escala, y se reutilizará al aprobar.
// Devuelve { disponible: true } o
// { disponible: false, motivo: "EN_VUELO" | "PARTE_DIARIO" | "DERIVACION_MANUAL" }.
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

  // "En vuelo ahora" es el mismo chequeo de solape de siempre, pero con
  // una ventana de un solo instante en vez de un rango. El -1 en vez de
  // undefined es a propósito: nunca existe una escala con ese id, así
  // que la exclusión de condicionSolape queda inofensiva sin ambigüedad.
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