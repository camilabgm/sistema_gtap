// src/lib/manifiesto.js
//
// Funciones puras de negocio para Manifiesto — sin dependencias de
// React, mismo criterio que lib/postVuelo.js.
//
// REGLA DE ACCESO CONFIRMADA (matriz PERMISOS_GTAP_25_08.xlsx, fila de
// observaciones): "En Manifiesto el Supervisor de Semana está
// habilitado para cargar los datos. Una vez que le da cerrar
// manifiesto o se cierra automáticamente ya no puede hacer ni el
// check-in de los pasajeros/cargas".
//
// Los tripulantes (Piloto, Copiloto, Técnico de Vuelo) NO tocan el
// Manifiesto en ningún caso — ni siquiera el Técnico de Vuelo cuando
// está asignado a esa escala puntual. Solo lo carga quien esté de
// turno como Supervisor de Semana, para TODAS las escalas — por eso
// esta función ya no necesita mirar escala.tripulacion ni
// escala.acuses en absoluto: el permiso depende únicamente de
// session.user.esSupervisorSemana, calculado en auth.js a partir del
// rol_secundario activo.

import { yaPasoLaHora } from "@/lib/escalas"

export const ROLES_GLOBAL_MANIFIESTO = [
  "Comandante",
  "Jefe de Operaciones",
  "Comandante del Escuadrón Aéreo",
]

// El Manifiesto se cierra solo (sin que nadie apriete nada) en cuanto
// pasa la hora estimada de despegue, o si la escala ya está
// CUMPLIDA/ABORTADA — mismo criterio que yaPasoLaHora() en Post-Vuelo.
// EN_VUELO nunca se guarda como valor real en la base (ver
// calcularEstadoVisual en escalas.js), por eso el cierre automático se
// calcula por hora, no por un cambio de estado guardado.
// manifiesto_cerrado sigue existiendo aparte para el cierre MANUAL,
// antes de que se cumpla cualquiera de esas condiciones.
export function manifiestoEstaCerrado(escala) {
  if (escala.manifiesto_cerrado) return true
  if (escala.estado === "CUMPLIDA" || escala.estado === "ABORTADA") return true
  return yaPasoLaHora(escala.hora_despegue_estimada)
}

// ¿Esta persona puede crear/editar/eliminar el Manifiesto de ESTA
// escala puntual? Se usa DESPUÉS de que conSesion ya confirmó que hay
// una sesión válida — acá vive el chequeo real, no en la matriz.
export function usuarioPuedeGestionarManifiesto(session, escala) {
  if (!session?.user) return false

  if (ROLES_GLOBAL_MANIFIESTO.includes(session.user.rol)) return true

  if (manifiestoEstaCerrado(escala)) return false

  // Supervisor de Semana: cubre CUALQUIER escala, no una en particular
  // — es la única vía de tripulación que carga Manifiesto.
  return !!session.user.esSupervisorSemana
}

// Variante para el resaltado de "te toca a vos" en la lista de
// escalas. Con la regla confirmada, ya no es "tripulante de ESTA
// escala" — es "sos el Supervisor de Semana activo, y este manifiesto
// sigue abierto". Por eso se resalta en TODAS las escalas abiertas
// mientras estés de turno, no en una asignación puntual.
export function teCorrespondeCompletarManifiesto(session, escala) {
  if (!session?.user) return false
  if (manifiestoEstaCerrado(escala)) return false
  return !!session.user.esSupervisorSemana
}

// Hora de salida/llegada a mostrar: estimada si la escala sigue
// PROGRAMADA, real (tomada del primer y último tramo del itinerario)
// si ya está CUMPLIDA.
export function obtenerHorasEfectivas(escala) {
  if (escala.estado === "CUMPLIDA") {
    const ordenados = [...(escala.itinerarios || [])].sort((a, b) => a.orden - b.orden)
    const primero = ordenados[0]
    const ultimo = ordenados[ordenados.length - 1]
    return {
      salida: primero?.hora_real_salida ?? null,
      llegada: ultimo?.hora_real_llegada ?? null,
      esReal: true,
    }
  }
  return {
    salida: escala.hora_despegue_estimada,
    llegada: escala.hora_arribo_estimada,
    esReal: false,
  }
}

// Minutos → "HH:MM"
export function formatearMinutos(minutos) {
  if (minutos === null || minutos === undefined) return null
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export function calcularOcupacion(cantidadPasajeros, capacidadAeronave) {
  if (!capacidadAeronave) return null
  return Math.round((cantidadPasajeros / capacidadAeronave) * 100)
}

// Construye la cadena de ruta completa a partir de todos los tramos,
// ej. itinerarios [SGAS→SGCO, SGCO→SGAS] → "SGAS-SGCO-SGAS"
export function construirCadenaRuta(itinerarios) {
  const ordenados = [...(itinerarios || [])].sort((a, b) => a.orden - b.orden)
  if (ordenados.length === 0) return ""
  const partes = [ordenados[0].origen, ...ordenados.map((t) => t.destino)]
  return partes.join("-")
}

// Validación simétrica — la usan tanto POST como PUT de pasajeros.
export function validarPasajero(data) {
  const nro_documento = `${data?.nro_documento ?? ""}`.trim()
  const nombre = `${data?.nombre ?? ""}`.trim()
  const apellido = `${data?.apellido ?? ""}`.trim()
  const nacionalidad = `${data?.nacionalidad ?? ""}`.trim()

  if (!nro_documento) return { error: "El número de documento es obligatorio" }
  if (!nombre) return { error: "El nombre es obligatorio" }
  if (!apellido) return { error: "El apellido es obligatorio" }
  if (!nacionalidad) return { error: "La nacionalidad es obligatoria" }

  return { valor: { nro_documento, nombre, apellido, nacionalidad } }
}

// Validación simétrica — la usan tanto POST como PUT de cargas.
export function validarCarga(data) {
  const tipo = `${data?.tipo ?? ""}`.trim()
  const descripcion = data?.descripcion ? `${data.descripcion}`.trim() : null
  const pesoRaw = data?.peso

  if (!tipo) return { error: "El tipo de carga es obligatorio" }

  let peso = null
  if (pesoRaw !== undefined && pesoRaw !== null && pesoRaw !== "") {
    peso = Number(pesoRaw)
    if (Number.isNaN(peso) || peso < 0) return { error: "El peso debe ser un número válido" }
  }

  return { valor: { tipo, descripcion, peso } }
}