// src/components/shared/PanelAuditoria.js
//
// Muestra quién creó / editó / autorizó / cerró un registro — de solo
// lectura, sin ningún botón ni acción adentro (visualización y acción
// nunca se mezclan en el mismo bloque). Se usa en Gestión de Escalas,
// Manifiesto y Post-Vuelo.
//
// Cada fila es opcional — si no se pasa un dato (ej. todavía no fue
// autorizada), esa fila directamente no se dibuja.
//
// CAMBIO (rama fix/responsive-maestro-detalle): la fecha usa el
// formateador compartido de fechaHora.js (24 horas, hora de Paraguay),
// en vez de uno propio en formato de 12 horas. Con "a. m."/"p. m.",
// servidor y navegador ponen un espacio invisible distinto antes del
// "a. m." y React da error de hidratación; además, así todas las
// fechas de auditoría del sistema se ven con el mismo formato.

import { formatearFechaHora } from "@/lib/fechaHora"

// "24/09/2026, 09:32" — sin segundos.
function formatearFecha(iso) {
  if (!iso) return null
  return formatearFechaHora(iso, { second: undefined })
}

export default function PanelAuditoria({ items }) {
  const filas = items.filter((item) => item.nombre) // solo lo que tiene dato

  if (filas.length === 0) return null

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <ul className="space-y-0.5">
        {filas.map((item, i) => (
          <li key={i} className="text-xs text-gray-500">
            <span className="text-gray-600">{item.etiqueta}:</span> {item.nombre}
            {item.fecha && <span className="text-gray-400"> — {formatearFecha(item.fecha)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}