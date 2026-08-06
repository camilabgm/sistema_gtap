"use client"

import { useState, useEffect } from "react"
import { yaPasoLaHora } from "@/lib/escalas"

const ETIQUETAS_MOTIVO_DERIVACION = {
  TAREA_ADMINISTRATIVA: "Tarea administrativa",
  FUERA_DE_LA_UNIDAD: "Fuera de la unidad",
  OTRO: "Otro",
}

function formatearFechaHora(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

export default function PendientesAutorizar() {
  const [tab, setTab] = useState("PENDIENTES") // "PENDIENTES" | "AUTORIZADAS"

  const [pendientes, setPendientes] = useState(null)
  const [cargandoPendientes, setCargandoPendientes] = useState(true)
  const [avisoRecalculo, setAvisoRecalculo] = useState(null)

  const [autorizadas, setAutorizadas] = useState(null)
  const [cargandoAutorizadas, setCargandoAutorizadas] = useState(false)

  const [derivacion, setDerivacion] = useState(null)
  const [cargandoDerivacion, setCargandoDerivacion] = useState(true)
  const [mostrarFormDerivar, setMostrarFormDerivar] = useState(false)
  const [motivoDerivar, setMotivoDerivar] = useState("TAREA_ADMINISTRATIVA")
  const [detalleDerivar, setDetalleDerivar] = useState("")
  const [enviandoDerivar, setEnviandoDerivar] = useState(false)
  const [errorDerivar, setErrorDerivar] = useState(null)

  const [accionando, setAccionando] = useState(null)
  const [rechazandoId, setRechazandoId] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [errorAccion, setErrorAccion] = useState(null)

  useEffect(() => {
    cargarPendientes()
    cargarDerivacion()
  }, [])

  useEffect(() => {
    if (tab === "AUTORIZADAS" && autorizadas === null) {
      cargarAutorizadas()
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function cargarPendientes() {
    setCargandoPendientes(true)
    try {
      const res = await fetch("/api/escalas/pendientes-autorizar", { credentials: "include" })
      const data = await res.json()
      if (res.ok) setPendientes(data)
    } finally {
      setCargandoPendientes(false)
    }
  }

  async function cargarAutorizadas() {
    setCargandoAutorizadas(true)
    try {
      const res = await fetch("/api/escalas/autorizadas", { credentials: "include" })
      const data = await res.json()
      if (res.ok) setAutorizadas(data)
    } finally {
      setCargandoAutorizadas(false)
    }
  }

  async function cargarDerivacion() {
    setCargandoDerivacion(true)
    try {
      const res = await fetch("/api/autorizadores/derivar", { credentials: "include" })
      const data = await res.json()
      if (res.ok) setDerivacion(data)
    } finally {
      setCargandoDerivacion(false)
    }
  }

  async function handleDerivar() {
    setErrorDerivar(null)
    if (motivoDerivar === "OTRO" && !detalleDerivar.trim()) {
      setErrorDerivar("Indicá el detalle del motivo")
      return
    }
    setEnviandoDerivar(true)
    try {
      const res = await fetch("/api/autorizadores/derivar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoDerivar, motivo_detalle: detalleDerivar.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al derivar")
      setMostrarFormDerivar(false)
      setDetalleDerivar("")
      await cargarDerivacion()
      await cargarPendientes()
    } catch (err) {
      setErrorDerivar(err.message)
    } finally {
      setEnviandoDerivar(false)
    }
  }

  async function handleYaVolvi() {
    setEnviandoDerivar(true)
    try {
      await fetch("/api/autorizadores/derivar", { method: "PATCH", credentials: "include" })
      await cargarDerivacion()
      await cargarPendientes()
    } finally {
      setEnviandoDerivar(false)
    }
  }

  async function ejecutarAccion(url, body) {
    const res = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()

    if (res.status === 403) {
      setAvisoRecalculo("El autorizante activo cambió mientras mirabas esta pantalla. Actualizando la lista...")
      await cargarPendientes()
      setTimeout(() => setAvisoRecalculo(null), 5000)
      return false
    }
    if (!res.ok) {
      setErrorAccion(data.error || "Error al procesar la acción")
      return false
    }
    return true
  }

  async function handleAutorizar(escalaId) {
    setErrorAccion(null)
    setAccionando(escalaId)
    const ok = await ejecutarAccion(`/api/escalas/${escalaId}/autorizar`)
    setAccionando(null)
    if (ok) await cargarPendientes()
  }

  async function handleConfirmarRechazo(escalaId) {
    if (!motivoRechazo.trim()) {
      setErrorAccion("El motivo del rechazo es obligatorio")
      return
    }
    setErrorAccion(null)
    setAccionando(escalaId)
    const ok = await ejecutarAccion(`/api/escalas/${escalaId}/rechazar`, { motivo_rechazo: motivoRechazo.trim() })
    setAccionando(null)
    if (ok) {
      setRechazandoId(null)
      setMotivoRechazo("")
      await cargarPendientes()
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Autorización de Escalas</h1>

      {/* Derivar / Ya volví — acción general, no por escala */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        {cargandoDerivacion ? (
          <p className="text-sm text-gray-400">Cargando estado de derivación...</p>
        ) : derivacion ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Derivaste tu autorización desde las {formatearFechaHora(derivacion.desde)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Motivo: {ETIQUETAS_MOTIVO_DERIVACION[derivacion.motivo] || derivacion.motivo}
                {derivacion.motivo_detalle && ` — ${derivacion.motivo_detalle}`}
              </p>
            </div>
            <button
              onClick={handleYaVolvi}
              disabled={enviandoDerivar}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {enviandoDerivar ? "..." : "Ya volví"}
            </button>
          </div>
        ) : mostrarFormDerivar ? (
          <div className="space-y-3">
            {errorDerivar && (
              <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{errorDerivar}</div>
            )}
            <div className="flex gap-2">
              <select
                value={motivoDerivar}
                onChange={(e) => setMotivoDerivar(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ETIQUETAS_MOTIVO_DERIVACION).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {motivoDerivar === "OTRO" && (
                <input
                  type="text"
                  value={detalleDerivar}
                  onChange={(e) => setDetalleDerivar(e.target.value)}
                  placeholder="Detalle del motivo"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDerivar}
                disabled={enviandoDerivar}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {enviandoDerivar ? "Guardando..." : "Confirmar derivación"}
              </button>
              <button
                onClick={() => { setMostrarFormDerivar(false); setErrorDerivar(null) }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">¿No podés autorizar hoy?</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Vas a derivar tu autorización al siguiente cargo hasta que vuelvas.
              </p>
            </div>
            <button
              onClick={() => setMostrarFormDerivar(true)}
              className="bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium px-4 py-2 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-2 shrink-0"
            >
              <span>⏸</span> Derivar autorización
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-md p-0.5 w-fit mb-4">
        <button
          onClick={() => setTab("PENDIENTES")}
          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
            tab === "PENDIENTES" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setTab("AUTORIZADAS")}
          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
            tab === "AUTORIZADAS" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Autorizadas
        </button>
      </div>

      {avisoRecalculo && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm mb-4">
          {avisoRecalculo}
        </div>
      )}

      {tab === "PENDIENTES" ? (
        cargandoPendientes ? (
          <p className="text-sm text-gray-400">Cargando pendientes...</p>
        ) : !pendientes ? (
          <p className="text-sm text-red-600">Error al cargar.</p>
        ) : (
          <>
            <div
              className={`rounded-lg border p-4 mb-4 ${
                pendientes.podesActuar
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              {pendientes.escalas.length === 0 ? (
                <p className="text-sm text-gray-600">No hay ninguna escala esperando autorización.</p>
              ) : pendientes.podesActuar ? (
                <p className="text-sm font-medium text-blue-800">
                  Tenés {pendientes.escalas.length} escala{pendientes.escalas.length !== 1 && "s"} para autorizar.
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  Le corresponde autorizar a{" "}
                  <span className="font-medium">
                    {pendientes.autorizanteActivo?.nombre || "nadie disponible en este momento"}
                  </span>
                  {pendientes.autorizanteActivo && ` (${pendientes.autorizanteActivo.rol_autorizador.replace(/_/g, " ")})`}.
                  {" "}Hay {pendientes.escalas.length} escala{pendientes.escalas.length !== 1 && "s"} esperando.
                </p>
              )}
            </div>

            {errorAccion && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm mb-4">{errorAccion}</div>
            )}

            <div className="space-y-2">
              {pendientes.escalas.map((e) => {
                const tripulacionTexto = (e.tripulacion || [])
                  .map((t) => `${t.persona.grado} ${t.persona.apellido}`)
                  .join(", ") || "Sin tripulación"
                const fechaSolicitud = e.solicitudes?.[0]?.fecha_recepcion
                // Ya pasó la hora estimada de despegue y nunca se autorizó
                // — el endpoint de autorizar la rechaza igual, así que no
                // tiene sentido mostrar el botón para esta fila puntual.
                const vencida = yaPasoLaHora(e.hora_despegue_estimada)

                return (
                  <div key={e.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {e.aeronave?.matricula || "Sin aeronave"} · {e.solicitante} · {e.tipo_mision?.codigo || "—"}
                            {e.nro_orden && ` · Orden #${e.nro_orden}`}
                          </p>
                          {vencida && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-700 shrink-0">
                              Vencida
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Vuelo: {formatearFechaHora(e.hora_despegue_estimada)} → {formatearFechaHora(e.hora_arribo_estimada)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Tripulación: {tripulacionTexto}</p>
                        {fechaSolicitud && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Solicitud recibida: {formatearFechaHora(fechaSolicitud)}
                          </p>
                        )}
                        {vencida && pendientes.podesActuar && (
                          <p className="text-xs text-rose-600 mt-1">
                            Ya pasó la hora — hay que editarla para reprogramarla antes de poder autorizarla.
                          </p>
                        )}
                      </div>

                      {pendientes.podesActuar && (
                        <div className="flex gap-2 shrink-0">
                          {!vencida && (
                            <button
                              onClick={() => handleAutorizar(e.id)}
                              disabled={accionando === e.id}
                              className="bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {accionando === e.id ? "..." : "Autorizar"}
                            </button>
                          )}
                          <button
                            onClick={() => { setRechazandoId(rechazandoId === e.id ? null : e.id); setMotivoRechazo("") }}
                            className="border border-red-200 text-red-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-50 transition-colors"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>

                    {rechazandoId === e.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <textarea
                          value={motivoRechazo}
                          onChange={(ev) => setMotivoRechazo(ev.target.value)}
                          placeholder="Motivo del rechazo (obligatorio)"
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleConfirmarRechazo(e.id)}
                            disabled={accionando === e.id}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {accionando === e.id ? "..." : "Confirmar rechazo"}
                          </button>
                          <button
                            onClick={() => setRechazandoId(null)}
                            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )
      ) : cargandoAutorizadas ? (
        <p className="text-sm text-gray-400">Cargando historial...</p>
      ) : !autorizadas || autorizadas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          Todavía no hay escalas autorizadas ni rechazadas.
        </div>
      ) : (
        <div className="space-y-2">
          {autorizadas.map((e) => (
            <div key={e.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {e.aeronave?.matricula || "Sin aeronave"} · {e.solicitante} · {e.tipo_mision?.codigo || "—"}
                  {e.nro_orden && ` · Orden #${e.nro_orden}`}
                </p>
                {e.autorizada ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Autorizada por {e.autorizada_por_nombre} ({e.rol_autoriza?.replace(/_/g, " ")}) el {formatearFechaHora(e.fecha_autorizacion)}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mt-1">
                      Rechazada por {e.rechazada_por_nombre} el {formatearFechaHora(e.fecha_rechazo)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Motivo: {e.motivo_rechazo}</p>
                  </>
                )}
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full font-medium shrink-0 ${
                  e.autorizada ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {e.autorizada ? "Autorizada" : "Rechazada"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}