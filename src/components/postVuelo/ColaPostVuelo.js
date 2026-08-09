"use client"

import { useState, useEffect, Fragment } from "react"
import PanelDetalleEscala from "@/components/escalas/PanelDetalleEscala"
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
    <div className="p-8 max-w-4xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Post-Vuelo</h1>
        <p className="text-sm text-gray-500 mt-1">Escalas que te falta reportar</p>
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : escalas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          No tenés ninguna escala pendiente de reportar. 🎉
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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
                        {e.solicitante && ` · Solicitante: ${e.solicitante}`}
                        {e.nro_orden && ` · Orden #${e.nro_orden}`}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full font-medium bg-purple-100 text-purple-700 shrink-0">
                      {expandida ? "Ocultar" : "Reportar"}
                    </span>
                  </button>

                  {expandida && (
                    <div className="mt-1">
                      <PanelDetalleEscala
                        escala={e}
                        puedeEditar={false}
                        mostrarPostVuelo={true}
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