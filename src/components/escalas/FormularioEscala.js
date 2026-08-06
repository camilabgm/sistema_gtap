"use client"

// src/components/escalas/FormularioEscala.js

import { useState, useEffect, useRef } from "react"
import { parsearSubtipos } from "@/lib/tiposMision"

const CANALES = ["PDF", "IMAGEN", "WORD", "VERBAL"]
const ROLES_EN_VUELO = ["PILOTO", "COPILOTO", "TECNICO_DE_VUELO"]

function crearTramoVacio(orden) {
  return { orden, origen: "", destino: "", hora_estimada_salida: "", hora_estimada_llegada: "" }
}

export default function FormularioEscala() {
  const [tiposMision, setTiposMision] = useState([])
  const [cargandoTipos, setCargandoTipos] = useState(true)

  useEffect(() => {
    fetch("/api/tipos-misiones", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setTiposMision(Array.isArray(data) ? data : []))
      .finally(() => setCargandoTipos(false))
  }, [])

  const [solicitante, setSolicitante] = useState("")
  const [fecha, setFecha] = useState("")
  const [canal, setCanal] = useState("PDF")
  const archivoRef = useRef(null)
  const [observaciones, setObservaciones] = useState("")

  const [escalaId, setEscalaId] = useState(null)
  const [guardandoSolicitud, setGuardandoSolicitud] = useState(false)
  const [errorSolicitud, setErrorSolicitud] = useState(null)

  async function guardarSolicitud() {
    setErrorSolicitud(null)
    if (!solicitante.trim()) return setErrorSolicitud("El solicitante es obligatorio")
    if (!fecha) return setErrorSolicitud("La fecha es obligatoria")
    const archivo = archivoRef.current?.files?.[0]
    if (canal !== "VERBAL" && !archivo) {
      return setErrorSolicitud("Debés adjuntar el archivo de la solicitud (salvo canal VERBAL)")
    }

    setGuardandoSolicitud(true)
    try {
      const formData = new FormData()
      formData.append("solicitante", solicitante.trim())
      formData.append("fecha", fecha)
      formData.append("canal", canal)
      if (observaciones.trim()) formData.append("observaciones", observaciones.trim())
      if (archivo) formData.append("archivo", archivo)

      const res = await fetch("/api/escalas", { method: "POST", credentials: "include", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar la solicitud")

      setEscalaId(data.id)
    } catch (err) {
      setErrorSolicitud(err.message)
    } finally {
      setGuardandoSolicitud(false)
    }
  }

  const [tipoMisionId, setTipoMisionId] = useState("")
  const [subtipoElegido, setSubtipoElegido] = useState("")
  const [tramos, setTramos] = useState([crearTramoVacio(1)])
  const [aeronaveId, setAeronaveId] = useState("")
  const [tripulacion, setTripulacion] = useState([{ persona_id: "", rol_en_vuelo: "PILOTO" }])
  const [nroOrden, setNroOrden] = useState("")

  const [candidatosAeronaves, setCandidatosAeronaves] = useState([])
  const [candidatosPersonas, setCandidatosPersonas] = useState([])
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false)

  const [guardandoDetalles, setGuardandoDetalles] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [errorDetalles, setErrorDetalles] = useState(null)
  const [detallesConflicto, setDetallesConflicto] = useState([])
  const [errorPublicar, setErrorPublicar] = useState(null)
  const [conflictosPublicar, setConflictosPublicar] = useState([])
  const [guardadoDetalles, setGuardadoDetalles] = useState(false)
  const [escalaPublicada, setEscalaPublicada] = useState(false)

  const tipoSeleccionado = tiposMision.find((t) => String(t.id) === String(tipoMisionId)) || null
  const opcionesSubtipo = tipoSeleccionado?.tiene_subtipo ? parsearSubtipos(tipoSeleccionado.subtipo) : []

  useEffect(() => {
    if (!opcionesSubtipo.includes(subtipoElegido)) setSubtipoElegido("")
  }, [tipoMisionId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function buscarCandidatos() {
    if (!fecha) return
    setCargandoCandidatos(true)
    try {
      const res = await fetch("/api/escalas/candidatos-disponibles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, itinerarios: tramos, escala_id: escalaId ?? undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setCandidatosAeronaves(data.aeronaves)
        setCandidatosPersonas(data.personas)
      }
    } catch {
      // Si falla el filtro, no bloqueamos el formulario.
    } finally {
      setCargandoCandidatos(false)
    }
  }

  useEffect(() => {
    const temporizador = setTimeout(() => { buscarCandidatos() }, 500)
    return () => clearTimeout(temporizador)
  }, [fecha, JSON.stringify(tramos), escalaId]) // eslint-disable-line react-hooks/exhaustive-deps

  function agregarTramo() {
    setTramos((prev) => [...prev, crearTramoVacio(prev.length + 1)])
  }
  function quitarTramo(index) {
    setTramos((prev) => prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, orden: i + 1 })))
  }
  function actualizarTramo(index, campo, valor) {
    setTramos((prev) => prev.map((t, i) => (i === index ? { ...t, [campo]: valor } : t)))
  }

  function agregarTripulante() {
    setTripulacion((prev) => [...prev, { persona_id: "", rol_en_vuelo: "PILOTO" }])
  }
  function quitarTripulante(index) {
    setTripulacion((prev) => prev.filter((_, i) => i !== index))
  }
  function actualizarTripulante(index, campo, valor) {
    setTripulacion((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t
        const actualizado = { ...t, [campo]: valor }
        if (campo === "rol_en_vuelo") {
          const personaActual = candidatosPersonas.find((p) => String(p.id) === String(t.persona_id))
          if (personaActual && !(personaActual.especialidades || []).includes(valor)) {
            actualizado.persona_id = ""
          }
        }
        return actualizado
      })
    )
  }

  const tripulacionCompletaLista = tripulacion.filter((t) => t.persona_id)

  // Un tramo se considera "completo" solo si tiene los 4 datos. El
  // itinerario en conjunto está completo solo si TODOS sus tramos lo están.
  const itinerarioCompleto =
    tramos.length > 0 && tramos.every((t) => t.origen && t.destino && t.hora_estimada_salida && t.hora_estimada_llegada)

  const datosCompletos =
    !!aeronaveId &&
    !!tipoMisionId &&
    itinerarioCompleto &&
    tripulacionCompletaLista.length > 0

  // Guarda los detalles y, si ya está todo completo, publica en el mismo
  // paso. El itinerario SOLO se manda en el body si está completo — así,
  // el tramo vacío por defecto (o uno a medio llenar) nunca tira abajo
  // el resto del guardado (como el número de orden), que puede
  // completarse en cualquier momento de forma independiente.
  async function guardarYPublicar() {
    setErrorDetalles(null)
    setDetallesConflicto([])
    setErrorPublicar(null)
    setConflictosPublicar([])
    if (!escalaId) return setErrorDetalles("Guardá la solicitud primero (Sección 1)")

    setGuardandoDetalles(true)
    try {
      const formData = new FormData()
      formData.append("aeronave_id", aeronaveId || "")
      formData.append("tipo_mision_id", tipoMisionId || "")
      formData.append("subtipo_elegido", subtipoElegido || "")
      formData.append("nro_orden", nroOrden || "")
      if (itinerarioCompleto) {
        formData.append("itinerarios", JSON.stringify(tramos))
      }
      formData.append("tripulacion", JSON.stringify(tripulacionCompletaLista))
      formData.append("observaciones", observaciones)

      const res = await fetch(`/api/escalas/${escalaId}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorDetalles(data.error || "Error al guardar los detalles")
        setDetallesConflicto(data.detalles || [])
        return
      }

      if (!datosCompletos) {
        setGuardadoDetalles(true)
        setTimeout(() => setGuardadoDetalles(false), 3000)
        return
      }

      // Todo completo: publicar enseguida, sin un paso aparte.
      setPublicando(true)
      const resPub = await fetch(`/api/escalas/${escalaId}/publicar`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const dataPub = await resPub.json()
      if (!resPub.ok) {
        setErrorPublicar(dataPub.error || "Error al publicar")
        setConflictosPublicar(dataPub.detalles || [])
        return
      }
      setEscalaPublicada(true)
    } catch (err) {
      setErrorDetalles(err.message)
    } finally {
      setGuardandoDetalles(false)
      setPublicando(false)
    }
  }

  if (escalaPublicada) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-green-800">✓ Escala publicada</p>
          <p className="text-sm text-green-700 mt-1">La escala #{escalaId} quedó publicada correctamente.</p>
          <a href="/dashboard/escalas" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
            Volver a Escalas
          </a>
        </div>
      </div>
    )
  }

  const textoBoton = guardandoDetalles
    ? "Guardando..."
    : publicando
    ? "Publicando..."
    : datosCompletos
    ? "Guardar y publicar"
    : "Guardar detalles"

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nueva Escala de Vuelo</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Solicitud</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Solicitante <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              disabled={!!escalaId}
              placeholder="Ej: FFMM, Presidencia, ANDE..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={!!escalaId}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canal de solicitud <span className="text-red-500">*</span>
              </label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                disabled={!!escalaId}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                {CANALES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {canal !== "VERBAL" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Archivo de la solicitud <span className="text-red-500">*</span>
              </label>
              <input type="file" ref={archivoRef} disabled={!!escalaId} className="w-full text-sm disabled:opacity-50" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {errorSolicitud && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{errorSolicitud}</div>
          )}

          {!escalaId ? (
            <button
              onClick={guardarSolicitud}
              disabled={guardandoSolicitud}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {guardandoSolicitud ? "Guardando..." : "Guardar solicitud"}
            </button>
          ) : (
            <p className="text-sm text-green-700">✓ Solicitud guardada (escala #{escalaId})</p>
          )}
        </div>
      </div>

      <div className={`bg-white rounded-lg border border-gray-200 p-5 ${!escalaId ? "opacity-50" : ""}`}>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Detalles de la escala</h2>
        {!escalaId && <p className="text-sm text-gray-400 mb-3">Guardá la solicitud para habilitar esta parte.</p>}

        <fieldset disabled={!escalaId} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nro. de orden <span className="text-gray-400 font-normal">(opcional — se puede completar en cualquier momento)</span>
            </label>
            <input
              type="text"
              value={nroOrden}
              onChange={(e) => setNroOrden(e.target.value)}
              placeholder="Se puede completar después si todavía no lo asignaron"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de misión</label>
            <select
              value={tipoMisionId}
              onChange={(e) => setTipoMisionId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{cargandoTipos ? "Cargando..." : "Seleccionar..."}</option>
              {tiposMision.map((t) => <option key={t.id} value={t.id}>{t.codigo} — {t.nombre}</option>)}
            </select>
          </div>

          {opcionesSubtipo.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtipo</label>
              <select
                value={subtipoElegido}
                onChange={(e) => setSubtipoElegido(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {opcionesSubtipo.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Itinerario</label>
            <div className="space-y-2">
              {tramos.map((t, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-end bg-gray-50 p-2 rounded-md">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Origen</label>
                    <input type="text" value={t.origen} onChange={(e) => actualizarTramo(i, "origen", e.target.value)} placeholder="SGAS" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Destino</label>
                    <input type="text" value={t.destino} onChange={(e) => actualizarTramo(i, "destino", e.target.value)} placeholder="SGES" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Salida est.</label>
                    <input type="datetime-local" value={t.hora_estimada_salida} onChange={(e) => actualizarTramo(i, "hora_estimada_salida", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Llegada est.</label>
                    <input type="datetime-local" value={t.hora_estimada_llegada} onChange={(e) => actualizarTramo(i, "hora_estimada_llegada", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                  <button type="button" onClick={() => quitarTramo(i)} disabled={tramos.length === 1} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 pb-2">Quitar</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={agregarTramo} className="mt-2 text-xs text-blue-600 hover:underline font-medium">+ Agregar tramo</button>
          </div>

          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
            <p className="text-xs text-blue-700">
              {cargandoCandidatos
                ? "Actualizando disponibilidad..."
                : "Aeronave y tripulación se actualizan solas al cambiar fecha o itinerario."}
            </p>
            <button
              type="button"
              onClick={buscarCandidatos}
              disabled={!fecha || cargandoCandidatos}
              className="text-xs text-blue-700 font-medium hover:underline disabled:opacity-50 disabled:no-underline shrink-0 ml-3"
            >
              🔄 Actualizar disponibilidad
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aeronave</label>
            <select value={aeronaveId} onChange={(e) => setAeronaveId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              {candidatosAeronaves.map((a) => <option key={a.id} value={a.id}>{a.matricula}</option>)}
            </select>
            {!fecha && <p className="text-xs text-gray-400 mt-1">Completá la fecha para ver disponibilidad.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tripulación</label>
            <div className="space-y-2">
              {tripulacion.map((t, i) => {
                const personasParaFila = candidatosPersonas.filter((p) => (p.especialidades || []).includes(t.rol_en_vuelo))
                return (
                  <div key={i} className="flex gap-2 items-end bg-gray-50 p-2 rounded-md">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs text-gray-500 mb-0.5">Persona</label>
                      <select
                        value={t.persona_id}
                        onChange={(e) => actualizarTripulante(i, "persona_id", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        {personasParaFila.map((p) => (
                          <option key={p.id} value={p.id}>{p.grado} {p.apellido}, {p.nombre}</option>
                        ))}
                      </select>
                      {fecha && personasParaFila.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">Sin candidatos con este rol disponibles</p>
                      )}
                    </div>
                    <div className="w-44 shrink-0">
                      <label className="block text-xs text-gray-500 mb-0.5">Rol</label>
                      <select
                        value={t.rol_en_vuelo}
                        onChange={(e) => actualizarTripulante(i, "rol_en_vuelo", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      >
                        {ROLES_EN_VUELO.map((r) => (
                          <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarTripulante(i)}
                      disabled={tripulacion.length === 1}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 pb-2 shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                )
              })}
            </div>
            <button type="button" onClick={agregarTripulante} className="mt-2 text-xs text-blue-600 hover:underline font-medium">+ Agregar tripulante</button>
          </div>

          {errorDetalles && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              <p>{errorDetalles}</p>
              {detallesConflicto.length > 0 && (
                <ul className="list-disc list-inside mt-1">{detallesConflicto.map((d, i) => <li key={i}>{d}</li>)}</ul>
              )}
            </div>
          )}

          {errorPublicar && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              <p>{errorPublicar}</p>
              {conflictosPublicar.length > 0 && (
                <ul className="list-disc list-inside mt-1">{conflictosPublicar.map((d, i) => <li key={i}>{d}</li>)}</ul>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={guardarYPublicar}
              disabled={guardandoDetalles || publicando}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {textoBoton}
            </button>
            {guardadoDetalles && <span className="text-sm text-green-600">✓ Guardado</span>}
          </div>
        </fieldset>
      </div>
    </div>
  )
}