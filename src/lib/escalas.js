// src/lib/escalas.js
//
// Funciones puras de negocio para Escalas — SIN dependencias de React.
// Esto es a propósito: este archivo lo importan tanto componentes del
// cliente como route.js del servidor, y un Hook de React acá adentro
// rompe el build del lado servidor. El hook useTick() vive aparte, en
// lib/useTick.js — NO reintroducir acá.
//
// CAMBIO (rama fix/responsive-maestro-detalle): formatearHora y
// formatearFechaHoraCompacta pasan a formato de 24 horas, reutilizando
// formatearFechaHora de fechaHora.js en vez de llamar a
// toLocaleString por su cuenta. Motivo: con el formato de 12 horas
// ("09:32 a. m."), Node.js (servidor) y Chrome (navegador) ponen un
// espacio invisible DISTINTO antes de "a. m." — el texto se ve igual
// pero no es igual, y React tiraba un error de hidratación en cada
// pantalla que dibuja estas fechas desde el servidor (ej. SICEM
// Eventos). En 24 horas no hay "a. m."/"p. m.", así que el problema
// desaparece de raíz. Ambas siguen fijando la hora de Paraguay.
//
// CAMBIO (rama feat/paginacion-servidor): suma CLAVES_ESTADO_DETALLADO
// y condicionEstadoDetallado(), al final del archivo, justo debajo de
// estadoDetallado(). Son la MISMA regla escrita para la base de datos:
// si cambia una, cambia la otra (ver el aviso de más abajo).

import { fechaUTCAInputParaguay, formatearFechaHora } from "@/lib/fechaHora"

export const ETIQUETAS_ESTADO = {
  PROGRAMADA: "Programada",
  EN_DESARROLLO: "En vuelo",
  SIN_REGISTRAR: "Sin registrar",
  CUMPLIDA: "Cumplida",
  ABORTADA: "Abortada",
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
}

export const TOOLTIP_ESTADO_DETALLADO = {
  SIN_REGISTRAR: "Falta cargar el Post-Vuelo de esta escala (horas reales, combustible, novedades). El módulo de Post-Vuelo todavía no está construido en el sistema.",
  PENDIENTE: "Todavía nadie autorizó esta escala — está esperando que la revise el autorizante activo.",
  VENCIDA_SIN_AUTORIZAR: "Ya pasó la hora de despegue estimada y nadie la autorizó — no se puede autorizar así como está. Editala para reprogramarla, o eliminala si ya no corresponde.",
}

// Hora de despegue/llegada ("09:32") — 24 horas, SIEMPRE en hora de
// Paraguay explícita (lo garantiza formatearFechaHora), sin importar la
// zona horaria de quien mire la pantalla. Se apagan día, mes, año y
// segundos para que quede solo la hora.
export function formatearHora(iso) {
  if (!iso) return "—"
  return formatearFechaHora(iso, { day: undefined, month: undefined, year: undefined, second: undefined })
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

export function puedeAbortarAhora(escala) {
  if (escala.es_borrador) return false
  if (escala.estado !== "PROGRAMADA") return false
  if (!escala.hora_despegue_estimada) return true
  return new Date() < new Date(escala.hora_despegue_estimada)
}

export function estaPendienteDeAutorizacion(escala) {
  return !escala.autorizada && escala.estado === "PROGRAMADA"
}

export const ESTADOS_EDITABLES_PUBLICADA = ["PROGRAMADA"]

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
// puedeAbortarAhora() ya decide el true/false, esta
// función explica el motivo cuando da false, para que el ícono
// deshabilitado no quede mudo (mismo patrón que ya tiene el lápiz de
// Editar).

export function motivoNoAbortable(escala) {
  if (escala.es_borrador) {
    return "No se puede abortar: todavía es un borrador, no está publicada"
  }
  if (escala.estado === "CUMPLIDA") {
    return "No se puede abortar: la escala ya está cumplida"
  }
  if (escala.estado === "ABORTADA") {
    return "Esta escala ya fue abortada"
  }
  if (escala.estado !== "PROGRAMADA") {
    return `No se puede abortar: la escala está en estado ${ETIQUETAS_ESTADO[escala.estado] || escala.estado}`
  }
  if (escala.hora_despegue_estimada && new Date() >= new Date(escala.hora_despegue_estimada)) {
    return "No se puede abortar: ya pasó la hora de despegue estimada"
  }
  return null
}

// NOTA: puedeEliminarse() se sacó de acá — Eliminar ahora depende
// únicamente del permiso ESCALAS.puede_eliminar de la matriz, sin
// ninguna regla de estado adicional.

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

// Día, mes y hora ("24/09, 09:32") — 24 horas, SIEMPRE en hora de
// Paraguay explícita. Mismo patrón que ya usa PendientesAutorizar:
// el formateador compartido sin año ni segundos.
export function formatearFechaHoraCompacta(iso) {
  if (!iso) return "—"
  return formatearFechaHora(iso, { year: undefined, second: undefined })
}

export function formatearRangoVuelo(horaDespegueIso, horaArriboIso) {
  if (!horaDespegueIso) return "—"
  if (!horaArriboIso) return `${formatearHora(horaDespegueIso)} – —`

  // "¿Mismo día?" comparado en hora de PARAGUAY explícitamente — no con
  // toDateString(), que depende de la zona horaria de la máquina que
  // ejecuta el código.
  const diaDespegue = fechaUTCAInputParaguay(horaDespegueIso).slice(0, 10)
  const diaLlegada  = fechaUTCAInputParaguay(horaArriboIso).slice(0, 10)
  const mismoDia = diaDespegue === diaLlegada

  if (mismoDia) {
    return `${formatearHora(horaDespegueIso)} – ${formatearHora(horaArriboIso)}`
  }
  return `${formatearFechaHoraCompacta(horaDespegueIso)} – ${formatearFechaHoraCompacta(horaArriboIso)}`
}

export function estadoDetallado(escala) {
  if (escala.es_borrador) return { clave: "BORRADOR", texto: "Borrador" }
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

// ─────────────────────────────────────────────────────────────────────
// ⚠ estadoDetallado() Y condicionEstadoDetallado() SE CAMBIAN JUNTAS ⚠
// ─────────────────────────────────────────────────────────────────────
//
// Los estados de arriba NO están guardados en ninguna columna: se
// calculan mirando varios campos y la hora actual. La base de datos no
// puede ejecutar estadoDetallado(), así que para filtrar por estado en
// el servidor (Gestión de Escalas, paginada) cada estado se traduce a
// una condición de Prisma — un objeto "where".
//
// Son dos versiones de la MISMA regla. Si se toca la lógica de
// estadoDetallado(), calcularEstadoVisual() o yaPasoLaHora(), hay que
// revisar esta traducción en el mismo commit. Las 8 condiciones
// funcionan como casilleros: cada escala cae en EXACTAMENTE UNO (si
// cayera en ninguno, desaparecería de todos los filtros; si cayera en
// dos, aparecería en filtros que no le corresponden).
//
// Cómo comprobar que siguen de acuerdo: en Gestión de Escalas, filtrar
// por cada estado — TODAS las filas tienen que mostrar ese mismo badge
// (el badge lo sigue calculando estadoDetallado() en el navegador).
//
// "ahora" se recibe como parámetro, no se calcula adentro: así todas
// las condiciones de un mismo pedido (la lista, el total y los
// contadores) miran el mismo instante y siempre cuadran entre sí.
//
// Ojo con los vacíos: en la base, una comparación como "mayor que
// ahora" DESCARTA las filas con la hora vacía. Por eso Pendiente y
// Programada · Autorizada piden el vacío explícitamente con un OR.

export const CLAVES_ESTADO_DETALLADO = [
  "BORRADOR",
  "PENDIENTE",
  "VENCIDA_SIN_AUTORIZAR",
  "PROGRAMADA_AUTORIZADA",
  "EN_DESARROLLO",
  "SIN_REGISTRAR",
  "CUMPLIDA",
  "ABORTADA",
]

export function condicionEstadoDetallado(clave, ahora) {
  // Publicada = ya no es borrador. Todo lo que sigue lo exige.
  const publicada = { es_borrador: false }

  // Sin autorizar y sin terminar: ni abortada ni cumplida. Incluye una
  // escala con estado EN_DESARROLLO en la base pero sin autorizar
  // (estadoDetallado mira "autorizada" antes que el estado visual).
  const sinAutorizar = {
    ...publicada,
    autorizada: false,
    estado: { notIn: ["ABORTADA", "CUMPLIDA"] },
  }

  // Autorizada y todavía PROGRAMADA en la base: de acá salen En vuelo,
  // Sin registrar y Programada · Autorizada, según la hora.
  const autorizadaProgramada = { ...publicada, autorizada: true, estado: "PROGRAMADA" }

  switch (clave) {
    case "BORRADOR":
      return { es_borrador: true }

    case "ABORTADA":
      return { ...publicada, estado: "ABORTADA" }

    case "CUMPLIDA":
      return { ...publicada, estado: "CUMPLIDA" }

    // yaPasoLaHora(): ahora >= despegue. Sin hora → "no pasó".
    case "VENCIDA_SIN_AUTORIZAR":
      return { ...sinAutorizar, hora_despegue_estimada: { lte: ahora } }

    case "PENDIENTE":
      return {
        ...sinAutorizar,
        OR: [
          { hora_despegue_estimada: null },
          { hora_despegue_estimada: { gt: ahora } },
        ],
      }

    // calcularEstadoVisual(): un estado distinto de PROGRAMADA se
    // devuelve tal cual (o sea, EN_DESARROLLO guardado en la base); si
    // es PROGRAMADA con las dos horas, "en vuelo" es
    // despegue <= ahora <= arribo.
    case "EN_DESARROLLO":
      return {
        ...publicada,
        autorizada: true,
        OR: [
          { estado: "EN_DESARROLLO" },
          {
            estado: "PROGRAMADA",
            hora_despegue_estimada: { lte: ahora },
            hora_arribo_estimada: { gte: ahora },
          },
        ],
      }

    // ahora > arribo, con las dos horas cargadas — aunque el despegue
    // esté mal cargado DESPUÉS del arribo (así lo resuelve
    // calcularEstadoVisual: pregunta "en vuelo" primero y "ya pasó el
    // arribo" después).
    case "SIN_REGISTRAR":
      return {
        ...autorizadaProgramada,
        hora_despegue_estimada: { not: null },
        hora_arribo_estimada: { lt: ahora },
      }

    // Todo lo demás de autorizadaProgramada: le falta alguna de las dos
    // horas, o el despegue todavía no llegó (y el arribo tampoco pasó).
    case "PROGRAMADA_AUTORIZADA":
      return {
        ...autorizadaProgramada,
        OR: [
          { hora_despegue_estimada: null },
          { hora_arribo_estimada: null },
          {
            hora_despegue_estimada: { gt: ahora },
            hora_arribo_estimada: { gte: ahora },
          },
        ],
      }

    default:
      return null
  }
}