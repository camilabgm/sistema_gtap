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
// El sentido contrario (escribir) no tiene este problema: un string
// "aaaa-mm-dd" que viene de un <input type="date"> ya se interpreta
// como medianoche UTC al hacer `new Date(valor)` — es la especificación
// de JavaScript, no hace falta ningún ajuste ahí.
//
// Cualquier módulo que muestre o precargue un campo "solo fecha" debería
// usar estas dos funciones, en vez de escribir su propia versión.

export function formatearFechaSoloDia(fechaISO, opciones = {}) {
  if (!fechaISO) return "—"
  return new Date(fechaISO).toLocaleDateString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...opciones,
    timeZone: "UTC",
  })
}

export function fechaSoloDiaAInputValue(fechaISO) {
  if (!fechaISO) return ""
  const d = new Date(fechaISO)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}