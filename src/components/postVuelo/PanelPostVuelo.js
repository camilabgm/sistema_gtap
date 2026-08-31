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
import PanelAuditoria from "@/components/shared/PanelAuditoria"

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

  const [pvCombustibleInput, setPvCombustibleInput] = useState("")
  const [pvGuardandoCombustible, setPvGuardandoCombustible] = useState(false)
  const [pvErrorCombustible, setPvErrorCombustible] = useState(null)

  const [tramoValores, setTramoValores] = useState({})
  const [tramoGuardando, setTramoGuardando] = useState(null)

  const [pvDestino, setPvDestino] = useState("")
  const [pvCombustible, setPvCombustible] = useState("")
  const [pvPasajeros, setPvPasajeros] = useState("")
  const [pvCargaKg, setPvCargaKg] = useState("")
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
        // Si ya existe post-vuelo, usa lo que ya se cargó. Si es la
        // primera vez, sugiere lo que ya está en el Manifiesto de esta
        // escala — sigue siendo editable, es solo un punto de partida.
        setPvPasajeros(data.postVuelo?.pasajeros ?? data.defaults?.pasajeros_sugeridos ?? "")
        setPvCargaKg(data.postVuelo?.carga_kg ?? data.defaults?.carga_kg_sugerida ?? "")
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
    const mensaje = pvData?.postVuelo
        ? "Este post-vuelo ya está cerrado. ¿Confirmás que querés guardar este tramo? Los valores ya cargados se van a sobrescribir."
        : "¿Confirmás que querés guardar este tramo con estos valores?"
      if (!window.confirm(mensaje)) return
      
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
        pasajeros: pvPasajeros === "" ? null : Number(pvPasajeros),
        carga_kg: pvCargaKg === "" ? null : Number(pvCargaKg),
        aterrizajes: Number(pvAterrizajes),
        novedad: pvNovedad,
        detalle_novedad: pvNovedad !== "SIN_NOVEDAD" ? pvDetalleNovedad.trim() : undefined,
        observaciones: pvObservaciones.trim() || undefined,
      }
      // combustible_consumido NO se manda desde acá — se carga aparte,
      // por Jefe de Combustible o Supervisor de Semana, una sola vez
      // cada uno (ver el bloque de combustible más abajo en pantalla).

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

  async function handleGuardarCombustible() {
    setPvErrorCombustible(null)

    const litros = Number(pvCombustibleInput)
    if (pvCombustibleInput === "" || isNaN(litros) || litros < 0) {
      setPvErrorCombustible("Ingresá un número válido")
      return
    }

    setPvGuardandoCombustible(true)
    try {
      const res = await fetch(`/api/escalas/${e.id}/post-vuelo/combustible`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combustible_consumido: litros }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar el combustible")

      setPvCombustibleInput("")
      onActualizada?.()
      cargarPostVuelo()
    } catch (err) {
      setPvErrorCombustible(err.message)
    } finally {
      setPvGuardandoCombustible(false)
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

            {pvData.puedeEditarTramos && (
              pvData.postVuelo ? (
                <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Este post-vuelo ya está cerrado — lo que guardes acá va a sobrescribir los valores ya cargados.
                </div>
              ) : (
                <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Podés cargar la hora real de los tramos las veces que haga falta hasta cerrar el post-vuelo —
                  después del cierre, ya no vas a poder editarlos vos mismo.
                </div>
              )
            )}

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
                {pvData.postVuelo.combustible_consumido != null
                  ? ` · Combustible: ${pvData.postVuelo.combustible_consumido} L`
                  : " · Combustible: pendiente de cargar"}
                {pvData.postVuelo.pasajeros != null && ` · Pasajeros: ${pvData.postVuelo.pasajeros}`}
                {pvData.postVuelo.carga_kg != null && ` · Carga: ${pvData.postVuelo.carga_kg} kg`}
              </p>
              {pvData.postVuelo.novedad !== "SIN_NOVEDAD" && (
                <p className="text-sm text-red-600">
                  {ETIQUETAS_NOVEDAD[pvData.postVuelo.novedad]}: {pvData.postVuelo.detalle_novedad}
                </p>
              )}
              {pvData.postVuelo.observaciones && (
                <p className="text-sm text-gray-500">Obs.: {pvData.postVuelo.observaciones}</p>
              )}

              {/* Combustible — Jefe de Combustible o Supervisor de
                  Semana lo cargan acá, una sola vez cada uno; matriz
                  puede corregirlo siempre. Endpoint aparte del cierre
                  general — ver PATCH .../post-vuelo/combustible. */}
              {pvData.puedeEditarCombustible && (
                <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2">
                  <p className="mb-1.5 text-xs font-semibold text-teal-800">
                    {pvData.postVuelo.combustible_consumido != null
                      ? "Corregir combustible consumido (L)"
                      : "Cargar combustible consumido (L)"}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pvCombustibleInput}
                      onChange={(ev) => setPvCombustibleInput(ev.target.value)}
                      placeholder={pvData.postVuelo.combustible_consumido != null ? `Actual: ${pvData.postVuelo.combustible_consumido}` : "Litros"}
                      className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={handleGuardarCombustible}
                      disabled={pvGuardandoCombustible}
                      className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {pvGuardandoCombustible ? "…" : "Guardar"}
                    </button>
                  </div>
                  {pvErrorCombustible && (
                    <p className="mt-1 text-xs text-red-600">{pvErrorCombustible}</p>
                  )}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                {pvData.puedeEditar && (
                  <button
                    onClick={() => setPvEditandoCierre(true)}
                    className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    Editar datos del Post-Vuelo
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

              {/* Auditoría — al final de todo, con su propio separador,
                  mismo patrón que Manifiesto: sin borde extra, el
                  separador azul ya alcanza solo. */}
              <SeparadorSeccion texto="Auditoría" />
              <PanelAuditoria
                items={[
                  { etiqueta: "Post-vuelo cargado por", nombre: pvData.postVuelo.creado_por_nombre, fecha: pvData.postVuelo.created_at },
                  { etiqueta: "Post-vuelo editado por", nombre: pvData.postVuelo.editado_por_nombre, fecha: pvData.postVuelo.updated_at },
                ]}
              />
            </div>
          )}

          {!pvData.postVuelo && !pvEditandoCierre && pvData.tramosCompletos && pvData.puedeCargar && (
            <button
              onClick={() => setPvEditandoCierre(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Completar cierre del post-vuelo (una sola vez)
            </button>
          )}

          {!pvData.postVuelo && !pvData.tramosCompletos && (
            <p className="text-xs text-gray-400">Completá la hora real de todos los tramos para poder cerrar el post-vuelo.</p>
          )}

          {/* Cierre — formulario */}
          {pvEditandoCierre && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              {pvData.postVuelo && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Estás editando un post-vuelo ya cerrado — al guardar, los valores actuales se van a sobrescribir.
                </div>
              )}
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
                  <label className="mb-0.5 block text-[11px] text-gray-500">
                    Pasajeros {!pvData.postVuelo && <span className="text-teal-600">(según Manifiesto)</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pvPasajeros}
                    onChange={(ev) => setPvPasajeros(ev.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] text-gray-500">
                    Carga (kg) {!pvData.postVuelo && <span className="text-teal-600">(según Manifiesto)</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pvCargaKg}
                    onChange={(ev) => setPvCargaKg(ev.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              {/* El campo de combustible ya NO va acá — lo cargan Jefe
                  de Combustible o Supervisor de Semana, aparte, con su
                  propio candado de una sola vez (ver bloque de abajo). */}

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