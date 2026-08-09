"use client"

import { useState, useEffect, useCallback } from "react"
import { useTick } from "@/lib/useTick"
import { ETIQUETAS_ESTADO, ETIQUETAS_MOTIVO_ABORTO, calcularEstadoVisual, puedeAbortarAhora, estaPendienteDeAutorizacion, formatearHora, formatearRangoVuelo } from "@/lib/escalas"
import { puedeCargarPostVuelo } from "@/lib/postVuelo"

const MOTIVOS_ABORTO = Object.keys(ETIQUETAS_MOTIVO_ABORTO)

const ETIQUETAS_NOVEDAD = {
  SIN_NOVEDAD: "Sin novedad",
  INCIDENTE: "Incidente",
  ACCIDENTE: "Accidente",
}
const NOVEDADES = Object.keys(ETIQUETAS_NOVEDAD)

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

function toDatetimeLocalValue(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  // Independiente de mostrarPostVuelo — la decisión fue que se acuse
  // recibo desde cualquier lugar donde se vea la escala (Agenda,
  // Gestión, Cola de Post-Vuelo).
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

  // ── Post-Vuelo ──────────────────────────────────────────────────
  const relevantePostVuelo = mostrarPostVuelo && (e.estado === "CUMPLIDA" || puedeCargarPostVuelo(e))

  const [pvCargando, setPvCargando] = useState(false)
  const [pvData, setPvData] = useState(null)
  const [pvError, setPvError] = useState(null)
  const [pvEditandoCierre, setPvEditandoCierre] = useState(false)
  const [pvGuardando, setPvGuardando] = useState(false)
  const [pvEliminando, setPvEliminando] = useState(false)

  const [tramoValores, setTramoValores] = useState({})
  const [tramoGuardando, setTramoGuardando] = useState(null)

  const [pvDestino, setPvDestino] = useState("")
  const [pvCombustible, setPvCombustible] = useState("")
  const [pvPasajeros, setPvPasajeros] = useState("")
  const [pvAterrizajes, setPvAterrizajes] = useState("")
  const [pvNovedad, setPvNovedad] = useState("SIN_NOVEDAD")
  const [pvDetalleNovedad, setPvDetalleNovedad] = useState("")
  const [pvObservaciones, setPvObservaciones] = useState("")

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
      .then((data) => {
        setPvData(data)

        const valoresIniciales = {}
        for (const t of data.escala.itinerarios) {
          valoresIniciales[t.id] = {
            salida: toDatetimeLocalValue(t.hora_real_salida || t.hora_estimada_salida),
            llegada: toDatetimeLocalValue(t.hora_real_llegada || t.hora_estimada_llegada),
          }
        }
        setTramoValores(valoresIniciales)

        const base = data.postVuelo || data.defaults || {}
        setPvDestino(base.destino_real ?? "")
        setPvAterrizajes(base.aterrizajes ?? "")
        setPvCombustible(data.postVuelo?.combustible_consumido ?? "")
        setPvPasajeros(data.postVuelo?.pasajeros ?? "")
        setPvNovedad(data.postVuelo?.novedad ?? "SIN_NOVEDAD")
        setPvDetalleNovedad(data.postVuelo?.detalle_novedad ?? "")
        setPvObservaciones(data.postVuelo?.observaciones ?? "")
      })
      .catch((err) => setPvError(err.message))
      .finally(() => setPvCargando(false))
  }, [e.id, relevantePostVuelo])

  useEffect(() => {
    cargarPostVuelo()
  }, [cargarPostVuelo])

  function actualizarTramoValor(tramoId, campo, valor) {
    setTramoValores((prev) => ({ ...prev, [tramoId]: { ...prev[tramoId], [campo]: valor } }))
  }

  async function guardarTramo(tramoId) {
    setPvError(null)
    setTramoGuardando(tramoId)
    try {
      const valores = tramoValores[tramoId] || {}
      const res = await fetch(`/api/escalas/${e.id}/itinerarios/${tramoId}/real`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hora_real_salida: valores.salida || null,
          hora_real_llegada: valores.llegada || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar el tramo")

      cargarPostVuelo()
    } catch (err) {
      setPvError(err.message)
    } finally {
      setTramoGuardando(null)
    }
  }

  async function handleGuardarCierre() {
    setPvError(null)
    if (pvAterrizajes === "" || !pvDestino.trim()) {
      setPvError("Completá destino real y cantidad de aterrizajes")
      return
    }
    if (pvNovedad !== "SIN_NOVEDAD" && !pvDetalleNovedad.trim()) {
      setPvError("Si hay una novedad, indicá el detalle")
      return
    }

    setPvGuardando(true)
    try {
      const body = {
        destino_real: pvDestino.trim(),
        combustible_consumido: pvCombustible === "" ? null : Number(pvCombustible),
        pasajeros: pvPasajeros === "" ? null : Number(pvPasajeros),
        aterrizajes: Number(pvAterrizajes),
        novedad: pvNovedad,
        detalle_novedad: pvNovedad !== "SIN_NOVEDAD" ? pvDetalleNovedad.trim() : undefined,
        observaciones: pvObservaciones.trim() || undefined,
      }

      const yaExiste = !!pvData?.postVuelo
      const res = await fetch(`/api/escalas/${e.id}/post-vuelo`, {
        method: yaExiste ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar el post-vuelo")

      setPvEditandoCierre(false)
      onActualizada?.()
      cargarPostVuelo()
    } catch (err) {
      setPvError(err.message)
    } finally {
      setPvGuardando(false)
    }
  }

  async function handleEliminarPostVuelo() {
    const confirmar = window.confirm(
      "¿Eliminar el post-vuelo de esta escala? La escala vuelve a quedar Sin registrar y va a haber que cargarlo de nuevo. Esta acción no se puede deshacer."
    )
    if (!confirmar) return

    setPvError(null)
    setPvEliminando(true)
    try {
      const res = await fetch(`/api/escalas/${e.id}/post-vuelo`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al eliminar el post-vuelo")

      onActualizada?.()
      cargarPostVuelo()
    } catch (err) {
      setPvError(err.message)
    } finally {
      setPvEliminando(false)
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
              ✓ Acusaste recibo el {new Date(acuse.fecha_acuse).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
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
          <p className="text-xs text-gray-400">
            Post-Vuelo de la Escala #{e.id}{e.nro_orden && ` · Orden #${e.nro_orden}`}
            {e.solicitante && ` · Solicitante: ${e.solicitante}`}
          </p>

          {pvCargando ? (
            <p className="text-xs text-gray-400">Cargando post-vuelo...</p>
          ) : pvError && !pvData ? (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">{pvError}</div>
          ) : !pvData ? null : pvData.escala.itinerarios.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs">
              Esta escala no tiene ningún tramo cargado en su itinerario — no se puede reportar el post-vuelo sin al menos un tramo.
              Corregí el itinerario desde Gestión de Escalas → Editar antes de continuar.
            </div>
          ) : (
            <>
              {/* Etapa 1 — tramos, hora real */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Tramos — hora real</p>
                {pvData.escala.itinerarios.map((t) => (
                  <div key={t.id} className="bg-gray-50 rounded-md p-2 space-y-1">
                    <p className="text-xs font-medium text-gray-700">{t.origen} → {t.destino}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-0.5">Salida real</label>
                        <input
                          type="datetime-local"
                          value={tramoValores[t.id]?.salida ?? ""}
                          onChange={(ev) => actualizarTramoValor(t.id, "salida", ev.target.value)}
                          disabled={!pvData.puedeEditarTramos}
                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-0.5">Llegada real</label>
                        <input
                          type="datetime-local"
                          value={tramoValores[t.id]?.llegada ?? ""}
                          onChange={(ev) => actualizarTramoValor(t.id, "llegada", ev.target.value)}
                          disabled={!pvData.puedeEditarTramos}
                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                    {pvData.puedeEditarTramos && (
                      <button
                        onClick={() => guardarTramo(t.id)}
                        disabled={tramoGuardando === t.id}
                        className="text-[11px] text-blue-600 border border-blue-200 rounded-md px-2 py-1 font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {tramoGuardando === t.id ? "..." : "Guardar tramo"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <p className="text-sm font-bold text-blue-900">
                  Vuelo: {formatearMinutos(pvData.horasCalculadas.horas_vuelo_minutos)} · Tierra: {formatearMinutos(pvData.horasCalculadas.horas_tierra_minutos)} · Total: {formatearMinutos(pvData.horasCalculadas.horas_vuelo_minutos + pvData.horasCalculadas.horas_tierra_minutos)}
                </p>
                {!pvData.tramosCompletos && (
                  <p className="text-[11px] text-blue-700 mt-0.5">Todavía faltan tramos por completar</p>
                )}
              </div>

              {pvError && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">{pvError}</div>
              )}

              {pvData.postVuelo && !pvEditandoCierre && (
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
                  <div className="flex gap-2 mt-1">
                    {pvData.puedeEditar && (
                      <button
                        onClick={() => setPvEditandoCierre(true)}
                        className="text-xs text-blue-600 border border-blue-200 rounded-md px-3 py-1.5 font-medium hover:bg-blue-50 transition-colors"
                      >
                        Editar cierre
                      </button>
                    )}
                    {pvData.puedeEliminarPostVuelo && (
                      <button
                        onClick={handleEliminarPostVuelo}
                        disabled={pvEliminando}
                        className="text-xs text-red-600 border border-red-200 rounded-md px-3 py-1.5 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {pvEliminando ? "..." : "Eliminar post-vuelo"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!pvData.postVuelo && !pvEditandoCierre && pvData.tramosCompletos && pvData.puedeCargar && (
                <button
                  onClick={() => setPvEditandoCierre(true)}
                  className="text-xs text-teal-700 border border-teal-200 rounded-md px-3 py-1.5 font-medium hover:bg-teal-50 transition-colors"
                >
                  Completar cierre del post-vuelo
                </button>
              )}

              {!pvData.postVuelo && !pvData.tramosCompletos && (
                <p className="text-xs text-gray-400">Completá la hora real de todos los tramos para poder cerrar el post-vuelo.</p>
              )}

              {pvEditandoCierre && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-0.5">Destino real</label>
                    <input type="text" value={pvDestino} onChange={(ev) => setPvDestino(ev.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">Aterrizajes</label>
                      <input type="number" min="0" value={pvAterrizajes} onChange={(ev) => setPvAterrizajes(ev.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">Combustible (L)</label>
                      <input type="number" min="0" step="0.01" value={pvCombustible} onChange={(ev) => setPvCombustible(ev.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">Pasajeros</label>
                      <input type="number" min="0" value={pvPasajeros} onChange={(ev) => setPvPasajeros(ev.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">Novedad</label>
                      <select value={pvNovedad} onChange={(ev) => setPvNovedad(ev.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs">
                        {NOVEDADES.map((n) => <option key={n} value={n}>{ETIQUETAS_NOVEDAD[n]}</option>)}
                      </select>
                    </div>
                    {pvNovedad !== "SIN_NOVEDAD" && (
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-0.5">Detalle</label>
                        <input type="text" value={pvDetalleNovedad} onChange={(ev) => setPvDetalleNovedad(ev.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-0.5">Observaciones (opcional)</label>
                    <textarea value={pvObservaciones} onChange={(ev) => setPvObservaciones(ev.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleGuardarCierre} disabled={pvGuardando} className="bg-teal-700 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-teal-800 transition-colors disabled:opacity-50">
                      {pvGuardando ? "..." : "Guardar post-vuelo"}
                    </button>
                    <button onClick={() => setPvEditandoCierre(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}