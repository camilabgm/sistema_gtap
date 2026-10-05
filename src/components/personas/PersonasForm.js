"use client"
// src/components/personas/PersonasForm.js
//
// CAMBIO (rama fix/responsive-modales):
//   - Usa la cáscara compartida ModalBase — pantalla completa en
//     celular, botones siempre visibles abajo, error arriba de ellos.
//     Esc lo maneja ModalBase.
//   - "Datos institucionales" tenía grid-cols-2 fijo (2 columnas
//     también en celular) → ahora 1 columna en celular y 2 desde
//     640px, igual que "Datos personales".
//   - "Contacto de emergencia" y "Especialidades" tenían col-span-2
//     siempre: en una grilla de 1 columna eso crea una segunda columna
//     fantasma y el formulario se ensancha más que la pantalla — una
//     de las causas de que se viera "gigante". Ahora es sm:col-span-2
//     (ocupan las dos columnas solo cuando hay dos).

import { useState } from "react"
import { fechaSoloDiaAInputValue } from "@/lib/fechaSoloDia"
import ModalBase from "@/components/shared/ModalBase"

const OPCIONES_ESPECIALIDAD = [
  { valor: "PILOTO",           etiqueta: "Piloto" },
  { valor: "COPILOTO",         etiqueta: "Copiloto" },
  { valor: "TECNICO_DE_VUELO", etiqueta: "Técnico de vuelo" },
  { valor: "MECANICO",         etiqueta: "Mecánico" },
  { valor: "ADMINISTRATIVO",   etiqueta: "Administrativo" },
  { valor: "OTRO",             etiqueta: "Otro" },
]

const CLASE_INPUT = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function PersonasForm({ persona, onGuardado, onCerrar }) {

  const modoEdicion = !!persona

  const [form, setForm] = useState({
    nombre:              persona?.nombre              || "",
    apellido:            persona?.apellido            || "",
    grado:               persona?.grado               || "",
    nro_documento:       persona?.nro_documento       || "",
    fecha_nacimiento:    fechaSoloDiaAInputValue(persona?.fecha_nacimiento),
    escuadron:           persona?.escuadron           || "PLANA_MAYOR",
    unidad:              persona?.unidad              || "",
    especialidades:      persona?.especialidades      || [],
    residencia:          persona?.residencia          || "",
    telefono:            persona?.telefono            || "",
    contacto_emergencia: persona?.contacto_emergencia || "",
    nro_pasaporte:       persona?.nro_pasaporte       || "",
  })

  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")

  function toggleEspecialidad(valor) {
    setForm((prev) => {
      const yaEsta = prev.especialidades.includes(valor)
      return {
        ...prev,
        especialidades: yaEsta
          ? prev.especialidades.filter((e) => e !== valor)
          : [...prev.especialidades, valor],
      }
    })
  }

  async function handleGuardar() {
    if (cargando) return
    setCargando(true)
    setError("")

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
    <ModalBase
      titulo={modoEdicion ? "Editar persona" : "Nueva persona"}
      onCerrar={onCerrar}
      ancho="3xl"
      error={error}
      pie={<>
        <button onClick={onCerrar}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={cargando}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
          {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear persona"}
        </button>
      </>}
    >
      <div className="space-y-6">

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Datos personales
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Álvaro"
                className={CLASE_INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                placeholder="López Cattebeke"
                className={CLASE_INPUT} />
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
                  const soloNumeros = e.target.value.replace(/\D/g, "")
                  setForm({ ...form, nro_documento: soloNumeros })
                }}
                placeholder="1234567"
                className={CLASE_INPUT}
              />
              <p className="text-xs text-gray-400 mt-1">Solo números, sin puntos ni guiones</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de nacimiento
              </label>
              <input type="date" value={form.fecha_nacimiento}
                onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                className={CLASE_INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="0981 123 456"
                className={CLASE_INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Residencia</label>
              <input type="text" value={form.residencia}
                onChange={(e) => setForm({ ...form, residencia: e.target.value })}
                placeholder="Luque, Central"
                className={CLASE_INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contacto de emergencia
              </label>
              <input type="text" value={form.contacto_emergencia}
                onChange={(e) => setForm({ ...form, contacto_emergencia: e.target.value })}
                placeholder="María López - 0981 000 000"
                className={CLASE_INPUT} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Datos institucionales
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grado <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.grado}
                onChange={(e) => setForm({ ...form, grado: e.target.value })}
                placeholder="TCNEL DCEM"
                className={CLASE_INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Escuadrón <span className="text-red-500">*</span>
              </label>
              <select value={form.escuadron}
                onChange={(e) => setForm({ ...form, escuadron: e.target.value })}
                className={CLASE_INPUT}>
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
                className={CLASE_INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nro. de pasaporte
              </label>
              <input type="text" value={form.nro_pasaporte}
                onChange={(e) => setForm({ ...form, nro_pasaporte: e.target.value })}
                placeholder="AA123456"
                className={CLASE_INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidades <span className="text-gray-400 font-normal">(puede tener más de una)</span>
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {OPCIONES_ESPECIALIDAD.map((op) => (
                  <label key={op.valor} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.especialidades.includes(op.valor)}
                      onChange={() => toggleEspecialidad(op.valor)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {op.etiqueta}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </ModalBase>
  )
}