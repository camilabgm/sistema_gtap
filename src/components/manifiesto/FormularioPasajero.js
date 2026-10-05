// src/components/manifiesto/FormularioPasajero.js
//
// Formulario inline para agregar o editar un pasajero. Si recibe la
// prop `pasajero`, edita (PUT); si no, crea (POST). Misma validación
// que el servidor, para dar feedback antes de mandar la request.
//
// Al crear (no al editar), después de guardar el formulario se limpia
// y queda abierto para cargar el siguiente pasajero — pensado para
// carga rápida en campo, varios seguidos. "Cancelar" sigue siendo el
// único botón para cerrarlo.
//
// CAMBIO (rama fix/responsive-maestro-detalle): cada campo tiene su
// etiqueta visible arriba ("Nro. documento", "Nombre"...). Antes solo
// tenían placeholder, y en un panel angosto se veían cuatro cajitas
// con "Nr", "No", "Ap", "Na" cortados, sin forma de saber qué se
// estaba cargando. La grilla es de 1 columna en celular y 2 (dos por
// fila) desde 640px — nunca 4 en una fila, que en el detalle de
// escritorio también quedaba apretado.

import { useState } from "react"
import { validarPasajero } from "@/lib/manifiesto"

const CAMPOS_VACIOS = { nro_documento: "", nombre: "", apellido: "", nacionalidad: "" }

const CLASE_LABEL = "mb-0.5 block text-[11px] text-gray-500"
const CLASE_INPUT = "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"

export default function FormularioPasajero({ escalaId, pasajero, onCancelar, onGuardado }) {
  const esCreacion = !pasajero
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

      // Solo al crear: se limpia y queda abierto para el siguiente. Al
      // editar, onGuardado ya se encarga de cerrar este formulario
      // (ver PanelDetalle.js).
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
    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50/50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={CLASE_LABEL}>Nro. documento</label>
          <input
            placeholder="Ej: 1234567"
            value={datos.nro_documento}
            onChange={(e) => actualizarCampo("nro_documento", e.target.value)}
            className={CLASE_INPUT}
          />
        </div>
        <div>
          <label className={CLASE_LABEL}>Nombre</label>
          <input
            value={datos.nombre}
            onChange={(e) => actualizarCampo("nombre", e.target.value)}
            className={CLASE_INPUT}
          />
        </div>
        <div>
          <label className={CLASE_LABEL}>Apellido</label>
          <input
            value={datos.apellido}
            onChange={(e) => actualizarCampo("apellido", e.target.value)}
            className={CLASE_INPUT}
          />
        </div>
        <div>
          <label className={CLASE_LABEL}>Nacionalidad</label>
          <input
            placeholder="Ej: Paraguaya"
            value={datos.nacionalidad}
            onChange={(e) => actualizarCampo("nacionalidad", e.target.value)}
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
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  )
}