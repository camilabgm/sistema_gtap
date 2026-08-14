"use client"

import { useState, useEffect, Fragment } from "react"
import PanelPostVuelo from "./PanelPostVuelo"
import { formatearFechaHoraCompacta } from "@/lib/escalas"

export default function ColaPostVuelo() {
  const [escalas, setEscalas] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filaExpandidaId, setFilaExpandidaId] = useState(null)

  function cargarEscalas() {
    setCargando(true)
    fetch("/api/post-vuelo/pendientes", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEscalas(data)
        else setError(data.error || "Error al cargar la cola de post-vuelo")
      })
      .catch(() => setError("Error al cargar la cola de post-vuelo"))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargarEscalas()
  }, [])

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Post-Vuelo</h1>
        <p className="mt-1 text-sm text-gray-500">Escalas que te falta reportar</p>
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : escalas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          No tenés ninguna escala pendiente de reportar. 🎉
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <p className="text-sm font-medium text-blue-800">
              Tenés {escalas.length} escala{escalas.length !== 1 && "s"} para reportar.
            </p>
          </div>

          <div className="space-y-2">
            {escalas.map((e) => {
              const primerTramo = e.itinerarios?.[0]
              const ultimoTramo = e.itinerarios?.[e.itinerarios.length - 1]
              const ruta = primerTramo && ultimoTramo
                ? `${primerTramo.origen} → ${ultimoTramo.destino}`
                : "Sin itinerario cargado"

              const tripulacionTexto = (e.tripulacion || [])
                .map((t) => `${t.persona.grado} ${t.persona.apellido}`)
                .join(", ") || "Sin tripulación cargada"

              const expandida = filaExpandidaId === e.id

              return (
                <Fragment key={e.id}>
                  <button
                    onClick={() => setFilaExpandidaId(expandida ? null : e.id)}
                    className={`flex w-full items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
                      expandida ? "border-blue-200 bg-blue-50/40" : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="min-w-[92px] text-center">
                      <p className="text-sm font-bold text-gray-900">
                        {formatearFechaHoraCompacta(e.hora_despegue_estimada)}
                      </p>
                    </div>
                    <div className="h-10 w-px shrink-0 bg-gray-200" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {e.aeronave?.matricula || "Sin aeronave"} · {ruta}
                        </p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Por reportar
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {tripulacionTexto} · {e.tipo_mision?.codigo || "Sin tipo de misión"}
                        {e.solicitante && ` · Solicitante: ${e.solicitante}`}
                        {e.nro_orden && ` · Orden #${e.nro_orden}`}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600">
                      {expandida ? "Ocultar" : "Reportar"}
                    </span>
                  </button>

                  {expandida && (
                    <div className="mt-1">
                      <PanelPostVuelo
                        escala={e}
                        onCerrar={() => setFilaExpandidaId(null)}
                        onActualizada={cargarEscalas}
                      />
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}