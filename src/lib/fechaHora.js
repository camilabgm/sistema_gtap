// src/lib/fechaHora.js
//
// Utilidad para mostrar campos con hora real (timestamp without time
// zone en Prisma) — created_at, updated_at, deleted_at, y cualquier otro
// campo de auditoría. A diferencia de fechaSoloDia.js (que trabaja en
// UTC porque esos campos NO tienen hora significativa), acá el objetivo
// es el opuesto: mostrar la hora real, convertida explícitamente a hora
// de Paraguay — porque esos timestamps se guardan en UTC (así arma los
// Date la aplicación) y una columna sin zona horaria no hace ninguna
// conversión sola.
//
// Ejemplo del problema que resuelve: TablaLogIntentos.js usaba
// getHours()/getMinutes() a mano, que toman la hora del navegador de
// quien mira la pantalla — mismo bug de fondo que fechaSoloDia.js, pero
// con hora incluida.

export function formatearFechaHora(fecha) {
  if (!fecha) return "—"
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-PY", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Asuncion",
  })
}