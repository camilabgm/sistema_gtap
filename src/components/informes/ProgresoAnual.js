"use client"

// Destino: src/components/informes/ProgresoAnual.js
//
// Grupo 3 — gráfico + tabla combinados, como se decidió. Usa Recharts
// (npm install recharts si todavía no está en el proyecto).
//
// CAMBIO: se agrega exportar a PDF — exporta la tabla de meses del año
// elegido (el gráfico en sí no se captura, ver el comentario del
// exportador).

import { useState, useEffect, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Download } from "lucide-react"
import { exportarProgresoAnualPDF } from "@/lib/exportarProgresoAnualPDF"

const NOMBRES_MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export default function ProgresoAnual() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [meses, setMeses] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const buscar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/informes/progreso-anual?anio=${anio}`, { credentials: "include" })
      const data = await res.json()
      if (res.ok) setMeses(data.meses)
      else setError(data.error || "Error al cargar")
    } catch {
      setError("Error al cargar")
    } finally {
      setCargando(false)
    }
  }, [anio])

  useEffect(() => { buscar() }, [buscar])

  const datosGrafico = meses.map((m) => ({
    mes: NOMBRES_MES[m.mes],
    Programados: m.programados,
    Cumplidos: m.cumplidos,
    Abortados: m.abortados,
  }))

  const anioActual = new Date().getFullYear()
  const opcionesAnio = [anioActual - 2, anioActual - 1, anioActual, anioActual + 1]

  function handleExportarPDF() {
    exportarProgresoAnualPDF(meses, anio)
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
            <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {opcionesAnio.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button
            onClick={handleExportarPDF}
            disabled={meses.length === 0}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors h-9 shrink-0 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Programados" fill="#2a78d6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cumplidos" fill="#1baf7a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Abortados" fill="#e34948" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Programados</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cumplidos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Abortados</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {meses.map((m) => {
                  const pct = m.programados > 0 ? Math.round((m.cumplidos / m.programados) * 100) : 0
                  return (
                    <tr key={m.mes} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{NOMBRES_MES[m.mes]}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{m.programados}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{m.cumplidos}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{m.abortados}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{m.programados > 0 ? `${pct}%` : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}