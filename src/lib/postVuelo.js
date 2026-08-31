// src/lib/postVuelo.js
//
// Funciones puras de negocio para Post-Vuelo — sin dependencias de
// React, mismo criterio que lib/escalas.js: las usan tanto componentes
// del cliente como route.js del servidor.

import { yaPasoLaHora } from "@/lib/escalas"

// Roles con acceso TOTAL a Post-Vuelo (tramos + cierre + cualquier
// campo), en cualquier escala, sin candado — según la matriz
// PERMISOS_GTAP (fila Crear/Editar de POST_VUELO, en verde).
//
// Jefe de Combustible NO entra acá — en la matriz está en rojo para
// Crear/Editar general. Su acceso real es una excepción puntual que no
// está representada en la grilla de checkboxes: carga ÚNICAMENTE el
// campo de combustible, una sola vez, igual que Supervisor de Semana
// — ver el PATCH dedicado en post-vuelo/combustible/route.js.
export const ROLES_GLOBAL_POST_VUELO = [
  "Comandante",
  "Jefe de Operaciones",
  "Comandante del Escuadrón Aéreo",
  "Jefe de Programación y Control",
]

// Una escala está lista para EMPEZAR a cargarle el post-vuelo (tramos +
// cierre) si fue autorizada de verdad, sigue en PROGRAMADA, y ya pasó
// su hora estimada de despegue.
export function puedeCargarPostVuelo(escala) {
  if (!escala.autorizada) return false
  if (escala.estado !== "PROGRAMADA") return false
  return yaPasoLaHora(escala.hora_despegue_estimada)
}

// ¿Esta persona fue tripulante de esta escala? Se usa para dejarla
// cargar/editar tramos y post-vuelo aunque no tenga el permiso general
// POST_VUELO. A propósito NO filtra por rol_en_vuelo — a diferencia de
// Manifiesto, en Post-Vuelo cualquiera de los 3 roles (Piloto, Copiloto,
// Técnico de Vuelo) puede completar los datos, confirmado por MY
// González ("los integrantes de esa tripulación deben cargar los datos").
export function esTripulanteDeEscala(escala, personaId) {
  if (!personaId) return false
  return (escala.tripulacion || []).some((t) => t.persona_id === personaId)
}

// ¿A este post-vuelo le falta cargar el combustible? null/undefined
// cuenta como "falta" — 0 es un valor válido (un vuelo puede consumir
// cero si por algo se abortó ya con el motor en marcha, por ejemplo).
export function faltaCombustible(postVuelo) {
  if (!postVuelo) return true
  return postVuelo.combustible_consumido === null || postVuelo.combustible_consumido === undefined
}

// Calcula horas de vuelo y en tierra a partir de las horas REALES de
// cada tramo — nunca de lo estimado. "completo" indica si TODOS los
// tramos ya tienen sus dos horas reales cargadas (condición para poder
// cerrar el post-vuelo). Mientras falte alguno, igual devuelve el
// cálculo parcial de lo que ya se cargó, para mostrar progreso en vivo.
export function calcularHorasDesdeTramosReales(itinerarios) {
  const ordenados = [...(itinerarios || [])].sort((a, b) => a.orden - b.orden)

  let horasVuelo = 0
  for (const t of ordenados) {
    if (t.hora_real_salida && t.hora_real_llegada) {
      const s = new Date(t.hora_real_salida).getTime()
      const l = new Date(t.hora_real_llegada).getTime()
      horasVuelo += Math.max(0, Math.round((l - s) / 60000))
    }
  }

  let horasTierra = 0
  for (let i = 0; i < ordenados.length - 1; i++) {
    const actual = ordenados[i]
    const siguiente = ordenados[i + 1]
    if (actual.hora_real_llegada && siguiente.hora_real_salida) {
      const l = new Date(actual.hora_real_llegada).getTime()
      const s = new Date(siguiente.hora_real_salida).getTime()
      horasTierra += Math.max(0, Math.round((s - l) / 60000))
    }
  }

  const completo = ordenados.length > 0 && ordenados.every((t) => t.hora_real_salida && t.hora_real_llegada)

  return { horas_vuelo_minutos: horasVuelo, horas_tierra_minutos: horasTierra, completo }
}

// Valores por defecto para los campos del cierre que SÍ se tipean a
// mano — horas de vuelo/tierra ya no están acá, se calculan siempre de
// los tramos reales (ver calcularHorasDesdeTramosReales).
//
// pasajeros y carga_kg se SUGIEREN a partir de lo que ya está cargado
// en el Manifiesto de esta misma escala — la tripulación no tiene por
// qué volver a contar a mano algo que Supervisor de Semana ya cargó.
// Quedan editables igual: puede haber diferencias (alguien que no
// llegó a subir, carga que se bajó a último momento).
export function calcularDefaultsPostVuelo(escala) {
  const itinerarios = escala.itinerarios || []
  const destinoReal = itinerarios.length > 0
    ? [itinerarios[0].origen, ...itinerarios.map((t) => t.destino)].join(" → ")
    : ""

  const pasajerosSugeridos = (escala.pasajeros || []).length
  const cargaKgSugerida = (escala.cargas || []).reduce(
    (acumulado, c) => acumulado + (c.peso ? Number(c.peso) : 0),
    0
  )

  return {
    destino_real: destinoReal,
    aterrizajes: itinerarios.length,
    pasajeros_sugeridos: pasajerosSugeridos,
    carga_kg_sugerida: cargaKgSugerida,
  }
}

// Variante para el resaltado de "te toca a vos" en la lista de
// escalas. Jefe de Combustible y Supervisor de Semana comparten el
// mismo caso: no tocan el resto del Post-Vuelo, solo cubren el campo
// de combustible — les corresponde cuando el post-vuelo ya existe pero
// ese campo sigue vacío. La tripulación es aparte: le corresponde
// mientras el post-vuelo todavía no existe.
export function teCorrespondeReportarPostVuelo(session, escala, postVuelo) {
  if (!session?.user) return false

  if (session.user.rol === "Jefe de Combustible" || session.user.esSupervisorSemana) {
    return !!postVuelo && faltaCombustible(postVuelo)
  }

  if (postVuelo) return false // ya está completo, no le toca a nadie más

  const personaId = session.user.personaId
  if (!personaId) return false

  return esTripulanteDeEscala(escala, personaId)
}