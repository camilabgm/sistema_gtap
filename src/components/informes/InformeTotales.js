"use client"

// Destino: src/components/informes/InformeTotales.js
//
// Grupo 2 — totales agregados: por tripulante, por aeronave, por tipo
// de misión (combustible). Mismo filtro de fecha para las 3, cambia
// solo la pestaña activa.

import { useState, useEffect, useCallback } from "react"

function primerDiaDelMes() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
}
function formatearISO(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const PESTANAS = [
  { key: "por_tripulante", label: "Por tripulante" },
  { key: "por_aeronave", label: "Por aeronave" },
  { key: "por_tipo_mision", label: "Combustible por tipo de misión" },
]

export default function InformeTotales() {
  const [desde, setDesde] = useState(formatearISO(primerDiaDelMes()))
  const [hasta, setHasta] = useState(formatearISO(new Date()))
  const [pestana, setPestana] = useState("por_tripulante")
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const buscar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/informes/totales?desde=${desde}&hasta=${hasta}`, { credentials: "include" })
      const data = await res.json()
      if (res.ok) setDatos(data)
      else setError(data.error || "Error al cargar")
    } catch {
      setError("Error al cargar")
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => { buscar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filas = datos?.[pestana] || []

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <button onClick={buscar} disabled={cargando}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {cargando ? "Buscando..." : "Buscar"}
          </button>
        </div>

        <div className="flex gap-1 mt-4 border-b border-gray-200">
          {PESTANAS.map((p) => (
            <button key={p.key} onClick={() => setPestana(p.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                pestana === p.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : filas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          Sin datos para este período.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {pestana === "por_tripulante" ? "Tripulante" : pestana === "por_aeronave" ? "Aeronave" : "Tipo de misión"}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Vuelos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {pestana === "por_tipo_mision" ? "Combustible" : "Horas de vuelo"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filas.map((f, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {f.nombre ?? f.matricula}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{f.vuelos}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {pestana === "por_tipo_mision" ? `${f.litros} L` : f.horas_texto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}