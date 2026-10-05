"use client"

// src/components/aeronaves/AeronaveDisponibilidadModal.js
//
// Modal chico y dedicado — solo para marcar "Otro" como motivo de no
// disponibilidad. No es un formulario de edición general, por eso no
// vive en AeronavesForm.js. Volver a Disponible no necesita este
// modal — es una acción directa con confirm(), desde la tabla.
//
// CAMBIO (rama fix/responsive-modales): usa la cáscara compartida
// ModalBase (pantalla completa en celular, Esc para cerrar, tocar
// afuera no cierra).

import { useState } from "react"
import ModalBase from "@/components/shared/ModalBase"

export default function AeronaveDisponibilidadModal({ aeronave, onGuardado, onCerrar }) {

  const [motivoOtro, setMotivoOtro] = useState("")
  const [cargando,   setCargando]   = useState(false)
  const [error,      setError]      = useState("")

  async function handleGuardar() {
    if (cargando) return
    if (!motivoOtro.trim()) {
      setError("Describí el motivo")
      return
    }

    setCargando(true)
    setError("")

    const respuesta = await fetch(`/api/aeronaves/${aeronave.id}/disponibilidad`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "NO_DISPONIBLE", motivo_otro: motivoOtro.trim() }),
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
      titulo={`Marcar ${aeronave.matricula} como No disponible`}
      onCerrar={onCerrar}
      ancho="md"
      error={error}
      pie={<>
        <button onClick={onCerrar}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={cargando}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
          {cargando ? "Guardando..." : "Marcar como no disponible"}
        </button>
      </>}
    >
      <p className="text-xs text-gray-400 mb-3">
        Solo para motivos que no tienen que ver con mantenimiento — un incidente o un cambio programado se registran desde SICEM, no acá.
      </p>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Motivo <span className="text-red-500">*</span>
      </label>
      <textarea
        value={motivoOtro}
        onChange={(e) => setMotivoOtro(e.target.value)}
        rows={3}
        placeholder="Ej: prestada a otra institución, trámite administrativo..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </ModalBase>
  )
}