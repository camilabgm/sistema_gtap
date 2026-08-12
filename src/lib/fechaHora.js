// src/lib/fechaHora.js
//
// Utilidades para campos con HORA REAL — a diferencia de fechaSoloDia.js
// (que trabaja siempre en UTC porque la hora ahí no significa nada), acá
// la hora SÍ importa: "el avión despega a las 14:40" tiene que seguir
// significando las 14:40 en Paraguay, sin importar en qué zona horaria
// esté configurado el servidor o el navegador de quien mire la pantalla.
//
// Tres funciones principales, según la dirección:
//   - paraguayInputAFechaUTC(): al GUARDAR una hora. Toma el string sin
//     zona que manda un <input type="datetime-local"> y lo convierte al
//     instante UTC correcto, asumiendo que esos números son hora de
//     Paraguay.
//   - fechaUTCAInputParaguay(): al MOSTRAR/PRECARGAR una hora. Toma el
//     instante UTC guardado y lo convierte de vuelta al string que
//     espera un <input type="datetime-local">, en hora de Paraguay.
//   - fechaEnParaguayDesdeInstante(): para derivar un DÍA (no una hora)
//     a partir de un instante con hora — ej. Escala.fecha, calculada a
//     partir de hora_despegue_estimada. Sacar el día directamente del
//     valor UTC (con .toISOString().slice(0,10)) se rompe en vuelos
//     nocturnos: un despegue a las 23:00 de un martes en Paraguay cae
//     en UTC como las 02:00 del miércoles, y quedaría guardado con la
//     fecha del día equivocado.

function obtenerOffsetMinutos(timeZone, fecha) {
  const formateador = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
  const partes = Object.fromEntries(
    formateador.formatToParts(fecha).map((p) => [p.type, p.value])
  )
  const comoSiFueraUTC = Date.UTC(
    Number(partes.year), Number(partes.month) - 1, Number(partes.day),
    Number(partes.hour), Number(partes.minute), Number(partes.second)
  )
  return (comoSiFueraUTC - fecha.getTime()) / 60000
}

// GUARDAR: string de <input type="datetime-local"> (o cualquier
// "YYYY-MM-DDTHH:mm[:ss]" sin zona) → instante UTC correcto, tratando
// esos números como hora de Paraguay. Si ya viene como Date, se
// devuelve tal cual.
export function paraguayInputAFechaUTC(valorInput) {
  if (!valorInput) return null

  if (valorInput instanceof Date) {
    return isNaN(valorInput.getTime()) ? null : valorInput
  }

  const texto = `${valorInput}`.trim()
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  const [, anio, mes, dia, hora, minuto, segundo] = match

  const pruebaUTC = new Date(Date.UTC(
    Number(anio), Number(mes) - 1, Number(dia),
    Number(hora), Number(minuto), Number(segundo || 0)
  ))

  const offsetMinutos = obtenerOffsetMinutos("America/Asuncion", pruebaUTC)

  return new Date(pruebaUTC.getTime() - offsetMinutos * 60000)
}

// MOSTRAR/PRECARGAR: instante UTC guardado → string "YYYY-MM-DDTHH:mm"
// en hora de Paraguay, listo para el value de un <input type="datetime-local">.
export function fechaUTCAInputParaguay(fecha) {
  if (!fecha) return ""
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (isNaN(d.getTime())) return ""

  const formateador = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Asuncion",
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
  const partes = Object.fromEntries(
    formateador.formatToParts(d).map((p) => [p.type, p.value])
  )
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`
}

// NUEVO — deriva el DÍA (en hora de Paraguay) de un instante con hora —
// ej. para calcular Escala.fecha a partir de hora_despegue_estimada.
// NUNCA usar .toISOString().slice(0,10) para esto: eso saca el día en
// UTC, y en un vuelo nocturno (despegue tarde en Paraguay) da el día
// siguiente al real. Devuelve "YYYY-MM-DD", listo para pasarle a
// normalizarFechaSoloDia().
export function fechaEnParaguayDesdeInstante(instanteUTC) {
  if (!instanteUTC) return null
  const conHora = fechaUTCAInputParaguay(instanteUTC)
  return conHora ? conHora.slice(0, 10) : null
}

// Muestra un timestamp con hora (created_at, fecha_autorizacion, etc.)
// en hora de Paraguay. `opciones` sobreescribe el formato por defecto —
// pasar { year: undefined, second: undefined } para un formato más
// corto (día/mes/hora/minuto, sin año ni segundos).
export function formatearFechaHora(fecha, opciones = {}) {
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
    ...opciones,
  })
}