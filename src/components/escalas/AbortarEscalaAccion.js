"use client"

// Ícono de "Abortar escala" con popover propio — a diferencia de
// AccionIcono (que ejecuta la acción directo al click), Abortar
// necesita que la persona elija un motivo de los 6 códigos antes de
// confirmar, así que el click abre un popover en vez de disparar la
// acción. Mismo endpoint que ya usaba PanelDetalleEscala.js — solo se
// mudó la UI de ahí para acá.
//
// El popover se renderiza con un portal a document.body, mismo motivo
// que AccionIcono: la tabla de Gestión de Escalas tiene overflow-x-auto
// y lo recortaría si viviera adentro.

import { useState, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { Ban } from "lucide-react"
import { ETIQUETAS_MOTIVO_ABORTO, puedeAbortarAhora } from "@/lib/escalas"

const MOTIVOS_ABORTO = Object.keys(ETIQUETAS_MOTIVO_ABORTO)

export default function AbortarEscalaAccion({ escala, onAbortada }) {
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState(null)
  const [motivo, setMotivo] = useState(MOTIVOS_ABORTO[0])
  const [observacion, setObservacion] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const botonRef = useRef(null)

  const habilitado = puedeAbortarAhora(escala)

  useLayoutEffect(() => {
    if (!abierto || !botonRef.current) return
    const rect = botonRef.current.getBoundingClientRect()
    setPosicion({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
  }, [abierto])

  function abrir() {
    setError(null)
    setMotivo(MOTIVOS_ABORTO[0])
    setObservacion("")
    setAbierto(true)
  }

  async function confirmar() {
    setError(null)
    setEnviando(true)
    try {
      const res = await fetch(`/api/escalas/${escala.id}/abortar`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo_abortada: motivo,
          observacion_aborto: observacion.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al abortar la escala")
      setAbierto(false)
      onAbortada?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        ref={botonRef}
        onClick={habilitado ? abrir : undefined}
        disabled={!habilitado}
        title={habilitado ? "Abortar escala" : "No se puede abortar en este estado"}
        aria-label="Abortar escala"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          habilitado ? "text-red-500 hover:text-red-700 hover:bg-red-50" : "cursor-not-allowed text-gray-300"
        }`}
      >
        <Ban className="h-4 w-4" />
      </button>

      {abierto && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />,
          document.body
        )}

      {abierto && posicion && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ position: "fixed", top: posicion.top, right: posicion.right }}
            className="z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          >
            <p className="mb-2 text-xs font-semibold text-gray-700">
              Abortar escala {escala.nro_orden ? `#${escala.nro_orden}` : `#${escala.id}`}
            </p>
            {error && (
              <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>
            )}
            <select
              value={motivo}
              onChange={(ev) => setMotivo(ev.target.value)}
              className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {MOTIVOS_ABORTO.map((m) => (
                <option key={m} value={m}>{ETIQUETAS_MOTIVO_ABORTO[m]}</option>
              ))}
            </select>
            <input
              type="text"
              value={observacion}
              onChange={(ev) => setObservacion(ev.target.value)}
              placeholder="Observación (opcional)"
              className="mb-3 w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2">
              <button
                onClick={confirmar}
                disabled={enviando}
                className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {enviando ? "…" : "Confirmar aborto"}
              </button>
              <button
                onClick={() => setAbierto(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}