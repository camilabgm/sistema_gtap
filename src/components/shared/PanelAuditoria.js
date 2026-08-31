// src/components/shared/PanelAuditoria.js
//
// Muestra quién creó / editó / autorizó / cerró un registro — de solo
// lectura, sin ningún botón ni acción adentro (según el principio que
// ya establecimos: visualización y acción nunca se mezclan en el mismo
// bloque). Se usa en Gestión de Escalas, Manifiesto y Post-Vuelo.
//
// Cada fila es opcional — si no se pasa un dato (ej. todavía no fue
// autorizada), esa fila directamente no se dibuja.

function formatearFecha(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Asuncion",
  })
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