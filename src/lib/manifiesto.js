// src/lib/manifiesto.js
//
// Funciones puras de negocio para Manifiesto — sin dependencias de
// React, mismo criterio que lib/postVuelo.js. Se importan tanto desde
// route.js (servidor) como desde componentes (cliente), por eso no
// pueden tener nada de Prisma ni de Next acá adentro.

import { esTripulanteDeEscala } from "@/lib/postVuelo"

// Roles con acceso a Crear/Editar/Eliminar Manifiesto en CUALQUIER
// escala (según la matriz de permisos). El resto de los roles con bit
// de permiso (Piloto, Copiloto, Técnico de Vuelo, Supervisor de Semana)
// solo pueden operar sobre las escalas donde ellos mismos participan.
export const ROLES_GLOBAL_MANIFIESTO = [
  "Comandante",
  "Jefe de Operaciones",
  "Comandante del Escuadrón Aéreo",
]

// ¿Esta persona puede crear/editar/eliminar el manifiesto de ESTA
// escala puntual? Se usa DESPUÉS de que conPermiso ya confirmó el bit
// general de MANIFIESTO en la matriz — esta función solo agrega el
// filtro de "es su propia escala" para los roles de tripulación.
//
// escala necesita venir con: tripulacion (persona_id) y acuses
// (persona_id, rol=SUPERVISOR_SEMANA) ya cargados.
export function usuarioPuedeGestionarManifiesto(session, escala) {
  if (!session?.user) return false

  const rol = session.user.rol
  if (ROLES_GLOBAL_MANIFIESTO.includes(rol)) return true

  const personaId = session.user.personaId
  if (!personaId) return false

  if (esTripulanteDeEscala(escala, personaId)) return true

  return (escala.acuses || []).some((a) => a.persona_id === personaId)
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