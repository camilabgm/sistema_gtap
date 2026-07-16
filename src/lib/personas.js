
export const ESPECIALIDADES_VALIDAS = [
  "PILOTO",
  "COPILOTO",
  "TECNICO_DE_VUELO",
  "MECANICO",
  "ADMINISTRATIVO",
  "OTRO",
]

// Valida el array de especialidades que llega del formulario.
// Sin valor / null → lista vacía (nadie asignado todavía), no es error.
export function normalizarEspecialidades(valor) {
  if (valor === undefined || valor === null) return { valor: [], error: null }
  if (!Array.isArray(valor)) return { valor: null, error: "especialidades debe ser una lista" }

  const unicas = [...new Set(valor)]
  for (const e of unicas) {
    if (!ESPECIALIDADES_VALIDAS.includes(e)) {
      return { valor: null, error: `Especialidad inválida: ${e}` }
    }
  }
  return { valor: unicas, error: null }
}
// Decide si una persona necesita aparecer en la tarjeta de "Alertas" del
// dashboard — mismo criterio de 30 días que ya usa badgeVencimiento() en
// HabilitacionesModal, para no tener dos definiciones de "por vencer"
// dando vueltas por el sistema.
//
// Espera una persona con: nivel_operacional_habilitado, hab_anual_habilitada,
// y habilitaciones_medicas (array con { vence, deleted_at }).
export function necesitaAlertaHabilitacion(persona, diasAntelacion = 30) {
  if (!persona.nivel_operacional_habilitado) return true
  if (persona.hab_anual_habilitada) return false

  const habs = (persona.habilitaciones_medicas || []).filter((h) => !h.deleted_at)
  if (habs.length === 0) return true

  const hoy = new Date()
  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + diasAntelacion)

  const masReciente = habs.sort((a, b) => new Date(b.vence) - new Date(a.vence))[0]
  return new Date(masReciente.vence) <= limite
}