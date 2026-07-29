"use client"
// src/components/personas/HabilitacionesModal.js

import { useState, useEffect } from "react"

// Calcula la fecha de vencimiento según período y año de inicio
function calcularVencimiento(periodo, anio) {
  if (!periodo || !anio) return null
  const a = parseInt(anio)
  if (periodo === "1P") return new Date(`${a}-09-30`)
  if (periodo === "2P") return new Date(`${a + 1}-03-31`)
  return null
}

function formatFecha(fecha) {
  if (!fecha) return "—"
  return new Date(fecha).toLocaleDateString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

function badgeVencimiento(vence) {
  if (!vence) return null
  const hoy  = new Date()
  const dias = Math.ceil((new Date(vence) - hoy) / (1000 * 60 * 60 * 24))
  if (dias < 0)        return { label: "Vencida",  color: "bg-red-100 text-red-700" }
  if (dias <= 30)      return { label: "Por vencer", color: "bg-yellow-100 text-yellow-700" }
  return               { label: "Vigente",  color: "bg-green-100 text-green-700" }
}

export default function HabilitacionesModal({ persona, onCerrar, esAdministrador }) {

  const [habilitaciones,     setHabilitaciones]     = useState([])
  const [cargandoDatos,      setCargandoDatos]       = useState(true)
  const [mostrarFormSemestral, setMostrarFormSemestral] = useState(false)

  // Form para agregar período semestral
  const [nuevoPeriodo,       setNuevoPeriodo]        = useState("")
  const [nuevoAnio,          setNuevoAnio]           = useState("")
  const [nuevaFechaExamen,   setNuevaFechaExamen]    = useState("")
  const [guardandoSemestral, setGuardandoSemestral]  = useState(false)
  const [errorSemestral,     setErrorSemestral]      = useState("")

  // Checkboxes de habilitaciones manuales
  const [anualHabilitada,    setAnualHabilitada]     = useState(persona.hab_anual_habilitada || false)
  const [operacionalHabilitada, setOperacionalHabilitada] = useState(persona.nivel_operacional_habilitado || false)
  const [guardandoCheck,     setGuardandoCheck]      = useState(false)

  useEffect(() => {
    cargarHabilitaciones()
  }, [])

  useEffect(() => {
    const manejarTecla = (e) => { if (e.key === "Escape") onCerrar() }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [])

  async function cargarHabilitaciones() {
    setCargandoDatos(true)
    const res   = await fetch(`/api/habilitaciones-medicas?personaId=${persona.id}`)
    const datos = await res.json()
    setHabilitaciones(datos)
    setCargandoDatos(false)
  }

  async function handleGuardarSemestral() {
    if (!nuevoPeriodo || !nuevoAnio || !nuevaFechaExamen) {
      setErrorSemestral("Completá todos los campos")
      return
    }
    setGuardandoSemestral(true)
    setErrorSemestral("")

    const res = await fetch("/api/habilitaciones-medicas", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        persona_id:    persona.id,
        periodo:       nuevoPeriodo,
        anio:          parseInt(nuevoAnio),
        fecha_examen:  nuevaFechaExamen,
      }),
    })

    const datos = await res.json()

    if (!res.ok) {
      setErrorSemestral(datos.error || "Error al guardar")
      setGuardandoSemestral(false)
      return
    }

    setNuevoPeriodo("")
    setNuevoAnio("")
    setNuevaFechaExamen("")
    setMostrarFormSemestral(false)
    setGuardandoSemestral(false)
    await cargarHabilitaciones()
  }

  async function handleEliminarSemestral(id) {
    if (!window.confirm("¿Eliminar este período del historial?")) return
    await fetch(`/api/habilitaciones-medicas/${id}`, { method: "DELETE" })
    await cargarHabilitaciones()
  }

  async function handleToggleCheck(campo, valor) {
    setGuardandoCheck(true)
    await fetch(`/api/personas/${persona.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ [campo]: valor }),
    })
    setGuardandoCheck(false)
  }

  const vencimientoCalculado = calcularVencimiento(nuevoPeriodo, nuevoAnio)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Control de Habilitaciones</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {persona.grado} {persona.apellido}, {persona.nombre}
            </p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Aviso de solo lectura para quien no es administrador */}
          {!esAdministrador && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500">
                Solo el Jefe de Operaciones y el Comandante pueden cargar períodos o modificar habilitaciones. Podés ver el historial, pero no editarlo.
              </p>
            </div>
          )}

          {/* ── HABILITACIÓN MÉDICA ─────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Habilitación médica
            </h3>

            {/* Semestral */}
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Semestral</p>
                {esAdministrador && !mostrarFormSemestral && (
                  <button
                    onClick={() => setMostrarFormSemestral(true)}
                    className="text-xs text-blue-600 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50 transition-colors"
                  >
                    + Cargar período
                  </button>
                )}
              </div>

              {/* Form para agregar período */}
              {esAdministrador && mostrarFormSemestral && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {errorSemestral && (
                    <p className="text-xs text-red-600 mb-3">{errorSemestral}</p>
                  )}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Período <span className="text-red-500">*</span>
                      </label>
                      <select value={nuevoPeriodo}
                        onChange={(e) => setNuevoPeriodo(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar</option>
                        <option value="1P">1P — abr. a sep.</option>
                        <option value="2P">2P — oct. a mar.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Año <span className="text-red-500">*</span>
                      </label>
                      <input type="number" value={nuevoAnio}
                        onChange={(e) => setNuevoAnio(e.target.value)}
                        placeholder="2026" min={2020} max={2099}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Fecha examen <span className="text-red-500">*</span>
                      </label>
                      <input type="date" value={nuevaFechaExamen}
                        onChange={(e) => setNuevaFechaExamen(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  {vencimientoCalculado && (
                    <p className="text-xs text-blue-600 mb-3">
                      Vencimiento: <strong>{formatFecha(vencimientoCalculado)}</strong>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleGuardarSemestral} disabled={guardandoSemestral}
                      className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {guardandoSemestral ? "Guardando..." : "Guardar período"}
                    </button>
                    <button onClick={() => { setMostrarFormSemestral(false); setErrorSemestral("") }}
                      className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Historial */}
              {cargandoDatos ? (
                <p className="text-xs text-gray-400 py-2">Cargando historial...</p>
              ) : habilitaciones.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Sin períodos registrados.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {habilitaciones.map((h) => {
                    const badge = badgeVencimiento(h.vence)
                    return (
                      <div key={h.id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {h.periodo}/{h.anio}
                          </span>
                          <span className="text-xs text-gray-500">
                            Examen: {formatFecha(h.fecha_examen)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Vence: {formatFecha(h.vence)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {badge && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                              {badge.label}
                            </span>
                          )}
                          {esAdministrador && (
                            <button
                              onClick={() => handleEliminarSemestral(h.id)}
                              className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Anual */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className={`flex items-center gap-3 ${esAdministrador ? "cursor-pointer" : "cursor-not-allowed"}`}>
                <input type="checkbox"
                  checked={anualHabilitada}
                  disabled={guardandoCheck || !esAdministrador}
                  onChange={(e) => {
                  const nuevoValor = e.target.checked
                  const accion = nuevoValor ? "habilitar" : "quitar la habilitación de"
                  const confirmar = window.confirm(
                    `¿Confirmás ${accion} la habilitación médica anual de ${persona.apellido}, ${persona.nombre}?`
                  )
                  if (!confirmar) return
                  setAnualHabilitada(nuevoValor)
                  handleToggleCheck("hab_anual_habilitada", nuevoValor)
                }}
                  className="w-4 h-4 text-blue-600 rounded disabled:opacity-50" />
                <div>
                  <span className="text-sm font-medium text-gray-700">Anual — habilitado por Operaciones</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Operaciones confirma la habilitación médica anual del tripulante.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* ── HABILITACIÓN OPERACIONAL ──────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Habilitación operacional
            </h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <label className={`flex items-center gap-3 ${esAdministrador ? "cursor-pointer" : "cursor-not-allowed"}`}>
                <input type="checkbox"
                  checked={operacionalHabilitada}
                  disabled={guardandoCheck || !esAdministrador}
                  onChange={(e) => {
                  const nuevoValor = e.target.checked
                  const accion = nuevoValor ? "habilitar operacionalmente" : "quitar la habilitación operacional de"
                  const confirmar = window.confirm(
                    `¿Confirmás ${accion} a ${persona.apellido}, ${persona.nombre}?`
                  )
                  if (!confirmar) return
                  setOperacionalHabilitada(nuevoValor)
                  handleToggleCheck("nivel_operacional_habilitado", nuevoValor)
                }}
                  className="w-4 h-4 text-blue-600 rounded disabled:opacity-50" />
                <div>
                  <span className="text-sm font-medium text-gray-700">Habilitado por Operaciones</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    El Jefe de Operaciones confirma que el tripulante está habilitado operacionalmente para volar.
                  </p>
                </div>
              </label>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}