"use client"

import { useState, useEffect } from "react"
import { validarContrasena } from "@/lib/validarContrasena"

export default function UsuarioModal({ persona, onGuardado, onCerrar }) {

  const modoEdicion = !!persona.usuario

  const [roles, setRoles] = useState([])
  const [form, setForm]   = useState({
    username: persona.usuario?.username || persona.nro_documento || "",
    password: "",
    rol_id:   persona.usuario?.rol_id   || "",
  })

  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState("")

  useEffect(() => {
    async function cargarRoles() {
      const res  = await fetch("/api/roles")
      const data = await res.json()
      setRoles(data.filter((r) => r.nombre !== "Comandante"))
    }
    cargarRoles()
  }, [])

  useEffect(() => {
    const manejarTecla = (e) => { if (e.key === "Escape") onCerrar() }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [])

  async function handleGuardar() {
    if (cargando) return
    setCargando(true)
    setError("")

    // Validar contraseña: obligatoria en creación, opcional en edición
    if (!modoEdicion && !form.password) {
      setError("La contraseña es obligatoria")
      setCargando(false)
      return
    }

    if (form.password) {
      const { valida, errores } = validarContrasena(form.password)
      if (!valida) {
        setError(errores.join(". ") + ".")
        setCargando(false)
        return
      }
    }

    let respuesta

    if (modoEdicion) {
      respuesta = await fetch(`/api/usuarios/${persona.usuario.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      })
    } else {
      respuesta = await fetch("/api/usuarios", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, persona_id: persona.id }),
      })
    }

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
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {modoEdicion ? "Editar acceso" : "Dar acceso al sistema"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {persona.grado} {persona.apellido}, {persona.nombre}
            </p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="px-6 py-4 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de CI <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Número de CI"
              disabled={modoEdicion}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {modoEdicion && (
              <p className="text-xs text-gray-400 mt-1">El número de CI no se puede cambiar</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {modoEdicion ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              {!modoEdicion && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={modoEdicion ? "••••••••" : "Mínimo 10 caracteres"}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              value={form.rol_id}
              onChange={(e) => setForm({ ...form, rol_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar rol...</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Dar acceso"}
          </button>
        </div>

      </div>
    </div>
  )
}