// src/lib/fechaSoloDia.js
//
// Utilidades para campos "solo fecha" (@db.Date en Prisma) — sin hora,
// como Escala.fecha, HabilitacionMedica.vence, ParteDiario.fecha o
// Persona.fecha_nacimiento.
//
// Estos campos se guardan siempre como medianoche UTC. Si se leen con
// los getters LOCALES de JavaScript (getFullYear/getMonth/getDate) en un
// huso horario detrás de UTC — como Paraguay — el día se corre uno para
// atrás. Por eso, todo lo que MUESTRE uno de estos campos tiene que usar
// los getters UTC (getUTCFullYear/getUTCMonth/getUTCDate), o pasar
// timeZone: "UTC" a toLocaleDateString.
//
// El sentido contrario (escribir) en general no tiene este problema: un
// string "aaaa-mm-dd" que viene de un <input type="date"> ya se
// interpreta como medianoche UTC al hacer `new Date(valor)` — es la
// especificación de JavaScript. normalizarFechaSoloDia() existe igual,
// como punto único y explícito para ese paso, en vez de dejar que cada
// route.js haga `new Date(valor)` a mano por su cuenta.
//
// Cualquier módulo que muestre, precargue, escriba o calcule "hoy" para
// un campo "solo fecha" debería usar estas funciones, en vez de escribir
// su propia versión.

// Normaliza cualquier valor (string "YYYY-MM-DD" o Date) a un Date en
// medianoche UTC exacta. Usar SIEMPRE que se guarde un campo "solo
// fecha" en la base.
export function normalizarFechaSoloDia(valor) {
  if (!valor) return null

  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null
    return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()))
  }

  const texto = `${valor}`.trim()
  const fecha = new Date(`${texto}T00:00:00.000Z`)
  return isNaN(fecha.getTime()) ? null : fecha
}

// Formatea un campo "solo fecha" para mostrar en pantalla, SIEMPRE en
// UTC — nunca en la hora local de quien esté mirando.
export function formatearFechaSoloDia(fechaISO, opciones = {}) {
  if (!fechaISO) return "—"
  return new Date(fechaISO).toLocaleDateString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...opciones,
    timeZone: "UTC",
  })
}

// Convierte un campo "solo fecha" al formato "YYYY-MM-DD" que espera el
// value de un <input type="date">, leyendo año/mes/día siempre en UTC.
export function fechaSoloDiaAInputValue(fechaISO) {
  if (!fechaISO) return ""
  const d = new Date(fechaISO)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

// Calcula "hoy" según la hora de PARAGUAY explícitamente — nunca según
// la zona horaria configurada en el sistema operativo del servidor. Sin
// esto, si el servidor Ubuntu quedara en UTC, el sistema pensaría que ya
// es "mañana" entre las 20:00 y las 23:59 hora de Paraguay. Devuelve un
// Date en medianoche UTC, mismo formato que normalizarFechaSoloDia().
export function hoyEnParaguay() {
  const hoyTexto = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

  return normalizarFechaSoloDia(hoyTexto)
}