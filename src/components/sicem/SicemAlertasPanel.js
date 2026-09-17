"use client"

import { useState } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"

const ETIQUETAS_COMPONENTE = {
  MOTOR: "Motor",
  HELICE: "Hélice",
  APU: "APU",
}

// Igual que en las otras pantallas de SICEM — local a este archivo,
// no compartido desde un lib.
function formatearMinutos(min) {
  if (min === null || min === undefined) return "—"
  const negativo = min < 0
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${negativo ? "-" : ""}${h}h ${m}min`
}

function formatearFecha(fecha) {
  if (!fecha) return "—"
  return new Date(fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

function badgeMotivo(motivo) {
  const config = {
    horas: { texto: "Horas", clase: "bg-orange-100 text-orange-700" },
    calendario: { texto: "Calendario", clase: "bg-purple-100 text-purple-700" },
  }
  const c = config[motivo]
  if (!c) return null
  return (
    <span key={motivo} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${c.clase}`}>
      {c.texto}
    </span>
  )
}

export default function SicemAlertasPanel({ alertas: datosIniciales }) {

  const [alertas, setAlertas] = useState(datosIniciales)
  const [cargando, setCargando] = useState(false)

  async function recargar() {
    setCargando(true)
    const res = await fetch("/api/sicem/componentes?soloAlertas=true", { credentials: "include" })
    const datos = await res.json()
    // El endpoint no ordena por urgencia (eso es criterio de esta
    // pantalla, no del listado general de Componentes) — se ordena acá
    // mismo, igual que hace el page.js en la carga inicial.
    const ordenadas = [...datos].sort((a, b) => {
      const aHoras = a.horas_disponibles_minutos
      const bHoras = b.horas_disponibles_minutos
      if (aHoras !== null && bHoras !== null) return aHoras - bHoras
      if (aHoras !== null) return -1
      if (bHoras !== null) return 1
      return new Date(a.fecha_proxima_inspeccion) - new Date(b.fecha_proxima_inspeccion)
    })
    setAlertas(ordenadas)
    setCargando(false)
  }

  const superados = alertas.filter((a) => a.horas_disponibles_minutos !== null && a.horas_disponibles_minutos < 0).length
  const porVencer = alertas.length - superados

  return (
    <div className="p-4">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alertas y próximas inspecciones</h1>
            <p className="text-sm text-gray-500 mt-1">Componentes que se acercan o ya superaron su umbral, por horas o por calendario</p>
          </div>
          <button onClick={recargar} disabled={cargando}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors h-9 shrink-0 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2">
            <p className="text-2xl font-bold text-red-700">{superados}</p>
            <p className="text-xs text-red-600">Umbral superado</p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2">
            <p className="text-2xl font-bold text-amber-700">{porVencer}</p>
            <p className="text-xs text-amber-600">Por vencer</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aeronave</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Componente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas disponibles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próx. inspección</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alertas.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Sin alertas — todos los componentes están dentro de rango
                </td>
              </tr>
            ) : (
              alertas.map((c) => (
                <tr key={c.id} className={c.horas_disponibles_minutos < 0 ? "bg-red-50/40" : "hover:bg-gray-50"}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.aeronave.matricula}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{ETIQUETAS_COMPONENTE[c.tipo] || c.tipo}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-1">
                      {(c.motivos_alerta || []).map((m) => badgeMotivo(m))}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm font-medium ${c.horas_disponibles_minutos < 0 ? "text-red-700" : "text-gray-700"}`}>
                    {formatearMinutos(c.horas_disponibles_minutos)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatearFecha(c.fecha_proxima_inspeccion)}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <Link href="/dashboard/sicem/componentes" className="text-blue-600 hover:underline text-xs font-medium">
                      Ver en Componentes
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}