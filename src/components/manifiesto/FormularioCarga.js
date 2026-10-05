// src/components/manifiesto/FormularioCarga.js
//
// Formulario inline para agregar o editar un ítem de carga. Mismo
// patrón que FormularioPasajero, incluido el "seguir cargando" al crear.
//
// CAMBIO (rama fix/responsive-maestro-detalle): cada campo tiene su
// etiqueta visible arriba ("Tipo", "Descripción", "Peso (kg)"), igual
// que FormularioPasajero — antes solo tenían placeholder, que se
// cortaba en un panel angosto. 1 columna en celular, 3 desde 640px.

import { useState } from "react"
import { validarCarga } from "@/lib/manifiesto"

const CAMPOS_VACIOS = { tipo: "", descripcion: "", peso: "" }

const CLASE_LABEL = "mb-0.5 block text-[11px] text-gray-500"
const CLASE_INPUT = "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"

export default function FormularioCarga({ escalaId, carga, onCancelar, onGuardado }) {
  const esCreacion = !carga
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

      if (esCreacion) {
        setDatos(CAMPOS_VACIOS)
      }
    } catch {
      setError("Error de conexión al guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className={CLASE_LABEL}>Tipo</label>
          <input
            placeholder="Ej: equipaje, correspondencia"
            value={datos.tipo}
            onChange={(e) => actualizarCampo("tipo", e.target.value)}
            className={CLASE_INPUT}
          />
        </div>
        <div>
          <label className={CLASE_LABEL}>Descripción (opcional)</label>
          <input
            value={datos.descripcion}
            onChange={(e) => actualizarCampo("descripcion", e.target.value)}
            className={CLASE_INPUT}
          />
        </div>
        <div>
          <label className={CLASE_LABEL}>Peso (kg)</label>
          <input
            type="number"
            step="0.01"
            value={datos.peso}
            onChange={(e) => actualizarCampo("peso", e.target.value)}
            className={CLASE_INPUT}
          />
        </div>
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