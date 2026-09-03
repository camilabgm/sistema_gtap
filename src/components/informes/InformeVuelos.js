"use client"

// Destino: src/components/informes/InformeVuelos.js

import { useState, useEffect, useCallback } from "react"
import { Download } from "lucide-react"
import { exportarInformeVuelosPDF } from "@/lib/exportarInformeVuelosPDF"

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

function formatearFechaHora(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export default function InformeVuelos({ aeronaves, tiposMision }) {
  const [desde, setDesde] = useState(formatearISO(primerDiaDelMes()))
  const [hasta, setHasta] = useState(formatearISO(new Date()))
  const [aeronaveId, setAeronaveId] = useState("")
  const [tipoMisionId, setTipoMisionId] = useState("")
  const [solicitante, setSolicitante] = useState("")

  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const buscar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const params = new URLSearchParams({ desde, hasta })
      if (aeronaveId) params.set("aeronave_id", aeronaveId)
      if (tipoMisionId) params.set("tipo_mision_id", tipoMisionId)
      if (solicitante.trim()) params.set("solicitante", solicitante.trim())

      const res = await fetch(`/api/informes/vuelos?${params}`, { credentials: "include" })
      const data = await res.json()
      if (Array.isArray(data)) setFilas(data)
      else setError(data.error || "Error al cargar el informe")
    } catch {
      setError("Error al cargar el informe")
    } finally {
      setCargando(false)
    }
  }, [desde, hasta, aeronaveId, tipoMisionId, solicitante])

  useEffect(() => {
    buscar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleExportarPDF() {
    const aeronaveTexto = aeronaves.find((a) => String(a.id) === aeronaveId)?.matricula || ""
    const tipoMisionTexto = tiposMision.find((t) => String(t.id) === tipoMisionId)?.codigo || ""
    exportarInformeVuelosPDF(filas, {
      desde,
      hasta,
      aeronave: aeronaveTexto,
      tipoMision: tipoMisionTexto,
      solicitante: solicitante.trim(),
    })
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm text-gray-500">Vuelos completados, filtrables por aeronave, tipo de misión e institución</p>
          <button
            onClick={handleExportarPDF}
            disabled={filas.length === 0}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors h-9 shrink-0 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Aeronave</label>
            <select
              value={aeronaveId}
              onChange={(e) => setAeronaveId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="">Todas</option>
              {aeronaves.map((a) => <option key={a.id} value={a.id}>{a.matricula}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de misión</label>
            <select
              value={tipoMisionId}
              onChange={(e) => setTipoMisionId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {tiposMision.map((t) => <option key={t.id} value={t.id}>{t.codigo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Institución / Solicitante</label>
            <input
              type="text"
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              placeholder="Ej: Presidencia"
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <button
          onClick={buscar}
          disabled={cargando}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : filas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          Sin vuelos que coincidan con estos filtros.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aeronave · Ruta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Misión · Solicitante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tripulación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas de vuelo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Combustible</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pax · Carga</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filas.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {formatearFechaHora(f.hora_despegue_estimada)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                    {f.aeronave_matricula} · {f.ruta}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {f.tipo_mision_codigo} · {f.solicitante}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{f.tripulacion || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{f.horas_vuelo_texto}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {f.combustible_litros != null ? `${f.combustible_litros} L` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {f.pasajeros != null || f.carga_kg != null
                      ? `${f.pasajeros ?? 0} pax · ${f.carga_kg ?? 0} kg`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">{filas.length} vuelos en el período seleccionado</p>
          </div>
        </div>
      )}
    </div>
  )
}