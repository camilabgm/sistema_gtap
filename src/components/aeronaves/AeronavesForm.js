"use client"
// src/components/aeronaves/AeronavesForm.js

import { useState, useEffect } from "react"

export default function AeronavesForm({ aeronave, onGuardado, onCerrar }) {

  const modoEdicion = !!aeronave

  const [form, setForm] = useState({
    matricula:            aeronave?.matricula            || "",
    tipo:                 aeronave?.tipo                 || "",
    fabricante:           aeronave?.fabricante           || "",
    anio_fabricacion:     aeronave?.anio_fabricacion     || "",
    anio_incorporacion:   aeronave?.anio_incorporacion   || "",
    capacidad_pasajeros:  aeronave?.capacidad_pasajeros  || "",
    tipo_combustible:     aeronave?.tipo_combustible     || "",
    velocidad_crucero:    aeronave?.velocidad_crucero    || "",
    estela_turbulencia:   aeronave?.estela_turbulencia   || "",
    color:                aeronave?.color                || "",
    categoria:            aeronave?.categoria            || "PROPIA",
    estado:               aeronave?.estado               || "DISPONIBLE",
    motivo_no_disponible: aeronave?.motivo_no_disponible || "",
    motivo_otro:          aeronave?.motivo_otro          || "",
  })

  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === "Escape") onCerrar()
      if (e.key === "Enter")  handleGuardar()
    }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [form])

  function handleEstadoChange(e) {
    const nuevoEstado = e.target.value
    setForm({
      ...form,
      estado:               nuevoEstado,
      motivo_no_disponible: nuevoEstado === "NO_DISPONIBLE" ? form.motivo_no_disponible : "",
      motivo_otro:          nuevoEstado === "NO_DISPONIBLE" ? form.motivo_otro : "",
    })
  }

  async function handleGuardar() {
    if (cargando) return

    if (modoEdicion && form.estado !== aeronave.estado && form.estado === "NO_DISPONIBLE") {
      const confirmar = window.confirm(
        `¿Confirmás marcar ${form.matricula} como No disponible? La aeronave no podrá ser asignada a escalas.`
      )
      if (!confirmar) return
    }

    setCargando(true)
    setError("")

    const metodo = modoEdicion ? "PUT" : "POST"
    const url    = modoEdicion ? `/api/aeronaves/${aeronave.id}` : "/api/aeronaves"

    const respuesta = await fetch(url, {
      method:  metodo,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {modoEdicion ? "Editar aeronave" : "Nueva aeronave"}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="px-6 py-4 grid grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Matrícula <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.matricula}
              onChange={(e) => setForm({ ...form, matricula: e.target.value.toUpperCase() })}
              placeholder="FAP0254"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo / Modelo <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              placeholder="C-208B Caravan"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fabricante <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.fabricante}
              onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
              placeholder="Cessna"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de combustible <span className="text-red-500">*</span>
            </label>
            <select value={form.tipo_combustible}
              onChange={(e) => setForm({ ...form, tipo_combustible: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              <option value="JET-A1">JET-A1</option>
              <option value="AVGAS">AVGAS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año de fabricación <span className="text-red-500">*</span>
            </label>
            <input type="number" value={form.anio_fabricacion}
              onChange={(e) => setForm({ ...form, anio_fabricacion: e.target.value })}
              placeholder="1990"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año de incorporación a la FAP <span className="text-red-500">*</span>
            </label>
            <input type="number" value={form.anio_incorporacion}
              onChange={(e) => setForm({ ...form, anio_incorporacion: e.target.value })}
              placeholder="2000"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidad de pasajeros <span className="text-red-500">*</span>
            </label>
            <input type="number" value={form.capacidad_pasajeros}
              onChange={(e) => setForm({ ...form, capacidad_pasajeros: e.target.value })}
              placeholder="9"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Velocidad de crucero (nudos)
            </label>
            <input type="number" value={form.velocidad_crucero}
              onChange={(e) => setForm({ ...form, velocidad_crucero: e.target.value })}
              placeholder="175"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estela de turbulencia
            </label>
            <select value={form.estela_turbulencia}
              onChange={(e) => setForm({ ...form, estela_turbulencia: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              <option value="LIGERA">Ligera</option>
              <option value="MEDIA">Media</option>
              <option value="PESADA">Pesada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color / Descripción
            </label>
            <input type="text" value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="Blanco con franja azul"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="PROPIA">Propia</option>
              <option value="INCAUTADA">Incautada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado <span className="text-red-500">*</span>
            </label>
            <select value={form.estado}
              onChange={handleEstadoChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="DISPONIBLE">Disponible</option>
              <option value="NO_DISPONIBLE">No disponible</option>
            </select>
          </div>

          {/* Campos de motivo — solo si estado es NO_DISPONIBLE */}
          {form.estado === "NO_DISPONIBLE" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <select value={form.motivo_no_disponible}
                  onChange={(e) => setForm({ ...form, motivo_no_disponible: e.target.value, motivo_otro: "" })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin especificar</option>
                  <option value="ACCIDENTADA">Accidentada</option>
                  <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              {form.motivo_no_disponible === "OTRO" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Especificar motivo
                  </label>
                  <input type="text" value={form.motivo_otro}
                    onChange={(e) => setForm({ ...form, motivo_otro: e.target.value })}
                    placeholder="Describí el motivo..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </>
          )}

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear aeronave"}
          </button>
        </div>

      </div>
    </div>
  )
}