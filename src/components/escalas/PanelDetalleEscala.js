"use client"

import { useState } from "react"
import { ETIQUETAS_ESTADO, ETIQUETAS_MOTIVO_ABORTO, calcularEstadoVisual, puedeAbortarAhora, estaPendienteDeAutorizacion, formatearHora, useTick } from "@/lib/escalas"

const MOTIVOS_ABORTO = Object.keys(ETIQUETAS_MOTIVO_ABORTO)

export default function PanelDetalleEscala({ escala, puedeEditar, onCerrar, onActualizada }) {
  useTick() // el estado visual (Programada/En vuelo) se actualiza solo

  const [mostrarFormAbortar, setMostrarFormAbortar] = useState(false)
  const [motivoAbortada, setMotivoAbortada] = useState(MOTIVOS_ABORTO[0])
  const [observacionAborto, setObservacionAborto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const e = escala
  const estadoVisual = calcularEstadoVisual(e)
  const pendiente = estaPendienteDeAutorizacion(e)
  const primerTramo = e.itinerarios?.[0]
  const ultimoTramo = e.itinerarios?.[e.itinerarios.length - 1]
  const ruta = primerTramo && ultimoTramo ? `${primerTramo.origen} → ${ultimoTramo.destino}` : "Sin itinerario cargado"

  const elegibleParaAbortar = puedeEditar && puedeAbortarAhora(e)

  async function handleAbortar() {
    setError(null)
    setEnviando(true)
    try {
      const res = await fetch(`/api/escalas/${e.id}/abortar`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo_abortada: motivoAbortada,
          observacion_aborto: observacionAborto.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al abortar la escala")
      setMostrarFormAbortar(false)
      onActualizada?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {pendiente && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-medium">
          ⏳ Todavía no fue autorizada — está esperando que la revise el autorizante activo.
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {e.aeronave?.matricula || "Sin aeronave"} · {ruta} · {ETIQUETAS_ESTADO[estadoVisual] || estadoVisual}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatearHora(e.hora_despegue_estimada)} – {formatearHora(e.hora_arribo_estimada)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tripulación:{" "}
            {(e.tripulacion || []).length > 0
              ? e.tripulacion.map((t, i) => (
                  <span key={i}>
                    {t.persona.grado} {t.persona.apellido} ({t.rol_en_vuelo.replace(/_/g, " ").toLowerCase()})
                    {i < e.tripulacion.length - 1 ? ", " : ""}
                  </span>
                ))
              : "Sin tripulación cargada"}
          </p>
          {e.tipo_mision && (
            <p className="text-xs text-gray-500 mt-1">
              Tipo de misión: {e.tipo_mision.codigo} · Solicitante: {e.solicitante}
              {e.nro_orden && ` · Orden #${e.nro_orden}`}
            </p>
          )}
          {e.estado === "ABORTADA" && e.motivo_abortada && (
            <p className="text-xs text-red-600 mt-1">
              Motivo del aborto: {ETIQUETAS_MOTIVO_ABORTO[e.motivo_abortada] || e.motivo_abortada}
              {e.observacion_aborto && ` — ${e.observacion_aborto}`}
            </p>
          )}
          {e.estado === "RECHAZADA" && e.motivo_rechazo && (
            <p className="text-xs text-gray-600 mt-1">Motivo del rechazo: {e.motivo_rechazo}</p>
          )}
        </div>
        <button onClick={onCerrar} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
          ✕ cerrar
        </button>
      </div>

      {elegibleParaAbortar && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {!mostrarFormAbortar ? (
            <button
              onClick={() => setMostrarFormAbortar(true)}
              className="text-xs text-red-600 border border-red-200 rounded-md px-3 py-1.5 font-medium hover:bg-red-50 transition-colors"
            >
              Abortar escala
            </button>
          ) : (
            <div className="space-y-2">
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={motivoAbortada}
                  onChange={(ev) => setMotivoAbortada(ev.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  {MOTIVOS_ABORTO.map((m) => (
                    <option key={m} value={m}>{ETIQUETAS_MOTIVO_ABORTO[m]}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={observacionAborto}
                  onChange={(ev) => setObservacionAborto(ev.target.value)}
                  placeholder="Observación (opcional)"
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAbortar}
                  disabled={enviando}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {enviando ? "..." : "Confirmar aborto"}
                </button>
                <button
                  onClick={() => setMostrarFormAbortar(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}