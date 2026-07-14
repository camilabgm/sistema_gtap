// Función pura, sin dependencia de Prisma ni de sesión — por eso se
// puede importar tanto desde un Client Component (para armar el
// desplegable) como desde un endpoint (para validar). Un solo lugar
// con la regla de "cómo se parte el campo subtipo", en vez de dos
// copias que puedan desincronizarse.

export function parsearSubtipos(subtipoTexto) {
  if (!subtipoTexto || typeof subtipoTexto !== "string") return []
  return subtipoTexto
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}