"use client"

// src/components/informes/InformeVuelos.js
//
// CAMBIO (rama fix/responsive-listados):
//   - Encabezado con el componente compartido EncabezadoPagina (solo
//     subtítulo: el título "Informes" ya está arriba de las pestañas).
//     Antes "Exportar PDF" se salía de la tarjeta en un celular angosto.
//   - Filtros: 1 columna en celular, 2 desde 640px, 5 desde 1024px
//     (antes saltaba de 1 a 5 en 768px, y en tablet cada filtro quedaba
//     tan angosto que no se leía la fecha completa).
//   - Tabla desde 1024px; debajo, tarjetas (nuevas — antes había solo
//     tabla, y en celular y tablet había que deslizar de costado para
//     ver la mitad de los datos).
//   - En la tabla, Aeronave·Ruta y Misión·Solicitante ya no tienen
//     whitespace-nowrap: se parten en dos renglones si hace falta, en
//     vez de obligar a la tabla a ser más ancha que la pantalla.
//
// CAMBIO (rama fix/responsive-maestro-detalle): la fecha/hora de cada
// vuelo usa el formateador compartido de fechaHora.js — 24 horas y
// hora de Paraguay explícita, como el resto del sistema.

import { useState, useEffect, useCallback } from "react"
import { Download } from "lucide-react"
import { exportarInformeVuelosPDF } from "@/lib/exportarInformeVuelosPDF"
import EncabezadoPagina from "@/components/shared/EncabezadoPagina"
import { formatearFechaHora as formatearFechaHoraBase } from "@/lib/fechaHora"

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

// Formato "24/09/2026 09:32" — se envuelve el formateador compartido de
// fechaHora.js (24 horas, hora de Paraguay explícita) en vez de tener
// uno propio sin zona horaria, que dependía del reloj de la compu de
// quien mirara el informe.
function formatearFechaHora(iso) {
  return formatearFechaHoraBase(iso, { second: undefined })
}

function textoPaxCarga(f) {
  return f.pasajeros != null || f.carga_kg != null
    ? `${f.pasajeros ?? 0} pax · ${f.carga_kg ?? 0} kg`
    : "—"
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
      <EncabezadoPagina
        subtitulo="Vuelos completados, filtrables por aeronave, tipo de misión e institución"
        acciones={
          <button
            onClick={handleExportarPDF}
            disabled={filas.length === 0}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors h-9 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
      </EncabezadoPagina>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : filas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          Sin vuelos que coincidan con estos filtros.
        </div>
      ) : (
        <>
          {/* ── Escritorio: tabla, visible desde 1024px ── */}
          <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
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
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {f.aeronave_matricula} · {f.ruta}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {f.tipo_mision_codigo} · {f.solicitante}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{f.tripulacion || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{f.horas_vuelo_texto}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {f.combustible_litros != null ? `${f.combustible_litros} L` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{textoPaxCarga(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">{filas.length} vuelos en el período seleccionado</p>
            </div>
          </div>

          {/* ── Celular y tablet: tarjetas, ocultas desde 1024px ── */}
          <div className="lg:hidden space-y-2">
            {filas.map((f) => (
              <div key={f.id} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 min-w-0">
                    {f.aeronave_matricula} · {f.ruta}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
                    {formatearFechaHora(f.hora_despegue_estimada)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{f.tipo_mision_codigo} · {f.solicitante}</p>
                <p className="mt-1 text-xs text-gray-500">{f.tripulacion || "Sin tripulación"}</p>

                <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Horas</p>
                    <p className="font-medium text-gray-900">{f.horas_vuelo_texto}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Combustible</p>
                    <p className="font-medium text-gray-900">
                      {f.combustible_litros != null ? `${f.combustible_litros} L` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pax · Carga</p>
                    <p className="font-medium text-gray-900">{textoPaxCarga(f)}</p>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 text-center py-2">{filas.length} vuelos en el período seleccionado</p>
          </div>
        </>
      )}
    </div>
  )
}