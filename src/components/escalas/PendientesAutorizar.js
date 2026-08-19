"use client"

import { useState, useEffect } from "react"
import { yaPasoLaHora } from "@/lib/escalas"
import { formatearFechaHora as formatearFechaHoraBase } from "@/lib/fechaHora"

// Formato corto (día/mes/hora/minuto, sin año ni segundos) — el que ya
// usaba esta pantalla. En vez de duplicar la función acá, se envuelve
// la compartida de fechaHora.js con las opciones que la achican.
function formatearFechaHora(iso) {
  return formatearFechaHoraBase(iso, { year: undefined, second: undefined })
}

const ETIQUETAS_MOTIVO_DERIVACION = {
  TAREA_ADMINISTRATIVA: "Tarea administrativa",
  FUERA_DE_LA_UNIDAD: "Fuera de la unidad",
  OTRO: "Otro",
}

// Título del cargo, aclarando si quien lo ocupa ahora es el titular o
// el adjunto — orden 2 = adjunto, cualquier otro valor (1, o ausente en
// datos viejos) se muestra como titular sin aclaración.
function etiquetaAutorizante(rolAutorizador, orden) {
  if (!rolAutorizador) return null
  const base = rolAutorizador.replace(/_/g, " ")
  return orden === 2 ? `Adjunto de ${base}` : base
}

// Por qué la responsabilidad de autorizar llegó hasta el cargo/persona
// activa, en vez de quedarse en el titular de base (Jefe de
// Operaciones). INICIAL no tiene texto — significa que nadie fue
// salteado, no hay nada que explicar.
const ETIQUETAS_MOTIVO_ESCALAMIENTO = {
  EN_VUELO: "estaba de vuelo",
  PARTE_DIARIO: "tenía una novedad en el Parte Diario",
  DERIVACION_MANUAL: "había derivado su autorización",
  ROL_DESACTUALIZADO: "su Rol ya no corresponde a este cargo",
  CUENTA_INACTIVA: "tiene la cuenta desactivada",
  SIN_ASIGNAR: "no tiene a nadie asignado en este cargo",
  REAUTORIZACION: "la escala volvió a autorización después de editarse",
}

function textoMotivoEscalamiento(motivo) {
  if (!motivo || motivo === "INICIAL") return null
  const descripcion = ETIQUETAS_MOTIVO_ESCALAMIENTO[motivo]
  return descripcion
    ? `Se saltó al responsable de base porque ${descripcion}.`
    : null
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
  const [errorAccion, setErrorAccion] = useState(null)

  const [asumiendo, setAsumiendo] = useState(false)
  const [errorAsumir, setErrorAsumir] = useState(null)

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

  async function handleAsumir() {
    const nombreBloqueado = pendientes?.autorizanteActivo?.nombre || "el autorizante activo"
    const confirmar = window.confirm(
      `Vas a asumir la autorización en lugar de ${nombreBloqueado}. Esto queda registrado como una derivación a su nombre. ¿Confirmás?`
    )
    if (!confirmar) return

    setErrorAsumir(null)
    setAsumiendo(true)
    try {
      const res = await fetch("/api/autorizadores/asumir", { method: "PUT", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al asumir la autorización")
      await cargarPendientes()
    } catch (err) {
      setErrorAsumir(err.message)
    } finally {
      setAsumiendo(false)
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
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Tenés {pendientes.escalas.length} escala{pendientes.escalas.length !== 1 && "s"} para autorizar
                    {pendientes.autorizanteActivo &&
                      ` (como ${etiquetaAutorizante(pendientes.autorizanteActivo.rol_autorizador, pendientes.autorizanteActivo.orden)})`}.
                  </p>
                  {textoMotivoEscalamiento(pendientes.autorizanteActivo?.motivo_escalamiento) && (
                    <p className="text-xs text-blue-700 mt-1">
                      {textoMotivoEscalamiento(pendientes.autorizanteActivo.motivo_escalamiento)}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-700">
                    Le corresponde autorizar a{" "}
                    <span className="font-medium">
                      {pendientes.autorizanteActivo?.nombre || "nadie disponible en este momento"}
                    </span>
                    {pendientes.autorizanteActivo &&
                      ` (${etiquetaAutorizante(pendientes.autorizanteActivo.rol_autorizador, pendientes.autorizanteActivo.orden)})`}.
                    {" "}Hay {pendientes.escalas.length} escala{pendientes.escalas.length !== 1 && "s"} esperando.
                  </p>
                  {textoMotivoEscalamiento(pendientes.autorizanteActivo?.motivo_escalamiento) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {textoMotivoEscalamiento(pendientes.autorizanteActivo.motivo_escalamiento)}
                    </p>
                  )}
                  {pendientes.puedeAsumir && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {errorAsumir && (
                        <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
                          {errorAsumir}
                        </div>
                      )}
                      <button
                        onClick={handleAsumir}
                        disabled={asumiendo}
                        className="bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium px-4 py-2 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        {asumiendo ? "Asumiendo..." : "Asumir autorización"}
                      </button>
                      <p className="text-xs text-gray-400 mt-1.5">
                        Sos el siguiente en la cascada. Si {pendientes.autorizanteActivo?.nombre} no puede actuar
                        ahora, podés tomar su lugar — queda registrado como una derivación a su nombre.
                      </p>
                    </div>
                  )}
                </div>
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

                      {pendientes.podesActuar && !vencida && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleAutorizar(e.id)}
                            disabled={accionando === e.id}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {accionando === e.id ? "..." : "Autorizar"}
                          </button>
                        </div>
                      )}
                    </div>
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
          Todavía no hay escalas autorizadas.
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
                <p className="text-xs text-gray-500 mt-1">
                  Autorizada por {e.autorizada_por_nombre} ({etiquetaAutorizante(e.rol_autoriza, e.orden_autorizante)}) el {formatearFechaHora(e.fecha_autorizacion)}
                </p>
              </div>
              <span className="px-2 py-1 text-xs rounded-full font-medium shrink-0 bg-green-100 text-green-700">
                Autorizada
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}