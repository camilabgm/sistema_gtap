"use client"

import { useState, useMemo } from "react"

const ETIQUETAS_TIPO = {
  PROGRAMADO: "Programado",
  NO_PROGRAMADO: "No programado",
  CALENDARIO: "Calendario",
}

// Igual que en el resto de SICEM — local a este archivo.
function formatearMinutos(min) {
  if (min === null || min === undefined) return "—"
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${m}min`
}

function dentroDelRango(fechaISO, desde, hasta) {
  const f = new Date(fechaISO).getTime()
  if (desde && f < new Date(desde + "T00:00:00").getTime()) return false
  if (hasta && f > new Date(hasta + "T23:59:59").getTime()) return false
  return true
}

export default function SicemEstadisticasPanel({ eventos: datosIniciales }) {

  const [eventos, setEventos] = useState(datosIniciales)
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [cargando, setCargando] = useState(false)

  async function recargar() {
    setCargando(true)
    const res = await fetch("/api/sicem/eventos", { credentials: "include" })
    setEventos(await res.json())
    setCargando(false)
  }

  const eventosFiltrados = useMemo(
    () => eventos.filter((ev) => dentroDelRango(ev.created_at, desde, hasta)),
    [eventos, desde, hasta]
  )

  // ── 1. Cantidad de eventos por tipo y por aeronave ──────────────────
  const porAeronave = useMemo(() => {
    const mapa = new Map()
    for (const ev of eventosFiltrados) {
      const key = ev.aeronave.id
      if (!mapa.has(key)) {
        mapa.set(key, { matricula: ev.aeronave.matricula, PROGRAMADO: 0, NO_PROGRAMADO: 0, CALENDARIO: 0 })
      }
      mapa.get(key)[ev.tipo]++
    }
    return [...mapa.values()].sort((a, b) => a.matricula.localeCompare(b.matricula))
  }, [eventosFiltrados])

  const totalesPorTipo = useMemo(() => {
    const t = { PROGRAMADO: 0, NO_PROGRAMADO: 0, CALENDARIO: 0 }
    for (const ev of eventosFiltrados) t[ev.tipo]++
    return t
  }, [eventosFiltrados])

  // ── 2. Tiempo promedio No disponible, por aeronave ──────────────────
  const promedioPorAeronave = useMemo(() => {
    const mapa = new Map()
    for (const ev of eventosFiltrados) {
      if (!ev.cerrado || !ev.cerrado_en) continue
      const minutos = (new Date(ev.cerrado_en).getTime() - new Date(ev.created_at).getTime()) / 60000
      const key = ev.aeronave.id
      if (!mapa.has(key)) mapa.set(key, { matricula: ev.aeronave.matricula, sumaMinutos: 0, cantidad: 0 })
      const fila = mapa.get(key)
      fila.sumaMinutos += minutos
      fila.cantidad += 1
    }
    return [...mapa.values()]
      .map((f) => ({ ...f, promedioMinutos: f.sumaMinutos / f.cantidad }))
      .sort((a, b) => a.matricula.localeCompare(b.matricula))
  }, [eventosFiltrados])

  // ── 3. Interno vs. Tercerizado ───────────────────────────────────────
  const porLugar = useMemo(() => {
    const l = { INTERNO: 0, TERCERIZADO: 0, SIN_DEFINIR: 0 }
    for (const ev of eventosFiltrados) l[ev.lugar || "SIN_DEFINIR"]++
    return l
  }, [eventosFiltrados])
  const totalLugar = porLugar.INTERNO + porLugar.TERCERIZADO + porLugar.SIN_DEFINIR
  const pct = (n) => (totalLugar === 0 ? "—" : `${Math.round((n / totalLugar) * 100)}%`)

  return (
    <div className="p-4">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estadística de mantenimiento</h1>
            <p className="text-sm text-gray-500 mt-1">Cantidad de eventos, tiempo No disponible, y lugar de mantenimiento — sobre el historial de Eventos</p>
          </div>
          <button onClick={recargar} disabled={cargando}
            className="text-xs text-gray-500 border border-gray-300 rounded-md px-3 h-9 hover:bg-gray-50 transition-colors disabled:opacity-50">
            {cargando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-gray-500">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm" />
          <label className="text-xs text-gray-500">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm" />
          {(desde || hasta) && (
            <button onClick={() => { setDesde(""); setHasta("") }} className="text-xs text-blue-600 hover:underline">
              Ver todo el historial
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Eventos por tipo y aeronave</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aeronave</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Programado</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No prog.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Calendario</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {porAeronave.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin eventos en este período</td></tr>
              ) : porAeronave.map((f) => (
                <tr key={f.matricula}>
                  <td className="px-4 py-2 font-medium text-gray-900">{f.matricula}</td>
                  <td className="px-4 py-2 text-gray-700">{f.PROGRAMADO}</td>
                  <td className="px-4 py-2 text-gray-700">{f.NO_PROGRAMADO}</td>
                  <td className="px-4 py-2 text-gray-700">{f.CALENDARIO}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{f.PROGRAMADO + f.NO_PROGRAMADO + f.CALENDARIO}</td>
                </tr>
              ))}
            </tbody>
            {porAeronave.length > 0 && (
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-4 py-2 text-gray-700">Total flota</td>
                  <td className="px-4 py-2 text-gray-700">{totalesPorTipo.PROGRAMADO}</td>
                  <td className="px-4 py-2 text-gray-700">{totalesPorTipo.NO_PROGRAMADO}</td>
                  <td className="px-4 py-2 text-gray-700">{totalesPorTipo.CALENDARIO}</td>
                  <td className="px-4 py-2 text-gray-900">
                    {totalesPorTipo.PROGRAMADO + totalesPorTipo.NO_PROGRAMADO + totalesPorTipo.CALENDARIO}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Tiempo promedio No disponible</h2>
            <p className="text-xs text-gray-400 mt-0.5">Solo eventos ya cerrados — uno abierto no tiene una duración definida todavía</p>
          </div>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aeronave</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Promedio</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Eventos cerrados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promedioPorAeronave.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Sin eventos cerrados en este período</td></tr>
              ) : promedioPorAeronave.map((f) => (
                <tr key={f.matricula}>
                  <td className="px-4 py-2 font-medium text-gray-900">{f.matricula}</td>
                  <td className="px-4 py-2 text-gray-700">{formatearMinutos(f.promedioMinutos)}</td>
                  <td className="px-4 py-2 text-gray-700">{f.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Lugar de mantenimiento</h2>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2">
            <p className="text-2xl font-bold text-blue-700">{porLugar.INTERNO} <span className="text-sm font-normal">({pct(porLugar.INTERNO)})</span></p>
            <p className="text-xs text-blue-600">Interno</p>
          </div>
          <div className="rounded-md border border-purple-200 bg-purple-50 px-4 py-2">
            <p className="text-2xl font-bold text-purple-700">{porLugar.TERCERIZADO} <span className="text-sm font-normal">({pct(porLugar.TERCERIZADO)})</span></p>
            <p className="text-xs text-purple-600">Tercerizado</p>
          </div>
          {porLugar.SIN_DEFINIR > 0 && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-2">
              <p className="text-2xl font-bold text-gray-500">{porLugar.SIN_DEFINIR} <span className="text-sm font-normal">({pct(porLugar.SIN_DEFINIR)})</span></p>
              <p className="text-xs text-gray-500">Sin definir</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}