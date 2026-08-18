"use client"

// Panel de detalle propio de Post-Vuelo — a diferencia de
// PanelDetalleEscala (compartido con Gestión y Agenda, con abortar y
// acuse), este componente solo existe para reportar el post-vuelo de
// UNA escala puntual, dejando bien claro a cuál pertenece. No toca ni
// depende de PanelDetalleEscala — ningún cambio acá afecta Gestión ni
// Agenda.

import { useState, useEffect, useCallback } from "react"
import { formatearFechaHoraCompacta } from "@/lib/escalas"
import { fechaUTCAInputParaguay } from "@/lib/fechaHora"
import SeparadorSeccion from "@/components/shared/SeparadorSeccion"

const ETIQUETAS_NOVEDAD = {
  SIN_NOVEDAD: "Sin novedad",
  INCIDENTE: "Incidente",
  ACCIDENTE: "Accidente",
}
const NOVEDADES = Object.keys(ETIQUETAS_NOVEDAD)

function formatearMinutos(min) {
  if (min === null || min === undefined) return "—"
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}min`
}

export default function PanelPostVuelo({ escala, onActualizada }) {
  const e = escala
  const primerTramo = e.itinerarios?.[0]
  const ultimoTramo = e.itinerarios?.[e.itinerarios.length - 1]
  const ruta = primerTramo && ultimoTramo ? `${primerTramo.origen} → ${ultimoTramo.destino}` : "Sin itinerario cargado"

  const [pvCargando, setPvCargando] = useState(true)
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
            salida: fechaUTCAInputParaguay(t.hora_real_salida || t.hora_estimada_salida),
            llegada: fechaUTCAInputParaguay(t.hora_real_llegada || t.hora_estimada_llegada),
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
  }, [e.id])

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
      const res = await fetch(`/api/escalas/${e.id}/post-vuelo`, { method: "DELETE", credentials: "include" })
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

  const completado = pvData ? !!pvData.postVuelo : !!e.tiene_post_vuelo

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      {/* Encabezado — a cuál escala pertenece este panel */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatearFechaHoraCompacta(e.hora_despegue_estimada)}</span>
            {completado ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Completada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Por reportar
              </span>
            )}
          </div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {e.aeronave?.matricula || "Sin aeronave"} · {ruta}
          </div>
          {e.nro_orden && <div className="text-xs text-gray-400">Orden #{e.nro_orden}</div>}
        </div>
      </div>

      {/* Datos de la escala */}
      <div className="grid grid-cols-1 gap-3 border-b border-gray-100 py-4 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase text-gray-400">Solicitante</div>
          <div className="text-sm font-medium text-gray-900">{e.solicitante || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-400">Tipo de misión</div>
          <div className="text-sm font-medium text-gray-900">{e.tipo_mision?.codigo || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-400">Tripulación</div>
          <div className="text-sm font-medium text-gray-900">
            {(e.tripulacion || []).length > 0
              ? e.tripulacion.map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", ")
              : "Sin tripulación cargada"}
          </div>
        </div>
      </div>

      {/* A partir de acá: lo que el usuario tiene que completar */}
      <div className="pt-4">
        <SeparadorSeccion texto="Tu reporte de post-vuelo" />
      </div>

      {pvCargando ? (
        <p className="py-4 text-sm text-gray-400">Cargando post-vuelo…</p>
      ) : pvError && !pvData ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pvError}</div>
      ) : !pvData ? null : pvData.escala.itinerarios.length === 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Esta escala no tiene ningún tramo cargado en su itinerario — no se puede reportar el post-vuelo sin al
          menos un tramo. Corregí el itinerario desde Gestión de Escalas → Editar antes de continuar.
        </div>
      ) : (
        <div className="space-y-4 pt-4">
          {/* Tramos — hora real */}
          <div>
            <div className="mb-2 text-xs uppercase text-gray-400">Tramos — hora real</div>
            <div className="space-y-2">
              {pvData.escala.itinerarios.map((t) => (
                <div key={t.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-medium text-gray-700">{t.origen} → {t.destino}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[11px] text-gray-500">Salida real</label>
                      <input
                        type="datetime-local"
                        value={tramoValores[t.id]?.salida ?? ""}
                        onChange={(ev) => actualizarTramoValor(t.id, "salida", ev.target.value)}
                        disabled={!pvData.puedeEditarTramos}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[11px] text-gray-500">Llegada real</label>
                      <input
                        type="datetime-local"
                        value={tramoValores[t.id]?.llegada ?? ""}
                        onChange={(ev) => actualizarTramoValor(t.id, "llegada", ev.target.value)}
                        disabled={!pvData.puedeEditarTramos}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                  {pvData.puedeEditarTramos && (
                    <button
                      onClick={() => guardarTramo(t.id)}
                      disabled={tramoGuardando === t.id}
                      className="mt-2 rounded-md border border-blue-200 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {tramoGuardando === t.id ? "…" : "Guardar tramo"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Horas calculadas */}
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="text-sm font-bold text-blue-900">
              Vuelo: {formatearMinutos(pvData.horasCalculadas.horas_vuelo_minutos)} · Tierra:{" "}
              {formatearMinutos(pvData.horasCalculadas.horas_tierra_minutos)} · Total:{" "}
              {formatearMinutos(pvData.horasCalculadas.horas_vuelo_minutos + pvData.horasCalculadas.horas_tierra_minutos)}
            </p>
            {!pvData.tramosCompletos && (
              <p className="mt-0.5 text-[11px] text-blue-700">Todavía faltan tramos por completar</p>
            )}
          </div>

          {pvError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pvError}</div>
          )}

          {/* Cierre — vista de solo lectura */}
          {pvData.postVuelo && !pvEditandoCierre && (
            <div className="space-y-1 border-t border-gray-100 pt-4">
              <div className="text-xs uppercase text-gray-400">Post-vuelo</div>
              <p className="text-sm text-gray-700">Destino real: {pvData.postVuelo.destino_real}</p>
              <p className="text-sm text-gray-700">
                Aterrizajes: {pvData.postVuelo.aterrizajes}
                {pvData.postVuelo.combustible_consumido != null && ` · Combustible: ${pvData.postVuelo.combustible_consumido} L`}
                {pvData.postVuelo.pasajeros != null && ` · Pasajeros: ${pvData.postVuelo.pasajeros}`}
              </p>
              {pvData.postVuelo.novedad !== "SIN_NOVEDAD" && (
                <p className="text-sm text-red-600">
                  {ETIQUETAS_NOVEDAD[pvData.postVuelo.novedad]}: {pvData.postVuelo.detalle_novedad}
                </p>
              )}
              {pvData.postVuelo.observaciones && (
                <p className="text-sm text-gray-500">Obs.: {pvData.postVuelo.observaciones}</p>
              )}
              <div className="mt-2 flex gap-2">
                {pvData.puedeEditar && (
                  <button
                    onClick={() => setPvEditandoCierre(true)}
                    className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    Editar cierre
                  </button>
                )}
                {pvData.puedeEliminarPostVuelo && (
                  <button
                    onClick={handleEliminarPostVuelo}
                    disabled={pvEliminando}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {pvEliminando ? "…" : "Eliminar post-vuelo"}
                  </button>
                )}
              </div>
            </div>
          )}

          {!pvData.postVuelo && !pvEditandoCierre && pvData.tramosCompletos && pvData.puedeCargar && (
            <button
              onClick={() => setPvEditandoCierre(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Completar cierre del post-vuelo
            </button>
          )}

          {!pvData.postVuelo && !pvData.tramosCompletos && (
            <p className="text-xs text-gray-400">Completá la hora real de todos los tramos para poder cerrar el post-vuelo.</p>
          )}

          {/* Cierre — formulario */}
          {pvEditandoCierre && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label className="mb-0.5 block text-[11px] text-gray-500">Destino real</label>
                <input
                  type="text"
                  value={pvDestino}
                  onChange={(ev) => setPvDestino(ev.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-0.5 block text-[11px] text-gray-500">Aterrizajes</label>
                  <input
                    type="number"
                    min="0"
                    value={pvAterrizajes}
                    onChange={(ev) => setPvAterrizajes(ev.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] text-gray-500">Combustible (L)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pvCombustible}
                    onChange={(ev) => setPvCombustible(ev.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] text-gray-500">Pasajeros</label>
                  <input
                    type="number"
                    min="0"
                    value={pvPasajeros}
                    onChange={(ev) => setPvPasajeros(ev.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[11px] text-gray-500">Novedad</label>
                  <select
                    value={pvNovedad}
                    onChange={(ev) => setPvNovedad(ev.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {NOVEDADES.map((n) => (
                      <option key={n} value={n}>{ETIQUETAS_NOVEDAD[n]}</option>
                    ))}
                  </select>
                </div>
                {pvNovedad !== "SIN_NOVEDAD" && (
                  <div>
                    <label className="mb-0.5 block text-[11px] text-gray-500">Detalle</label>
                    <input
                      type="text"
                      value={pvDetalleNovedad}
                      onChange={(ev) => setPvDetalleNovedad(ev.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-0.5 block text-[11px] text-gray-500">Observaciones (opcional)</label>
                <textarea
                  value={pvObservaciones}
                  onChange={(ev) => setPvObservaciones(ev.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleGuardarCierre}
                  disabled={pvGuardando}
                  className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {pvGuardando ? "…" : "Guardar post-vuelo"}
                </button>
                <button
                  onClick={() => setPvEditandoCierre(false)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
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