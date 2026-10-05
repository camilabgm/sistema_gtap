"use client"
// src/components/aeronaves/AeronavesForm.js
//
// CAMBIO (rama fix/responsive-modales): usa la cáscara compartida
// ModalBase — pantalla completa en celular con "Cancelar" y "Guardar"
// siempre visibles abajo, y el error arriba de los botones (antes
// quedaba arriba del formulario, fuera de la vista si la persona
// estaba abajo de todo). Grilla de campos en 1 columna en celular y 2
// desde 640px. Esc lo maneja ModalBase; acá queda solo Enter para
// guardar.

import { useState, useEffect } from "react"
import ModalBase from "@/components/shared/ModalBase"

const CLASE_INPUT = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

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
  })

  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === "Enter") handleGuardar()
    }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [form]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGuardar() {
    if (cargando) return

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
    <ModalBase
      titulo={modoEdicion ? "Editar aeronave" : "Nueva aeronave"}
      onCerrar={onCerrar}
      ancho="2xl"
      error={error}
      pie={<>
        <button onClick={onCerrar}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={cargando}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
          {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear aeronave"}
        </button>
      </>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Matrícula <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.matricula}
            onChange={(e) => setForm({ ...form, matricula: e.target.value.toUpperCase() })}
            placeholder="FAP0254"
            className={CLASE_INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo / Modelo <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            placeholder="C-208B Caravan"
            className={CLASE_INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fabricante <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.fabricante}
            onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
            placeholder="Cessna"
            className={CLASE_INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de combustible <span className="text-red-500">*</span>
          </label>
          <select value={form.tipo_combustible}
            onChange={(e) => setForm({ ...form, tipo_combustible: e.target.value })}
            className={CLASE_INPUT}>
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
            className={CLASE_INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Año de incorporación a la FAP <span className="text-red-500">*</span>
          </label>
          <input type="number" value={form.anio_incorporacion}
            onChange={(e) => setForm({ ...form, anio_incorporacion: e.target.value })}
            placeholder="2000"
            className={CLASE_INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capacidad de pasajeros <span className="text-red-500">*</span>
          </label>
          <input type="number" value={form.capacidad_pasajeros}
            onChange={(e) => setForm({ ...form, capacidad_pasajeros: e.target.value })}
            placeholder="9"
            className={CLASE_INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Velocidad de crucero (nudos)
          </label>
          <input type="number" value={form.velocidad_crucero}
            onChange={(e) => setForm({ ...form, velocidad_crucero: e.target.value })}
            placeholder="175"
            className={CLASE_INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estela de turbulencia
          </label>
          <select value={form.estela_turbulencia}
            onChange={(e) => setForm({ ...form, estela_turbulencia: e.target.value })}
            className={CLASE_INPUT}>
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
            className={CLASE_INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className={CLASE_INPUT}>
            <option value="PROPIA">Propia</option>
            <option value="INCAUTADA">Incautada</option>
          </select>
        </div>

      </div>
    </ModalBase>
  )
}