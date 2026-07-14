// src/lib/personas.js

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