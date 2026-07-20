"use client"

import { useState, useEffect } from "react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { calcularEstadoVisual, ETIQUETAS_ESTADO } from "@/lib/escalas"

const BADGE_ESTADO = {
  PROGRAMADA:    "bg-blue-100 text-blue-700",
  EN_DESARROLLO: "bg-amber-100 text-amber-700",
  SIN_REGISTRAR: "bg-purple-100 text-purple-700",
  CUMPLIDA:      "bg-green-100 text-green-700",
  ABORTADA:      "bg-red-100 text-red-700",
  RECHAZADA:     "bg-gray-200 text-gray-600",
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return "—"
  return new Date(fechaISO).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function textoTripulacion(tripulacion) {
  if (!tripulacion || tripulacion.length === 0) return "—"
  return tripulacion.map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", ")
}

export default function HistorialEscalas() {
  const [escalas, setEscalas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    fetch("/api/escalas", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEscalas(data)
        else setError(data.error || "Error al cargar el historial")
      })
      .catch(() => setError("Error al cargar el historial"))
      .finally(() => setCargando(false))
  }, [])

  const filtradas = escalas
    .filter((e) => {
      if (!busqueda.trim()) return true
      const texto = busqueda.toLowerCase()
      return (
        (e.solicitante || "").toLowerCase().includes(texto) ||
        (e.nro_orden || "").toLowerCase().includes(texto) ||
        (e.tipo_mision?.codigo || "").toLowerCase().includes(texto)
      )
    })
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  function descargarPDF() {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text("Historial de Escalas — Sistema GTAP", 14, 15)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Generado: ${new Date().toLocaleString("es-PY")}`, 14, 21)

    autoTable(doc, {
      startY: 26,
      head: [["Solicitante", "Fecha", "N. Orden", "Tripulación", "Tipo de misión", "Estado"]],
      body: filtradas.map((e) => [
        e.solicitante || "—",
        formatearFecha(e.fecha),
        e.nro_orden || "—",
        textoTripulacion(e.tripulacion),
        e.tipo_mision ? `${e.tipo_mision.codigo} — ${e.tipo_mision.nombre}` : "—",
        ETIQUETAS_ESTADO[calcularEstadoVisual(e)] || e.estado,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })

    doc.save(`historial-escalas-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Escalas</h1>
          <p className="text-sm text-gray-500 mt-1">Todas las escalas publicadas, sin límite de fecha</p>
        </div>
        <button
          onClick={descargarPDF}
          disabled={filtradas.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          ⬇ Descargar PDF
        </button>
      </div>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por solicitante, N. de orden o tipo de misión..."
        className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando historial...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          No se encontraron escalas.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N. Orden</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tripulación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de misión</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtradas.map((e) => {
                const estadoVisual = calcularEstadoVisual(e)
                return (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{e.solicitante || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatearFecha(e.fecha)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{e.nro_orden || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{textoTripulacion(e.tripulacion)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{e.tipo_mision?.codigo || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${BADGE_ESTADO[estadoVisual] || "bg-gray-100 text-gray-600"}`}>
                        {ETIQUETAS_ESTADO[estadoVisual] || estadoVisual}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">{filtradas.length} de {escalas.length} escalas</p>
          </div>
        </div>
      )}
    </div>
  )
}