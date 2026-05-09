"use client"

import { useState } from "react"

export default function PerfilForm() {
  const [form, setForm] = useState({
    password_actual: "",
    password_nuevo:  "",
    password_confirm: "",
  })

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje]     = useState(null)

  async function handleGuardar() {
    setMensaje(null)

    if (form.password_nuevo !== form.password_confirm) {
      setMensaje({ tipo: "error", texto: "Las contraseñas nuevas no coinciden." })
      return
    }

    if (form.password_nuevo.length < 6) {
      setMensaje({ tipo: "error", texto: "La contraseña nueva debe tener al menos 6 caracteres." })
      return
    }

    setGuardando(true)

    try {
      const res = await fetch("/api/usuarios/cambiar-password", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          password_actual: form.password_actual,
          password_nuevo:  form.password_nuevo,
        }),
      })

      const datos = await res.json()

      if (res.ok) {
        setMensaje({ tipo: "ok", texto: "Contraseña actualizada correctamente." })
        setForm({ password_actual: "", password_nuevo: "", password_confirm: "" })
      } else {
        setMensaje({ tipo: "error", texto: datos.error || "Error al cambiar la contraseña." })
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión. Intentá de nuevo." })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Cambiar contraseña
      </h2>

      {mensaje && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          mensaje.tipo === "ok"
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña actual
          </label>
          <input
            type="password"
            value={form.password_actual}
            onChange={(e) => setForm({ ...form, password_actual: e.target.value })}
            placeholder="••••••••"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña nueva
          </label>
          <input
            type="password"
            value={form.password_nuevo}
            onChange={(e) => setForm({ ...form, password_nuevo: e.target.value })}
            placeholder="Mínimo 6 caracteres"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar contraseña nueva
          </label>
          <input
            type="password"
            value={form.password_confirm}
            onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
            placeholder="Repetí la contraseña nueva"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {guardando ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </div>
    </div>
  )
}