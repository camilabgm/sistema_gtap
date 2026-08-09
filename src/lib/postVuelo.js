// src/lib/postVuelo.js
//
// Funciones puras de negocio para Post-Vuelo — sin dependencias de
// React, mismo criterio que lib/escalas.js: las usan tanto componentes
// del cliente como route.js del servidor.

import { yaPasoLaHora } from "@/lib/escalas"

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
// POST_VUELO.
export function esTripulanteDeEscala(escala, personaId) {
  if (!personaId) return false
  return (escala.tripulacion || []).some((t) => t.persona_id === personaId)
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
export function calcularDefaultsPostVuelo(escala) {
  const itinerarios = escala.itinerarios || []
  const destinoReal = itinerarios.length > 0
    ? [itinerarios[0].origen, ...itinerarios.map((t) => t.destino)].join(" → ")
    : ""
  return {
    destino_real: destinoReal,
    aterrizajes: itinerarios.length,
  }
}