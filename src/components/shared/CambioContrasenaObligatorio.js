"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { validarContrasena } from "@/lib/validarContrasena"

export default function CambioContrasenaObligatorio() {
  const router = useRouter()
  const [form, setForm] = useState({
    password_actual:  "",
    password_nuevo:   "",
    password_confirm: "",
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState("")

  async function handleCambiar() {
    setError("")

    if (form.password_nuevo !== form.password_confirm) {
      setError("Las contraseñas nuevas no coinciden.")
      return
    }

    const { valida, errores } = validarContrasena(form.password_nuevo)
    if (!valida) {
      setError(errores.join(". ") + ".")
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
        router.refresh()
      } else {
        setError(datos.error || "Error al cambiar la contraseña.")
      }
    } catch {
      setError("Error de conexión.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Cambio de contraseña obligatorio
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Es tu primer inicio de sesión. Debés cambiar tu contraseña temporal antes de continuar.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña actual (temporal)
            </label>
            <input
              type="password"
              value={form.password_actual}
              onChange={(e) => setForm({ ...form, password_actual: e.target.value })}
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
              placeholder="Mínimo 10 caracteres"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCambiar}
            disabled={guardando}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {guardando ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  )
}