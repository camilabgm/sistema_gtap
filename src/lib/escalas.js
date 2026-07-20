// src/lib/escalas.js

import { useEffect, useState } from "react"

export const ETIQUETAS_ESTADO = {
  PROGRAMADA: "Programada",
  EN_DESARROLLO: "En vuelo",
  SIN_REGISTRAR: "Sin registrar",
  CUMPLIDA: "Cumplida",
  ABORTADA: "Abortada",
  RECHAZADA: "Rechazada",
}

export const ETIQUETAS_MOTIVO_ABORTO = {
  ADOS: "Orden superior - ADOS",
  ADFM: "Falta de material - ADFM",
  ADCA: "Condición de la aeronave - ADCA",
  ADCM: "Condiciones meteorológicas - ADCM",
  ADTI: "Técnica de instrucción - ADTI",
  ADCP: "Condiciones del piloto - ADCP",
}

export function formatearHora(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })
}

export function calcularEstadoVisual(escala) {
  if (escala.estado !== "PROGRAMADA") return escala.estado

  const salida  = escala.hora_despegue_estimada ? new Date(escala.hora_despegue_estimada) : null
  const llegada = escala.hora_arribo_estimada   ? new Date(escala.hora_arribo_estimada)   : null
  if (!salida || !llegada) return "PROGRAMADA"

  const ahora = new Date()
  if (ahora >= salida && ahora <= llegada) return "EN_DESARROLLO"
  if (ahora > llegada) return "SIN_REGISTRAR"
  return "PROGRAMADA"
}

export function puedeAbortarAhora(escala) {
  if (escala.estado !== "PROGRAMADA") return false
  if (!escala.hora_despegue_estimada) return true
  return new Date() < new Date(escala.hora_despegue_estimada)
}

export function estaPendienteDeAutorizacion(escala) {
  return !escala.autorizada && escala.estado === "PROGRAMADA"
}

// Calcula la ventana de ocupación de una escala, RECORTADA al día que
// se está viendo — a diferencia de mirar solo la hora del reloj, esto
// compara fechas completas. Si el vuelo sale un día y llega otro (o
// cruza la medianoche), el bloque se extiende hasta el borde visible
// del día en vez de romperse.
//
// Devuelve null si la escala no toca ese día en absoluto.
export function calcularVentanaEnElDia(horaDespegueIso, horaArriboIso, fechaSeleccionadaISO) {
  if (!horaDespegueIso) return null

  const despegue = new Date(horaDespegueIso)
  const llegada  = horaArriboIso ? new Date(horaArriboIso) : new Date(despegue.getTime() + 60 * 60000)

  const inicioDelDia = new Date(`${fechaSeleccionadaISO}T00:00:00`)
  const finDelDia     = new Date(`${fechaSeleccionadaISO}T23:59:59.999`)

  if (llegada < inicioDelDia || despegue > finDelDia) return null

  const inicioVisible = despegue < inicioDelDia ? inicioDelDia : despegue
  const finVisible     = llegada > finDelDia    ? finDelDia    : llegada

  return {
    minutosInicio: Math.round((inicioVisible - inicioDelDia) / 60000),
    minutosFin: Math.round((finVisible - inicioDelDia) / 60000),
    continuaAntes: despegue < inicioDelDia,
    continuaDespues: llegada > finDelDia,
  }
}

// Fuerza un re-render cada cierto intervalo, para que los cálculos que
// dependen de "la hora actual" (como calcularEstadoVisual) se
// actualicen solos, sin depender de que la persona haga clic en algo.
export function useTick(intervaloMs = 30000) {
  const [, forzarRender] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forzarRender((n) => n + 1), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
}