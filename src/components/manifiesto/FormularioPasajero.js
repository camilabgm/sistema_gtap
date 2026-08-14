// Formulario inline para agregar o editar un pasajero. Si recibe la
// prop `pasajero`, edita (PUT); si no, crea (POST). Misma validación
// que el servidor, para dar feedback antes de mandar la request.

import { useState } from "react"
import { validarPasajero } from "@/lib/manifiesto"

const CAMPOS_VACIOS = { nro_documento: "", nombre: "", apellido: "", nacionalidad: "" }

export default function FormularioPasajero({ escalaId, pasajero, onCancelar, onGuardado }) {
  const [datos, setDatos] = useState(pasajero ? { ...pasajero } : CAMPOS_VACIOS)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  function actualizarCampo(campo, valor) {
    setDatos((d) => ({ ...d, [campo]: valor }))
  }

  async function guardar() {
    const resultado = validarPasajero(datos)
    if (resultado.error) {
      setError(resultado.error)
      return
    }

    setGuardando(true)
    setError(null)
    try {
      const url = pasajero
        ? `/api/manifiesto/pasajeros/${pasajero.id}`
        : `/api/manifiesto/${escalaId}/pasajeros`
      const res = await fetch(url, {
        method: pasajero ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado.valor),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el pasajero")
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
    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50/50 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          placeholder="Nro. documento"
          value={datos.nro_documento}
          onChange={(e) => actualizarCampo("nro_documento", e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Nombre"
          value={datos.nombre}
          onChange={(e) => actualizarCampo("nombre", e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Apellido"
          value={datos.apellido}
          onChange={(e) => actualizarCampo("apellido", e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Nacionalidad"
          value={datos.nacionalidad}
          onChange={(e) => actualizarCampo("nacionalidad", e.target.value)}
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
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  )
}