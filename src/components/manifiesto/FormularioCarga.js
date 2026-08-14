// Formulario inline para agregar o editar un ítem de carga. Mismo
// patrón que FormularioPasajero.

import { useState } from "react"
import { validarCarga } from "@/lib/manifiesto"

const CAMPOS_VACIOS = { tipo: "", descripcion: "", peso: "" }

export default function FormularioCarga({ escalaId, carga, onCancelar, onGuardado }) {
  const [datos, setDatos] = useState(
    carga ? { tipo: carga.tipo, descripcion: carga.descripcion ?? "", peso: carga.peso ?? "" } : CAMPOS_VACIOS
  )
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  function actualizarCampo(campo, valor) {
    setDatos((d) => ({ ...d, [campo]: valor }))
  }

  async function guardar() {
    const resultado = validarCarga(datos)
    if (resultado.error) {
      setError(resultado.error)
      return
    }

    setGuardando(true)
    setError(null)
    try {
      const url = carga ? `/api/manifiesto/cargas/${carga.id}` : `/api/manifiesto/${escalaId}/cargas`
      const res = await fetch(url, {
        method: carga ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado.valor),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "No se pudo guardar la carga")
        return
      }
      onGuardado()
    } catch {
      setError("Error de conexión al guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          placeholder="Tipo (ej. equipaje, correspondencia)"
          value={datos.tipo}
          onChange={(e) => actualizarCampo("tipo", e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Descripción (opcional)"
          value={datos.descripcion}
          onChange={(e) => actualizarCampo("descripcion", e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Peso en kg"
          value={datos.peso}
          onChange={(e) => actualizarCampo("peso", e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onCancelar} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  )
}