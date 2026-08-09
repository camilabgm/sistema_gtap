"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import GanttAeronavesDia from "./GanttAeronavesDia"
import PanelDetalleEscala from "./PanelDetalleEscala"
import {
  formatearFechaHoraCompacta,
  calcularVentanaEnElDia,
  estadoDetallado,
  ESTADO_DETALLADO_CLASES,
  TOOLTIP_ESTADO_DETALLADO,
} from "@/lib/escalas"

const NOMBRES_DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]

function formatearISO(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function lunesDeLaSemana(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function AgendaEscalas({ puedeCrear }) {
  const [offsetSemanas, setOffsetSemanas] = useState(0)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null)
  const [escalasSemana, setEscalasSemana] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [vista, setVista] = useState("LISTA")
  const [filaExpandidaId, setFilaExpandidaId] = useState(null)

  const hoy = new Date()
  const lunesActual = lunesDeLaSemana(hoy)
  const lunesMostrado = new Date(lunesActual)
  lunesMostrado.setDate(lunesMostrado.getDate() + offsetSemanas * 7)

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunesMostrado)
    d.setDate(d.getDate() + i)
    return d
  })
  const domingoMostrado = diasSemana[6]

  useEffect(() => {
    if (offsetSemanas === 0) {
      setFechaSeleccionada(formatearISO(hoy))
    } else {
      setFechaSeleccionada(formatearISO(lunesMostrado))
    }
  }, [offsetSemanas]) // eslint-disable-line react-hooks/exhaustive-deps

  const cargarEscalasSemana = useCallback(async () => {
    setCargando(true)
    setError(null)
    const desde = formatearISO(lunesMostrado)
    const hasta = formatearISO(domingoMostrado)

    try {
      const res = await fetch(`/api/escalas?desde=${desde}&hasta=${hasta}`, { credentials: "include" })
      const data = await res.json()
      if (Array.isArray(data)) setEscalasSemana(data)
      else setError(data.error || "Error al cargar la agenda")
    } catch {
      setError("Error al cargar la agenda")
    } finally {
      setCargando(false)
    }
  }, [offsetSemanas]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargarEscalasSemana()
  }, [cargarEscalasSemana])

  function escalasQueVuelanEse(fechaISO) {
    return escalasSemana.filter(
      (e) => calcularVentanaEnElDia(e.hora_despegue_estimada, e.hora_arribo_estimada, fechaISO) !== null
    )
  }

  const escalasDelDia = fechaSeleccionada ? escalasQueVuelanEse(fechaSeleccionada) : []
  const escalasDelDiaAutorizadas = escalasDelDia.filter((e) => e.autorizada)

  const inicioSemanaISO = formatearISO(lunesMostrado)
  const finSemanaISO    = formatearISO(domingoMostrado)

  function vuelaEnLaSemana(e) {
    if (!e.hora_despegue_estimada) return false
    const inicioSemana = new Date(`${inicioSemanaISO}T00:00:00`)
    const finSemana     = new Date(`${finSemanaISO}T23:59:59.999`)
    const despegue = new Date(e.hora_despegue_estimada)
    const llegada  = e.hora_arribo_estimada ? new Date(e.hora_arribo_estimada) : despegue
    return despegue <= finSemana && llegada >= inicioSemana
  }
  const escalasSemanaReal = escalasSemana.filter(vuelaEnLaSemana)

  const etiquetaSemana =
    offsetSemanas === 0 ? "Semana actual" : offsetSemanas < 0 ? "Semana pasada" : "Próxima semana"

  return (
    <div className="p-8 max-w-4xl mx-auto">

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-1">Qué vuela, cuándo — solo escalas ya publicadas y con horario cargado</p>
        </div>
        {puedeCrear && (
          <Link
            href="/dashboard/escalas/nueva"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nueva escala
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Vuelos del día seleccionado</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{escalasDelDia.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Vuelos en esta semana</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{escalasSemanaReal.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOffsetSemanas((o) => o - 1)}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Semana anterior
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{etiquetaSemana}</span>
            {offsetSemanas !== 0 && (
              <button
                onClick={() => setOffsetSemanas(0)}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Hoy
              </button>
            )}
          </div>
          <button
            onClick={() => setOffsetSemanas((o) => o + 1)}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Semana siguiente →
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {diasSemana.map((d) => {
          const iso = formatearISO(d)
          const esSeleccionado = iso === fechaSeleccionada
          const esHoy = iso === formatearISO(hoy)
          const cantidad = escalasQueVuelanEse(iso).length

          return (
            <button
              key={iso}
              onClick={() => { setFechaSeleccionada(iso); setFilaExpandidaId(null) }}
              className={`flex-1 text-center py-2 px-1 rounded-md border transition-colors ${
                esSeleccionado
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <p className={`text-xs ${esSeleccionado ? "text-blue-100" : "text-gray-400"}`}>
                {NOMBRES_DIA[d.getDay()]}
              </p>
              <p className="text-sm font-medium mt-0.5">
                {d.getDate()}
                {esHoy && !esSeleccionado && <span className="ml-0.5 text-blue-600">•</span>}
              </p>
              {cantidad > 0 && (
                <div className="flex justify-center gap-0.5 mt-1">
                  {Array.from({ length: Math.min(cantidad, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${esSeleccionado ? "bg-white" : "bg-blue-500"}`}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {fechaSeleccionada &&
            new Date(fechaSeleccionada + "T00:00:00").toLocaleDateString("es-PY", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
        </h2>
        <div className="flex bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => setVista("LISTA")}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              vista === "LISTA" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setVista("AERONAVES")}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              vista === "AERONAVES" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Aeronaves
          </button>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando agenda...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : vista === "AERONAVES" ? (
        <GanttAeronavesDia
          escalasDelDia={escalasDelDiaAutorizadas}
          fechaSeleccionada={fechaSeleccionada}
          onActualizada={cargarEscalasSemana}
        />
      ) : escalasDelDia.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          Sin vuelos programados para este día.
        </div>
      ) : (
        <div className="space-y-2">
          {escalasDelDia
            .slice()
            .sort((a, b) => new Date(a.hora_despegue_estimada || 0) - new Date(b.hora_despegue_estimada || 0))
            .map((e) => {
              const primerTramo = e.itinerarios?.[0]
              const ultimoTramo = e.itinerarios?.[e.itinerarios.length - 1]
              const ruta = primerTramo && ultimoTramo
                ? `${primerTramo.origen} → ${ultimoTramo.destino}`
                : "Sin itinerario cargado"

              const tripulacionTexto = (e.tripulacion || [])
                .map((t) => `${t.persona.grado} ${t.persona.apellido}`)
                .join(", ") || "Sin tripulación cargada"

              const estado = estadoDetallado(e)
              const tooltipEstado = TOOLTIP_ESTADO_DETALLADO[estado.clave]
              const expandida = filaExpandidaId === e.id

              return (
                <div key={e.id}>
                  <button
                    onClick={() => setFilaExpandidaId(expandida ? null : e.id)}
                    className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-center min-w-[92px]">
                      <p className="text-sm font-bold text-gray-900">
                        {formatearFechaHoraCompacta(e.hora_despegue_estimada)}
                      </p>
                    </div>
                    <div className="w-px self-stretch bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {e.aeronave?.matricula || "Sin aeronave"} · {ruta}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {tripulacionTexto} · {e.tipo_mision?.codigo || "Sin tipo de misión"}
                      </p>
                    </div>
                    <span
                      title={tooltipEstado}
                      className={`px-2 py-1 text-xs rounded-full font-medium shrink-0 whitespace-nowrap ${
                        ESTADO_DETALLADO_CLASES[estado.clave] || "bg-gray-100 text-gray-600"
                      } ${tooltipEstado ? "cursor-help" : ""}`}
                    >
                      {estado.texto}
                    </span>
                  </button>

                  {expandida && (
                    <div className="mt-1">
                      <PanelDetalleEscala
                        escala={e}
                        puedeEditar={false}
                        mostrarPostVuelo={false}
                        onCerrar={() => setFilaExpandidaId(null)}
                        onActualizada={cargarEscalasSemana}
                      />
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}