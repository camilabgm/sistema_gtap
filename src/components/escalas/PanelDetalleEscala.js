"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useTick } from "@/lib/useTick"
import { ETIQUETAS_ESTADO, ETIQUETAS_MOTIVO_ABORTO, calcularEstadoVisual, puedeAbortarAhora, estaPendienteDeAutorizacion, formatearHora, formatearRangoVuelo } from "@/lib/escalas"
import { puedeCargarPostVuelo } from "@/lib/postVuelo"
import { formatearFechaHora } from "@/lib/fechaHora"

const MOTIVOS_ABORTO = Object.keys(ETIQUETAS_MOTIVO_ABORTO)

const ETIQUETAS_NOVEDAD = {
  SIN_NOVEDAD: "Sin novedad",
  INCIDENTE: "Incidente",
  ACCIDENTE: "Accidente",
}

const ETIQUETAS_ROL_ACUSE = {
  PILOTO: "Piloto",
  COPILOTO: "Copiloto",
  TECNICO_DE_VUELO: "Técnico de Vuelo",
  SUPERVISOR_SEMANA: "Supervisor de Semana",
}

function formatearMinutos(min) {
  if (min === null || min === undefined) return "—"
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}min`
}

export default function PanelDetalleEscala({ escala, puedeEditar, mostrarPostVuelo = true, onCerrar, onActualizada }) {
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

  // ── Acuse de Recibo ─────────────────────────────────────────────
  const [acuse, setAcuse] = useState(null)
  const [acuseCargando, setAcuseCargando] = useState(true)
  const [acuseError, setAcuseError] = useState(null)
  const [acuseGuardando, setAcuseGuardando] = useState(false)

  const cargarAcuse = useCallback(() => {
    setAcuseCargando(true)
    setAcuseError(null)
    fetch(`/api/escalas/${e.id}/acuse`, { credentials: "include" })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Error al consultar el acuse")
        return data
      })
      .then((data) => setAcuse(data.acuse))
      .catch((err) => setAcuseError(err.message))
      .finally(() => setAcuseCargando(false))
  }, [e.id])

  useEffect(() => {
    cargarAcuse()
  }, [cargarAcuse])

  async function handleAcusarRecibo() {
    setAcuseError(null)
    setAcuseGuardando(true)
    try {
      const res = await fetch(`/api/escalas/${e.id}/acuse`, { method: "PUT", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al acusar recibo")
      onActualizada?.()
      cargarAcuse()
    } catch (err) {
      setAcuseError(err.message)
    } finally {
      setAcuseGuardando(false)
    }
  }

  // ── Post-Vuelo — SOLO LECTURA ────────────────────────────────────
  // La edición (tramos y cierre) vive únicamente en el módulo
  // Post-Vuelo (PanelPostVuelo). Acá solo se muestra lo ya cargado,
  // para no repetir la lógica de edición en dos lugares y no
  // sobrecargar Gestión/Agenda.
  const relevantePostVuelo = mostrarPostVuelo && (e.estado === "CUMPLIDA" || puedeCargarPostVuelo(e))

  const [pvCargando, setPvCargando] = useState(false)
  const [pvData, setPvData] = useState(null)
  const [pvError, setPvError] = useState(null)

  const cargarPostVuelo = useCallback(() => {
    if (!relevantePostVuelo) return
    setPvCargando(true)
    setPvError(null)
    fetch(`/api/escalas/${e.id}/post-vuelo`, { credentials: "include" })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Error al cargar el post-vuelo")
        return data
      })
      .then((data) => setPvData(data))
      .catch((err) => setPvError(err.message))
      .finally(() => setPvCargando(false))
  }, [e.id, relevantePostVuelo])

  useEffect(() => {
    cargarPostVuelo()
  }, [cargarPostVuelo])

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
          <p className="text-xs text-gray-400 mt-1">
            Escala #{e.id}{e.nro_orden && ` · Orden #${e.nro_orden}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatearRangoVuelo(e.hora_despegue_estimada, e.hora_arribo_estimada)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tripulación:{" "}
            {(e.tripulacion || []).length > 0
              ? e.tripulacion.map((t, i) => (
                  <span key={i}>
                    {t.persona.grado} {t.persona.apellido}
                    {" "}({t.rol_en_vuelo ? t.rol_en_vuelo.replace(/_/g, " ").toLowerCase() : "rol sin especificar"})
                    {i < e.tripulacion.length - 1 ? ", " : ""}
                  </span>
                ))
              : "Sin tripulación cargada"}
          </p>
          {e.tipo_mision && (
            <p className="text-xs text-gray-500 mt-1">
              Tipo de misión: {e.tipo_mision.codigo} · Solicitante: {e.solicitante}
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

      {!acuseCargando && acuse && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {acuseError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">{acuseError}</div>
          )}
          {!acuse.fecha_acuse ? (
            <div className="flex items-center justify-between gap-3 p-2 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-xs text-purple-800">
                Te falta acusar recibo de esta escala (como {ETIQUETAS_ROL_ACUSE[acuse.rol] || acuse.rol}).
              </p>
              <button
                onClick={handleAcusarRecibo}
                disabled={acuseGuardando}
                className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 shrink-0"
              >
                {acuseGuardando ? "..." : "Acusar recibo"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              ✓ Acusaste recibo el {formatearFechaHora(acuse.fecha_acuse, { year: undefined, second: undefined })}
            </p>
          )}
        </div>
      )}

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

      {relevantePostVuelo && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <p className="text-xs text-gray-400">Post-Vuelo</p>

          {pvCargando ? (
            <p className="text-xs text-gray-400">Cargando post-vuelo...</p>
          ) : pvError && !pvData ? (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">{pvError}</div>
          ) : !pvData ? null : pvData.escala.itinerarios.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs">
              Esta escala no tiene ningún tramo cargado en su itinerario.
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-700">Tramos — hora real</p>
                {pvData.escala.itinerarios.map((t) => (
                  <p key={t.id} className="text-xs text-gray-600">
                    {t.origen} → {t.destino}: {t.hora_real_salida ? formatearHora(t.hora_real_salida) : "—"} →{" "}
                    {t.hora_real_llegada ? formatearHora(t.hora_real_llegada) : "—"}
                  </p>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <p className="text-sm font-bold text-blue-900">
                  Vuelo: {formatearMinutos(pvData.horasCalculadas.horas_vuelo_minutos)} · Tierra:{" "}
                  {formatearMinutos(pvData.horasCalculadas.horas_tierra_minutos)} · Total:{" "}
                  {formatearMinutos(pvData.horasCalculadas.horas_vuelo_minutos + pvData.horasCalculadas.horas_tierra_minutos)}
                </p>
              </div>

              {pvData.postVuelo ? (
                <div className="space-y-1 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700">Post-vuelo</p>
                  <p className="text-xs text-gray-600">Destino real: {pvData.postVuelo.destino_real}</p>
                  <p className="text-xs text-gray-600">
                    Aterrizajes: {pvData.postVuelo.aterrizajes}
                    {pvData.postVuelo.combustible_consumido != null && ` · Combustible: ${pvData.postVuelo.combustible_consumido} L`}
                    {pvData.postVuelo.pasajeros != null && ` · Pasajeros: ${pvData.postVuelo.pasajeros}`}
                  </p>
                  {pvData.postVuelo.novedad !== "SIN_NOVEDAD" && (
                    <p className="text-xs text-red-600">
                      {ETIQUETAS_NOVEDAD[pvData.postVuelo.novedad]}: {pvData.postVuelo.detalle_novedad}
                    </p>
                  )}
                  {pvData.postVuelo.observaciones && (
                    <p className="text-xs text-gray-500">Obs.: {pvData.postVuelo.observaciones}</p>
                  )}
                </div>
              ) : (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Todavía no se cargó el post-vuelo.{" "}
                    <Link href="/dashboard/post-vuelo" className="text-blue-600 hover:underline">
                      Reportarlo en Post-Vuelo →
                    </Link>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}