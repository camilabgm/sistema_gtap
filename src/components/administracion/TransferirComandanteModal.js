"use client"

import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"

const PASOS = { SELECCION: "SELECCION", CONFIRMACION: "CONFIRMACION" }

export default function TransferirComandanteModal({ onCerrar }) {
  const [paso, setPaso]               = useState(PASOS.SELECCION)
  const [usuarios, setUsuarios]       = useState([])
  const [roles, setRoles]             = useState([])
  const [usuarioId, setUsuarioId]     = useState("")
  const [rolSalienteId, setRolSalienteId] = useState("")
  const [transfiriendo, setTransfiriendo] = useState(false)
  const [error, setError]             = useState("")

  useEffect(() => {
    async function cargar() {
      const [resUsuarios, resRoles] = await Promise.all([
        fetch("/api/usuarios"),
        fetch("/api/roles"),
      ])
      const dataUsuarios = await resUsuarios.json()
      const dataRoles    = await resRoles.json()
      // Solo usuarios que NO son el Comandante actual
      setUsuarios(dataUsuarios.filter((u) => u.rol?.nombre !== "Comandante"))
      // Roles disponibles para el saliente, excepto Comandante
      setRoles(dataRoles.filter((r) => r.nombre !== "Comandante"))
    }
    cargar()
  }, [])

  const usuarioSeleccionado = usuarios.find((u) => u.id === parseInt(usuarioId))
  const rolSaliente         = roles.find((r) => r.id === parseInt(rolSalienteId))

  function handleSiguiente() {
    if (!usuarioId || !rolSalienteId) {
      setError("Completá todos los campos antes de continuar.")
      return
    }
    setError("")
    setPaso(PASOS.CONFIRMACION)
  }

  async function handleConfirmar() {
    setTransfiriendo(true)
    setError("")

    try {
      const res = await fetch("/api/usuarios/transferir-comandante", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          nuevo_comandante_id: parseInt(usuarioId),
          rol_saliente_id:     parseInt(rolSalienteId),
        }),
      })

      if (res.ok) {
        // Cerramos sesión del Comandante saliente automáticamente
        await signOut({ callbackUrl: "/login" })
      } else {
        const datos = await res.json()
        setError(datos.error || "Error al realizar la transferencia.")
        setTransfiriendo(false)
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.")
      setTransfiriendo(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transferir cargo de Comandante
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {paso === PASOS.SELECCION ? "Paso 1 de 2 — Selección" : "Paso 2 de 2 — Confirmación"}
            </p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-5">

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* PASO 1 — Selección */}
          {paso === PASOS.SELECCION && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                ⚠️ Esta acción transferirá el cargo de Comandante a otro usuario.
                Una vez confirmada, perderá el acceso administrativo al sistema.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo Comandante <span className="text-red-500">*</span>
                </label>
                <select
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar usuario...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.persona?.grado} {u.persona?.apellido}, {u.persona?.nombre} — {u.rol?.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Su nuevo rol al transferir <span className="text-red-500">*</span>
                </label>
                <select
                  value={rolSalienteId}
                  onChange={(e) => setRolSalienteId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Rol que recibirá usted después de la transferencia.
                </p>
              </div>
            </div>
          )}

          {/* PASO 2 — Confirmación */}
          {paso === PASOS.CONFIRMACION && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <p className="font-semibold mb-2">⚠️ Está por realizar una acción irreversible</p>
                <p>
                  Está transfiriendo el cargo de <strong>Comandante</strong> a{" "}
                  <strong>
                    {usuarioSeleccionado?.persona?.grado}{" "}
                    {usuarioSeleccionado?.persona?.apellido},{" "}
                    {usuarioSeleccionado?.persona?.nombre}
                  </strong>.
                </p>
                <p className="mt-2">
                  Su cuenta pasará al rol de <strong>{rolSaliente?.nombre}</strong> y
                  perderá el acceso administrativo de forma inmediata.
                </p>
                <p className="mt-2">
                  Esta acción <strong>no se puede deshacer</strong> desde su cuenta.
                </p>
              </div>

              <p className="text-sm text-gray-600 text-center">
                ¿Confirma que desea realizar esta transferencia?
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          {paso === PASOS.SELECCION ? (
            <>
              <button
                onClick={onCerrar}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSiguiente}
                className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Siguiente →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setPaso(PASOS.SELECCION)}
                disabled={transfiriendo}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ← Volver
              </button>
              <button
                onClick={handleConfirmar}
                disabled={transfiriendo}
                className="px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {transfiriendo ? "Transfiriendo..." : "Confirmar transferencia"}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}