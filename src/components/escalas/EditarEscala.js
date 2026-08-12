"use client"

// src/components/escalas/EditarEscala.js
//
// Pantalla consolidada de edición: sirve tanto para COMPLETAR un
// borrador como para EDITAR una escala ya publicada.

import { useState, useEffect, useRef } from "react"
import { parsearSubtipos } from "@/lib/tiposMision"
import { puedeEditarAhora, motivoNoEditable } from "@/lib/escalas"
import { fechaSoloDiaAInputValue } from "@/lib/fechaSoloDia"
import { fechaUTCAInputParaguay } from "@/lib/fechaHora"

const ROLES_EN_VUELO = ["PILOTO", "COPILOTO", "TECNICO_DE_VUELO"]
const CANALES = ["PDF", "IMAGEN", "WORD", "VERBAL"]

function crearTramoVacio(orden) {
  return { orden, origen: "", destino: "", hora_estimada_salida: "", hora_estimada_llegada: "" }
}

// Misma regla que FormularioEscala.js: la búsqueda de disponibilidad
// necesita al menos una salida Y una llegada cargadas entre todos los
// tramos — no hace falta que sea el mismo tramo.
function tieneVentanaMinima(tramos) {
  return tramos.some((t) => t.hora_estimada_salida) && tramos.some((t) => t.hora_estimada_llegada)
}

export default function EditarEscala({ escalaId }) {
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [escala, setEscala] = useState(null)

  const [tiposMision, setTiposMision] = useState([])

  const [solicitante, setSolicitante] = useState("")
  const [fechaRecepcion, setFechaRecepcion] = useState("")
  const [canal, setCanal] = useState("PDF")
  const archivoNuevoRef = useRef(null)
  const [observaciones, setObservaciones] = useState("")
  const [tipoMisionId, setTipoMisionId] = useState("")
  const [subtipoElegido, setSubtipoElegido] = useState("")
  const [tramos, setTramos] = useState([crearTramoVacio(1)])
  const [aeronaveId, setAeronaveId] = useState("")
  const [tripulacion, setTripulacion] = useState([{ persona_id: "", rol_en_vuelo: "PILOTO" }])
  const [nroOrden, setNroOrden] = useState("")

  const [candidatosAeronaves, setCandidatosAeronaves] = useState([])
  const [candidatosPersonas, setCandidatosPersonas] = useState([])
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState(null)
  const [conflictosGuardar, setConflictosGuardar] = useState([])
  const [errorPublicar, setErrorPublicar] = useState(null)
  const [conflictosPublicar, setConflictosPublicar] = useState([])
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [edicionGuardada, setEdicionGuardada] = useState(false)
  const [escalaPublicada, setEscalaPublicada] = useState(false)

  const cargaInicial = useRef(true)

  const guardadoOkTimeoutRef = useRef(null)
  const redirectTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (guardadoOkTimeoutRef.current) clearTimeout(guardadoOkTimeoutRef.current)
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current)
    }
  }, [])

  async function cargarEscala() {
    setCargando(true)
    setErrorCarga(null)
    try {
      const res = await fetch(`/api/escalas/${escalaId}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al cargar la escala")

      setEscala(data)
      setSolicitante(data.solicitante || "")
      // fecha_recepcion es "solo día" (@db.Date) — usa fechaSoloDiaAInputValue
      // (UTC), NUNCA fechaUTCAInputParaguay (esa es para horas reales).
      setFechaRecepcion(fechaSoloDiaAInputValue(data.solicitudes?.[0]?.fecha_recepcion))
      setCanal(data.solicitudes?.[0]?.canal || "PDF")
      setObservaciones(data.observaciones || "")
      setTipoMisionId(data.tipo_mision_id ? String(data.tipo_mision_id) : "")
      setSubtipoElegido(data.subtipo_elegido || "")
      setAeronaveId(data.aeronave_id ? String(data.aeronave_id) : "")
      setNroOrden(data.nro_orden || "")

      setTramos(
        data.itinerarios.length > 0
          ? data.itinerarios.map((t) => ({
              orden: t.orden,
              origen: t.origen,
              destino: t.destino,
              hora_estimada_salida: fechaUTCAInputParaguay(t.hora_estimada_salida),
              hora_estimada_llegada: fechaUTCAInputParaguay(t.hora_estimada_llegada),
            }))
          : [crearTramoVacio(1)]
      )

      setTripulacion(
        data.tripulacion.length > 0
          ? data.tripulacion.map((t) => ({ persona_id: String(t.persona_id), rol_en_vuelo: t.rol_en_vuelo }))
          : [{ persona_id: "", rol_en_vuelo: "PILOTO" }]
      )
    } catch (err) {
      setErrorCarga(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarEscala()
    fetch("/api/tipos-misiones", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setTiposMision(Array.isArray(data) ? data : []))
  }, [escalaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const tipoSeleccionado = tiposMision.find((t) => String(t.id) === String(tipoMisionId)) || null
  const opcionesSubtipo = tipoSeleccionado?.tiene_subtipo ? parsearSubtipos(tipoSeleccionado.subtipo) : []

  useEffect(() => {
    if (cargaInicial.current) { cargaInicial.current = false; return }
    if (!opcionesSubtipo.includes(subtipoElegido)) setSubtipoElegido("")
  }, [tipoMisionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const ventanaLista = tieneVentanaMinima(tramos)

  async function buscarCandidatos() {
    if (!ventanaLista) return
    setCargandoCandidatos(true)
    try {
      const res = await fetch("/api/escalas/candidatos-disponibles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerarios: tramos, escala_id: Number(escalaId) }),
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
    if (cargando) return
    const temporizador = setTimeout(() => { buscarCandidatos() }, 500)
    return () => clearTimeout(temporizador)
  }, [JSON.stringify(tramos), cargando]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const esBorrador = escala?.es_borrador === true
  const tripulacionCompletaLista = tripulacion.filter((t) => t.persona_id)

  // Igual criterio que FormularioEscala.js: un tramo solo cuenta como
  // completo si tiene los 4 datos. Se usa tanto para decidir si mandar
  // itinerarios en el body, como para saber si ya se puede publicar.
  const itinerarioCompleto =
    tramos.length > 0 && tramos.every((t) => t.origen && t.destino && t.hora_estimada_salida && t.hora_estimada_llegada)

  const datosCompletos =
    !!aeronaveId &&
    !!tipoMisionId &&
    itinerarioCompleto &&
    tripulacionCompletaLista.length > 0

  async function guardarCambios() {
    setErrorGuardar(null)
    setConflictosGuardar([])
    setErrorPublicar(null)
    setConflictosPublicar([])

    if (!fechaRecepcion) {
      setErrorGuardar("La fecha de recepción es obligatoria")
      return
    }

    if (!esBorrador) {
      const confirmar = window.confirm(
        "Esta escala ya fue publicada. Guardar estos cambios la va a mandar de nuevo a autorización completa (vuelve a Pendientes de Autorizar).\n\n¿Confirmás?"
      )
      if (!confirmar) return
    }

    const archivo = archivoNuevoRef.current?.files?.[0]
    const hayArchivoActualOAnterior = !!escala.solicitudes?.[0]?.archivo

    if (canal !== "VERBAL" && !archivo && !hayArchivoActualOAnterior) {
      setErrorGuardar("Debés adjuntar un archivo (salvo canal VERBAL)")
      return
    }

    const formData = new FormData()
    formData.append("solicitante", solicitante)
    formData.append("fecha_recepcion", fechaRecepcion)
    formData.append("canal", canal)
    formData.append("nro_orden", nroOrden || "")
    formData.append("aeronave_id", aeronaveId || "")
    formData.append("tipo_mision_id", tipoMisionId || "")
    formData.append("subtipo_elegido", subtipoElegido || "")
    // El itinerario SOLO se manda si está completo. La fecha del vuelo
    // (Escala.fecha) se recalcula sola en el servidor a partir de este
    // itinerario, no se manda desde acá.
    if (itinerarioCompleto) {
      formData.append("itinerarios", JSON.stringify(tramos))
    }
    formData.append("tripulacion", JSON.stringify(tripulacionCompletaLista))
    formData.append("observaciones", observaciones)
    if (archivo) formData.append("archivo", archivo)

    const url = esBorrador ? `/api/escalas/${escalaId}` : `/api/escalas/${escalaId}/editar`

    setGuardando(true)
    try {
      const res = await fetch(url, { method: "PUT", credentials: "include", body: formData })
      const data = await res.json()
      if (!res.ok) {
        setErrorGuardar(data.error || "Error al guardar")
        setConflictosGuardar(data.detalles || [])
        return
      }

      if (esBorrador) {
        if (!datosCompletos) {
          setGuardadoOk(true)
          guardadoOkTimeoutRef.current = setTimeout(() => setGuardadoOk(false), 3000)
          await cargarEscala()
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
      } else {
        setEdicionGuardada(true)
        redirectTimeoutRef.current = setTimeout(() => {
          window.location.href = "/dashboard/escalas/historial"
        }, 7000)
      }
    } catch (err) {
      setErrorGuardar(err.message)
    } finally {
      setGuardando(false)
      setPublicando(false)
    }
  }

  if (cargando) {
    return <div className="p-8 max-w-3xl mx-auto text-sm text-gray-400">Cargando escala...</div>
  }
  if (errorCarga) {
    return <div className="p-8 max-w-3xl mx-auto text-sm text-red-600">{errorCarga}</div>
  }

  const editable = puedeEditarAhora(escala)
  if (!editable) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-sm font-medium text-amber-800">
            {motivoNoEditable(escala) || "Esta escala ya no se puede editar."}
          </p>
          <a href="/dashboard/escalas/historial" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            Volver al Historial
          </a>
        </div>
      </div>
    )
  }

  if (escalaPublicada) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-green-800">✓ Escala publicada</p>
          <p className="text-sm text-green-700 mt-1">La escala #{escalaId} quedó publicada correctamente.</p>
          <a href="/dashboard/escalas/historial" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
            Volver al Historial
          </a>
        </div>
      </div>
    )
  }

  if (edicionGuardada) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-blue-800">✓ Guardado</p>
          <p className="text-sm text-blue-700 mt-1">
            La escala quedó pendiente de autorización nuevamente. Volviendo al Historial en unos segundos...
          </p>
          <a href="/dashboard/escalas/historial" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
            Volver ahora
          </a>
        </div>
      </div>
    )
  }

  const textoBoton = guardando
    ? "Guardando..."
    : publicando
    ? "Publicando..."
    : esBorrador && datosCompletos
    ? "Guardar y publicar"
    : "Guardar cambios"

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {esBorrador ? "Borrador de Escala" : `Edición de Escala N° ${escala.nro_orden || `#${escalaId}`}`}
        </h1>
        {!esBorrador && (
          <p className="text-sm text-amber-700 mt-1">
            Cualquier cambio que guardés va a mandar esta escala de nuevo a autorización completa.
          </p>
        )}
      </div>

      {esBorrador && !datosCompletos && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Todavía faltan datos para poder publicar esta escala (aeronave, tipo de misión, itinerario completo o tripulación).
        </div>
      )}

      {escala.estado === "RECHAZADA" && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm">
          <p className="font-medium text-red-800">Esta escala fue rechazada anteriormente</p>
          <p className="text-red-700 mt-0.5">Motivo: {escala.motivo_rechazo || "—"}</p>
          <p className="text-red-500 text-xs mt-1">
            Este historial se pierde una vez que guardes la edición — la escala vuelve a estado Programada.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Solicitud</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Solicitante <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de recepción <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fechaRecepcion}
              onChange={(e) => setFechaRecepcion(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canal de solicitud</label>
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CANALES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {escala.solicitudes?.[0]?.id && (
          <p className="text-xs text-gray-500">
            Archivo actual:{" "}
            {escala.solicitudes[0].nombre_archivo_original ? (
              <a
                href={`/api/solicitudes/${escala.solicitudes[0].id}/archivo`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {escala.solicitudes[0].nombre_archivo_original}
              </a>
            ) : "— (sin archivo, canal VERBAL)"}
          </p>
        )}

        {canal !== "VERBAL" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reemplazar archivo <span className="text-gray-400 font-normal">(opcional — dejar vacío para mantener el actual)</span>
            </label>
            <input type="file" ref={archivoNuevoRef} className="w-full text-sm" />
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
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Detalles de la escala</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nro. de orden <span className="text-gray-400 font-normal">(opcional — se puede completar en cualquier momento)</span>
          </label>
          <input
            type="text"
            value={nroOrden}
            onChange={(e) => setNroOrden(e.target.value)}
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
            <option value="">Seleccionar...</option>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Itinerario <span className="text-gray-400 font-normal">(la fecha del vuelo se calcula sola, a partir de la hora de salida)</span>
          </label>
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
              : "Aeronave y tripulación se actualizan solas al cambiar el itinerario."}
          </p>
          <button
            type="button"
            onClick={buscarCandidatos}
            disabled={!ventanaLista || cargandoCandidatos}
            className="text-xs text-blue-700 font-medium hover:underline disabled:opacity-50 disabled:no-underline shrink-0 ml-3"
          >
            🔄 Actualizar disponibilidad
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aeronave</label>
          <select value={aeronaveId} onChange={(e) => setAeronaveId(e.target.value)} disabled={!ventanaLista} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
            <option value="">Seleccionar...</option>
            {candidatosAeronaves.map((a) => <option key={a.id} value={a.id}>{a.matricula}</option>)}
          </select>
          {!ventanaLista && <p className="text-xs text-gray-400 mt-1">Completá la hora de salida y llegada del itinerario para ver disponibilidad.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tripulación</label>
          {!ventanaLista ? (
            <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              Completá la hora de salida y llegada del itinerario para poder elegir tripulación.
            </p>
          ) : (
            <>
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
                        {personasParaFila.length === 0 && (
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
            </>
          )}
        </div>

        {errorGuardar && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            <p>{errorGuardar}</p>
            {conflictosGuardar.length > 0 && (
              <ul className="list-disc list-inside mt-1">{conflictosGuardar.map((d, i) => <li key={i}>{d}</li>)}</ul>
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
            onClick={guardarCambios}
            disabled={guardando || publicando}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {textoBoton}
          </button>
          {guardadoOk && <span className="text-sm text-green-600">✓ Guardado</span>}
        </div>
      </div>
    </div>
  )
}