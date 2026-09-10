// src/lib/sicem.js
//
// Funciones puras de negocio para SICEM — mismo criterio que
// lib/postVuelo.js: sin dependencias de React ni de Prisma, para que
// route.js orqueste las escrituras reales (prisma.update, prisma.count,
// transacciones) y estas funciones queden fáciles de testear solas.

// Componentes que se actualizan solos al cerrar un tramo de Post-Vuelo.
// El APU queda afuera a propósito: no corre necesariamente cuando
// corre el motor (puede arrancarse en tierra, o no usarse en un vuelo
// dado), así que sus horas no se pueden derivar de las horas de vuelo
// — las sigue cargando a mano el Jefe de SICEM. Mismo criterio para
// ciclos y aterrizajes, hasta validar con datos reales que el campo
// `aterrizajes` de Post-Vuelo equivale al ATZ del SICEM.
export const COMPONENTES_AUTO_ACTUALIZABLES = ["MOTOR", "HELICE"]

export function esComponenteAutoActualizable(tipo) {
  return COMPONENTES_AUTO_ACTUALIZABLES.includes(tipo)
}

// Horas disponibles de un componente hasta su próximo overhaul/OVH.
// null si todavía no se le cargó un umbral (componente recién creado
// sin configurar) — la UI debe mostrar esto como "sin umbral cargado",
// nunca como si tuviera horas infinitas disponibles.
export function calcularHorasDisponibles(componente) {
  if (componente.umbral_horas_minutos == null) return null
  return componente.umbral_horas_minutos - componente.horas_acumuladas_minutos
}

// Por qué motivo(s) un componente está en alerta — "horas", "calendario",
// ambos, o array vacío si está OK. Separado de necesitaAlerta() para que
// el Panel de Alertas pueda mostrar la razón puntual, no solo un sí/no.
// Umbrales configurables por si el GTAP pide ajustarlos — default 50
// horas / 30 días.
export function motivosAlerta(
  componente,
  { umbralAvisoMinutos = 50 * 60, umbralAvisoDias = 30 } = {}
) {
  const motivos = []

  const disponibles = calcularHorasDisponibles(componente)
  if (disponibles !== null && disponibles <= umbralAvisoMinutos) motivos.push("horas")

  if (componente.fecha_proxima_inspeccion) {
    const diasRestantes = Math.ceil(
      (new Date(componente.fecha_proxima_inspeccion).getTime() - Date.now()) / 86400000
    )
    if (diasRestantes <= umbralAvisoDias) motivos.push("calendario")
  }

  return motivos
}

// Un componente entra en alerta si le quedan pocas horas disponibles,
// o si su fecha de próxima inspección por calendario (cuando aplica,
// ej. hélice) está cerca — sin importar cuál de los dos motivos sea.
export function necesitaAlerta(componente, opciones) {
  return motivosAlerta(componente, opciones).length > 0
}

// Qué motivo_no_disponible corresponde en Aeronaves cuando se abre un
// Evento de Mantenimiento — reutiliza el enum MotivoNoDisponible que
// ya existe, no inventa nada nuevo. esAccidente viene de si el evento
// se originó en un Post-Vuelo con novedad ACCIDENTE.
export function motivoNoDisponiblePara(esAccidente) {
  return esAccidente ? "ACCIDENTADA" : "EN_MANTENIMIENTO"
}

// Después de cerrar un Evento de Mantenimiento, ¿la aeronave puede
// volver a DISPONIBLE? Solo si no le queda ningún otro evento abierto
// — puede haber más de uno simultáneo (ej. un cambio de hélice
// programado mientras se resuelve un incidente aparte). route.js le
// pasa la cantidad de otros eventos abiertos que ya consultó con
// prisma.count().
export function puedeVolverADisponible(otrosEventosAbiertos) {
  return otrosEventosAbiertos === 0
}