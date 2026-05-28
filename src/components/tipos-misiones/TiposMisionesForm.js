"use client"
// src/components/tipos-misiones/TiposMisionesForm.js

import { useState, useEffect } from "react"

const ETIQUETAS_CLASIFICACION = {
  OPERACIONAL: "Operacional",
  TIPO_VUELO:  "Tipo de Vuelo",
  LOGISTICA:   "Logística",
}

export default function TiposMisionesForm({ tipoMision, onGuardado, onCerrar }) {

  const modoEdicion = !!tipoMision

  const [codigo,        setCodigo]        = useState(tipoMision?.codigo        || "")
  const [nombre,        setNombre]        = useState(tipoMision?.nombre        || "")
  const [clasificacion, setClasificacion] = useState(tipoMision?.clasificacion || "")
  const [descripcion,   setDescripcion]   = useState(tipoMision?.descripcion   || "")
  const [tieneSubtipo,  setTieneSubtipo]  = useState(tipoMision?.tiene_subtipo || false)
  const [subtipo,       setSubtipo]       = useState(tipoMision?.subtipo       || "")
  const [cargando,      setCargando]      = useState(false)
  const [error,         setError]         = useState("")

  // Al cambiar de clasificación, si no es TIPO_VUELO limpiamos el subtipo
  useEffect(() => {
    if (clasificacion !== "TIPO_VUELO") {
      setTieneSubtipo(false)
      setSubtipo("")
    }
  }, [clasificacion])

  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === "Escape") onCerrar()
      if (e.key === "Enter")  handleGuardar()
    }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [codigo, nombre, clasificacion, descripcion, tieneSubtipo, subtipo])

  async function handleGuardar() {
    if (cargando) return
    setCargando(true)
    setError("")

    const metodo = modoEdicion ? "PUT" : "POST"
    const url    = modoEdicion
      ? `/api/tipos-misiones/${tipoMision.id}`
      : "/api/tipos-misiones"

    const respuesta = await fetch(url, {
      method:  metodo,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        codigo,
        nombre,
        clasificacion,
        descripcion,
        tiene_subtipo: tieneSubtipo,
        subtipo:       tieneSubtipo ? subtipo : null,
      }),
    })

    const datos = await respuesta.json()

    if (!respuesta.ok) {
      setError(datos.error || "Ocurrió un error inesperado")
      setCargando(false)
      return
    }

    onGuardado()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {modoEdicion ? "Editar Tipo de Misión" : "Nuevo Tipo de Misión"}
          </h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Código */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ej: AME, VMIL, FAP"
            maxLength={10}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Se convierte a mayúsculas automáticamente</p>
        </div>

        {/* Nombre */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Aeromédico"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Clasificación */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Clasificación <span className="text-red-500">*</span>
          </label>
          <select
            value={clasificacion}
            onChange={(e) => setClasificacion(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar clasificación</option>
            <option value="OPERACIONAL">Operacional (VMIL, VAIP, VARA)</option>
            <option value="TIPO_VUELO">Tipo de Vuelo (INS, AME, PRE...)</option>
            <option value="LOGISTICA">Logística (FAP, IPE, ARE)</option>
          </select>
          {clasificacion && (
            <p className="text-xs text-blue-600 mt-1">
              {clasificacion === "OPERACIONAL" && "Define la naturaleza del vuelo: militar, institucional o arrendamiento."}
              {clasificacion === "TIPO_VUELO"  && "Define el propósito específico del vuelo."}
              {clasificacion === "LOGISTICA"   && "Define quién cubre los gastos de la operación."}
            </p>
          )}
        </div>

        {/* Sub-tipo — solo si clasificación es TIPO_VUELO */}
        {clasificacion === "TIPO_VUELO" && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tieneSubtipo}
                onChange={(e) => {
                  setTieneSubtipo(e.target.checked)
                  if (!e.target.checked) setSubtipo("")
                }}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                ¿Este tipo de vuelo tiene sub-tipo?
              </span>
            </label>

            {tieneSubtipo && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub-tipo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subtipo}
                  onChange={(e) => setSubtipo(e.target.value)}
                  placeholder="Ej: Traslado de paciente, Trasplante de órganos"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Describí los sub-tipos posibles separados por comas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Descripción */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción del tipo de misión..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar"}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Presioná <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> para guardar
          o <kbd className="bg-gray-100 px-1 rounded">Esc</kbd> para cancelar
        </p>

      </div>
    </div>
  )
}
