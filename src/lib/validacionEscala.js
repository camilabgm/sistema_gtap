// src/lib/validacionEscala.js
//
// Validaciones compartidas de itinerarios, tripulación, solicitante,
// fecha y canal/archivo — usadas al crear (POST /api/escalas), al
// completar un borrador (PUT /api/escalas/[id]) y al editar una escala
// ya publicada (PUT /api/escalas/[id]/editar).
//
// Regla del proyecto: validaciones simétricas — si se cambia una regla
// acá, aplica automáticamente a los tres flujos.

import prisma from "@/lib/prisma"
import { normalizarFechaSoloDia } from "@/lib/fechaSoloDia"

const ROLES_EN_VUELO = ["PILOTO", "COPILOTO", "TECNICO_DE_VUELO"]

export function validarItinerarios(itinerarios) {
  if (!Array.isArray(itinerarios)) return "El itinerario debe ser una lista"
  for (const t of itinerarios) {
    if (t.orden === undefined || t.orden === null) return "Cada tramo necesita un orden"
    if (!t.origen || !`${t.origen}`.trim())   return "Cada tramo necesita un origen"
    if (!t.destino || !`${t.destino}`.trim())  return "Cada tramo necesita un destino"
    if (!t.hora_estimada_salida || !t.hora_estimada_llegada) {
      return "Cada tramo necesita hora estimada de salida y de llegada"
    }
    // Acá alcanza con new Date() crudo, aunque el string no tenga zona:
    // como salida y llegada se parsean con la MISMA interpretación (la
    // que sea), la comparación de orden entre las dos no cambia — el
    // bug de zona horaria afecta el VALOR guardado, no el orden relativo
    // entre dos valores parseados igual.
    const salida  = new Date(t.hora_estimada_salida).getTime()
    const llegada = new Date(t.hora_estimada_llegada).getTime()
    if (isNaN(salida) || isNaN(llegada)) return "Hay un tramo con horarios inválidos"
    if (salida >= llegada) {
      return "En un tramo la salida no puede ser igual o posterior a la llegada"
    }
  }
  return null
}

export function validarTripulacion(tripulacion) {
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

export async function validarEspecialidadTripulacion(tripulacion) {
  const ids = tripulacion.map((t) => parseInt(t.persona_id, 10))
  const personas = await prisma.persona.findMany({
    where: { id: { in: ids } },
    select: { id: true, especialidades: true, grado: true, apellido: true },
  })
  const porId = new Map(personas.map((p) => [p.id, p]))

  for (const t of tripulacion) {
    const pid = parseInt(t.persona_id, 10)
    const persona = porId.get(pid)
    if (!persona) return "Una de las personas de la tripulación no existe"
    if (!(persona.especialidades || []).includes(t.rol_en_vuelo)) {
      const quien = `${persona.grado} ${persona.apellido}`
      const rolTexto = t.rol_en_vuelo.replace(/_/g, " ").toLowerCase()
      return `${quien} no tiene la especialidad "${rolTexto}"`
    }
  }
  return null
}

export function normalizarId(valor) {
  if (valor === undefined) return { tocado: false, valor: undefined, error: null }
  if (valor === null)      return { tocado: true,  valor: null,      error: null }
  const n = parseInt(valor, 10)
  if (!Number.isInteger(n) || n <= 0) return { tocado: true, valor: null, error: "id inválido" }
  return { tocado: true, valor: n, error: null }
}

export function normalizarObservaciones(valor) {
  if (typeof valor !== "string") return undefined
  const recortado = valor.trim()
  return recortado === "" ? null : recortado
}

export function normalizarSubtipoElegido(valor) {
  if (valor === undefined) return { tocado: false, valor: undefined }
  if (valor === null) return { tocado: true, valor: null }
  const recortado = `${valor}`.trim()
  return { tocado: true, valor: recortado === "" ? null : recortado }
}

export function normalizarSolicitante(valor) {
  if (valor === undefined) return { tocado: false, valor: undefined, error: null }
  const recortado = typeof valor === "string" ? valor.trim() : ""
  if (!recortado) return { tocado: true, valor: null, error: "El solicitante no puede quedar vacío" }
  return { tocado: true, valor: recortado, error: null }
}

// Escala.fecha es "solo día" (@db.Date) — mismo tratamiento que
// HabilitacionMedica.vence, Persona.fecha_nacimiento y ParteDiario.fecha:
// se normaliza siempre a medianoche UTC, para no correr un día para
// atrás en husos detrás de UTC como Paraguay.
export function normalizarFecha(valor) {
  if (valor === undefined) return { tocado: false, valor: undefined, error: null }
  const fecha = normalizarFechaSoloDia(valor)
  if (!fecha) return { tocado: true, valor: null, error: "La fecha no es válida" }
  return { tocado: true, valor: fecha, error: null }
}

export function normalizarIdFormData(raw) {
  if (raw === null) return { tocado: false, valor: undefined, error: null }
  if (raw === "") return { tocado: true, valor: null, error: null }
  const n = parseInt(raw, 10)
  if (!Number.isInteger(n) || n <= 0) return { tocado: true, valor: null, error: "id inválido" }
  return { tocado: true, valor: n, error: null }
}

// Nro. de orden — mismo patrón que observaciones: texto opcional,
// vacío se guarda como null.
export function normalizarNroOrden(valor) {
  if (typeof valor !== "string") return undefined
  const recortado = valor.trim()
  return recortado === "" ? null : recortado
}

// ─────────────────────────────────────────────────────────────────────
//  Canal de solicitud + archivo
//
//  WHATSAPP se sacó de la lista: no aporta información de formato — un
//  WhatsApp puede traer un PDF, un Word o una foto reenviada. Los
//  canales que quedan (PDF, IMAGEN, WORD) SON el formato en sí, así que
//  ahora se valida que el archivo (el nuevo, o el que ya tenía la
//  Solicitud si no se subió uno nuevo) sea realmente de ese tipo.
//
//  El enum CanalSolicitud de la base sigue teniendo WHATSAPP —
//  registros históricos que ya lo usan no se tocan — pero no se puede
//  volver a elegir desde acá en adelante.
// ─────────────────────────────────────────────────────────────────────

export const CANALES_VALIDOS = ["PDF", "IMAGEN", "WORD", "VERBAL"]

const EXTENSIONES_POR_CANAL = {
  PDF: [".pdf"],
  IMAGEN: [".png", ".jpg", ".jpeg"],
  WORD: [".doc", ".docx"],
}

function extensionDe(nombreORuta) {
  const partes = `${nombreORuta}`.split(".")
  if (partes.length < 2) return ""
  return `.${partes.pop().toLowerCase()}`
}

// nombreArchivo: el nombre del archivo NUEVO si se subió uno, o la ruta
// guardada del archivo YA EXISTENTE si no se subió uno nuevo — en los
// dos casos alcanza con mirar la extensión. null/undefined si no hay
// ningún archivo (ni nuevo ni existente).
export function validarCanalConArchivo(canal, nombreArchivo) {
  if (!CANALES_VALIDOS.includes(canal)) return "El canal no es válido"
  if (canal === "VERBAL") return null

  if (!nombreArchivo) {
    return "Debe adjuntar el archivo de la solicitud (salvo que el canal sea VERBAL)"
  }

  const extension = extensionDe(nombreArchivo)
  const extensionesValidas = EXTENSIONES_POR_CANAL[canal] || []
  if (!extensionesValidas.includes(extension)) {
    return `El archivo debe ser ${extensionesValidas.join(" o ")} para el canal ${canal}`
  }
  return null
}