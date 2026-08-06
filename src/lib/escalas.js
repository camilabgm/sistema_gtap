// src/lib/escalas.js
//
// Funciones puras de negocio para Escalas — SIN dependencias de React.
// Esto es a propósito: este archivo lo importan tanto componentes del
// cliente como route.js del servidor, y un Hook de React acá adentro
// rompe el build del lado servidor. El hook useTick() vive aparte, en
// lib/useTick.js — NO reintroducir acá.

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

export const ESTADO_DETALLADO_CLASES = {
  BORRADOR:                "bg-slate-200 text-slate-700",
  PENDIENTE:                "bg-amber-100 text-amber-700",
  VENCIDA_SIN_AUTORIZAR:    "bg-rose-100 text-rose-700",
  PROGRAMADA_AUTORIZADA:    "bg-blue-100 text-blue-700",
  EN_DESARROLLO:            "bg-orange-100 text-orange-700",
  SIN_REGISTRAR:            "bg-purple-100 text-purple-700",
  CUMPLIDA:                 "bg-green-100 text-green-700",
  ABORTADA:                 "bg-red-100 text-red-700",
  RECHAZADA:                "bg-gray-200 text-gray-600",
}

export const TOOLTIP_ESTADO_DETALLADO = {
  SIN_REGISTRAR: "Falta cargar el Post-Vuelo de esta escala (horas reales, combustible, novedades). El módulo de Post-Vuelo todavía no está construido en el sistema.",
  PENDIENTE: "Todavía nadie autorizó esta escala — está esperando que la revise el autorizante activo.",
  VENCIDA_SIN_AUTORIZAR: "Ya pasó la hora de despegue estimada y nadie la autorizó — no se puede autorizar así como está. Editala para reprogramarla, o eliminala si ya no corresponde.",
}

export function formatearHora(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })
}

export function calcularEstadoVisual(escala) {
  if (escala.estado !== "PROGRAMADA") return escala.estado
  if (!escala.autorizada) return "PROGRAMADA"

  const salida  = escala.hora_despegue_estimada ? new Date(escala.hora_despegue_estimada) : null
  const llegada = escala.hora_arribo_estimada   ? new Date(escala.hora_arribo_estimada)   : null
  if (!salida || !llegada) return "PROGRAMADA"

  const ahora = new Date()
  if (ahora >= salida && ahora <= llegada) return "EN_DESARROLLO"
  if (ahora > llegada) return "SIN_REGISTRAR"
  return "PROGRAMADA"
}

// FIX: un borrador puede tener estado "PROGRAMADA" y hora_despegue_estimada
// cargada (si ya completaste el itinerario) sin haberse publicado nunca —
// esos dos campos no dependen de la publicación. Sin este chequeo, un
// borrador sin publicar podía mostrar "Abortar escala", algo que no
// tiene sentido operativo (no se puede abortar algo que nunca despegó
// ni fue autorizado a volar).
export function puedeAbortarAhora(escala) {
  if (escala.es_borrador) return false
  if (escala.estado !== "PROGRAMADA") return false
  if (!escala.hora_despegue_estimada) return true
  return new Date() < new Date(escala.hora_despegue_estimada)
}

export function estaPendienteDeAutorizacion(escala) {
  return !escala.autorizada && escala.estado === "PROGRAMADA"
}

export const ESTADOS_EDITABLES_PUBLICADA = ["PROGRAMADA", "RECHAZADA"]

export function yaPasoLaHora(horaEstimada) {
  if (!horaEstimada) return false
  return new Date() >= new Date(horaEstimada)
}

export function puedeEditarAhora(escala) {
  if (escala.es_borrador) return true
  if (!ESTADOS_EDITABLES_PUBLICADA.includes(escala.estado)) return false
  if (!escala.autorizada) return true
  return !yaPasoLaHora(escala.hora_despegue_estimada)
}

export function motivoNoEditable(escala) {
  if (escala.es_borrador) return null
  if (!ESTADOS_EDITABLES_PUBLICADA.includes(escala.estado)) {
    return `No se puede editar: la escala está en estado ${ETIQUETAS_ESTADO[escala.estado] || escala.estado}`
  }
  if (escala.autorizada && yaPasoLaHora(escala.hora_despegue_estimada)) {
    return "No se puede editar: ya pasó la hora de despegue estimada"
  }
  return null
}

export function puedeEliminarse(escala) {
  if (escala.es_borrador) return true
  return !escala.autorizada && escala.estado !== "ABORTADA"
}

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

export function formatearFechaHoraCompacta(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

export function formatearRangoVuelo(horaDespegueIso, horaArriboIso) {
  if (!horaDespegueIso) return "—"
  if (!horaArriboIso) return `${formatearHora(horaDespegueIso)} – —`

  const despegue = new Date(horaDespegueIso)
  const llegada  = new Date(horaArriboIso)
  const mismoDia = despegue.toDateString() === llegada.toDateString()

  if (mismoDia) {
    return `${formatearHora(horaDespegueIso)} – ${formatearHora(horaArriboIso)}`
  }
  return `${formatearFechaHoraCompacta(horaDespegueIso)} – ${formatearFechaHoraCompacta(horaArriboIso)}`
}

export function estadoDetallado(escala) {
  if (escala.es_borrador) return { clave: "BORRADOR", texto: "Borrador" }
  if (escala.estado === "RECHAZADA") return { clave: "RECHAZADA", texto: "Rechazada" }
  if (escala.estado === "ABORTADA")  return { clave: "ABORTADA",  texto: "Abortada" }
  if (escala.estado === "CUMPLIDA")  return { clave: "CUMPLIDA",  texto: "Cumplida" }

  if (!escala.autorizada) {
    if (yaPasoLaHora(escala.hora_despegue_estimada)) {
      return { clave: "VENCIDA_SIN_AUTORIZAR", texto: "Vencida · Sin autorizar" }
    }
    return { clave: "PENDIENTE", texto: "Programada · Pendiente" }
  }

  const visual = calcularEstadoVisual(escala)
  if (visual === "EN_DESARROLLO") return { clave: "EN_DESARROLLO", texto: "En vuelo" }
  if (visual === "SIN_REGISTRAR") return { clave: "SIN_REGISTRAR", texto: "Sin registrar" }
  return { clave: "PROGRAMADA_AUTORIZADA", texto: "Programada · Autorizada" }
}