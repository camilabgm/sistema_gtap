"use client"
// src/components/personas/PersonasForm.js

import { useState, useEffect } from "react"

export default function PersonasForm({ persona, onGuardado, onCerrar }) {

  const modoEdicion = !!persona

  const [form, setForm] = useState({
    nombre:              persona?.nombre              || "",
    apellido:            persona?.apellido            || "",
    grado:               persona?.grado               || "",
    nro_documento:       persona?.nro_documento       || "",
    fecha_nacimiento:    persona?.fecha_nacimiento
      ? new Date(persona.fecha_nacimiento).toISOString().slice(0, 10) : "",
    escuadron:           persona?.escuadron           || "PLANA_MAYOR",
    unidad:              persona?.unidad              || "",
    especialidad:        persona?.especialidad        || "",
    residencia:          persona?.residencia          || "",
    telefono:            persona?.telefono            || "",
    contacto_emergencia: persona?.contacto_emergencia || "",
    nro_pasaporte:       persona?.nro_pasaporte       || "",
  })

  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    const manejarTecla = (e) => { if (e.key === "Escape") onCerrar() }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [])

  async function handleGuardar() {
    if (cargando) return
    setCargando(true)
    setError("")

      // Validación del nro_documento
     // Validación del nro_documento
    if (!form.nro_documento || !/^\d+$/.test(form.nro_documento)) {
      setError("El número de documento debe contener solo números")
      setCargando(false)
      return
    }

    const metodo = modoEdicion ? "PUT" : "POST"
    const url    = modoEdicion ? `/api/personas/${persona.id}` : "/api/personas"

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
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {modoEdicion ? "Editar persona" : "Nueva persona"}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="px-6 py-4 space-y-6">

          {/* ── Datos personales ─────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Datos personales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Álvaro"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.apellido}
                  onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                  placeholder="López Cattebeke"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
         <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Nro. de documento <span className="text-red-500">*</span>
  </label>
  <input 
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    value={form.nro_documento}
    onChange={(e) => {
      // Solo permite ingresar números
      const soloNumeros = e.target.value.replace(/\D/g, "")
      setForm({ ...form, nro_documento: soloNumeros })
    }}
    placeholder="1234567"
    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <p className="text-xs text-gray-400 mt-1">Solo números, sin puntos ni guiones</p>
</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de nacimiento
                </label>
                <input type="date" value={form.fecha_nacimiento}
                  onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="0981 123 456"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Residencia</label>
                <input type="text" value={form.residencia}
                  onChange={(e) => setForm({ ...form, residencia: e.target.value })}
                  placeholder="Luque, Central"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contacto de emergencia
                </label>
                <input type="text" value={form.contacto_emergencia}
                  onChange={(e) => setForm({ ...form, contacto_emergencia: e.target.value })}
                  placeholder="María López - 0981 000 000"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* ── Datos institucionales ─────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Datos institucionales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grado <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.grado}
                  onChange={(e) => setForm({ ...form, grado: e.target.value })}
                  placeholder="TCNEL DCEM"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escuadrón <span className="text-red-500">*</span>
                </label>
                <select value={form.escuadron}
                  onChange={(e) => setForm({ ...form, escuadron: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="ESCUADRON_OPERACIONES_AEREAS">Escuadrón Operaciones Aéreas</option>
                  <option value="ESCUADRON_MANTENIMIENTO">Escuadrón de Mantenimiento</option>
                  <option value="ESCUADRON_BASE">Escuadrón Base</option>
                  <option value="PLANA_MAYOR">Plana Mayor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.unidad}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                  placeholder="Comandancia GTAP"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                <select value={form.especialidad}
                  onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin especialidad</option>
                  <option value="PILOTO">Piloto</option>
                  <option value="COPILOTO">Copiloto</option>
                  <option value="TECNICO_DE_VUELO">Técnico de vuelo</option>
                  <option value="MECANICO">Mecánico</option>
                  <option value="ADMINISTRATIVO">Administrativo</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nro. de pasaporte
                </label>
                <input type="text" value={form.nro_pasaporte}
                  onChange={(e) => setForm({ ...form, nro_pasaporte: e.target.value })}
                  placeholder="AA123456"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear persona"}
          </button>
        </div>
      </div>
    </div>
  )
}
