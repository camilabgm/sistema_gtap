"use client"

// src/components/sicem/SicemDatosGeneralesAeronave.js
//
// Recibe permisos y lo respeta de verdad: sin puede_editar, los inputs
// quedan deshabilitados y no se muestra el botón de Guardar.
//
// CAMBIO (rama fix/responsive-maestro-detalle):
//   - Padding de la tarjeta: 16px en celular, 20px desde 640px.
//   - Campos: 1 columna en celular, 2 desde 640px, 3 desde 1024px
//     (antes saltaba de 1 a 3 en 768px).
//   - El checkbox "trackea ciclos y aterrizajes": la aclaración gris
//     "(algunas, como el BE90, no los usan)" baja a su propio renglón
//     en celular, en vez de partirse a la mitad al lado del texto.

import { useState } from "react"

function minutosAHorasYMinutos(totalMinutos) {
  if (totalMinutos === null || totalMinutos === undefined) return { horas: 0, minutos: 0 }
  return { horas: Math.floor(totalMinutos / 60), minutos: totalMinutos % 60 }
}
function horasYMinutosAMinutos(horas, minutos) {
  const h = horas === "" ? 0 : Number(horas)
  const m = minutos === "" ? 0 : Number(minutos)
  return h * 60 + m
}

export default function SicemDatosGeneralesAeronave({ aeronave, onGuardado, permisos }) {

  const puedeEditar = !!permisos?.puede_editar

  const odo = minutosAHorasYMinutos(aeronave.horas_vuelo_totales_minutos)

  const [horasH, setHorasH] = useState(odo.horas)
  const [horasM, setHorasM] = useState(odo.minutos)
  const [trackea, setTrackea] = useState(!!aeronave.trackea_ciclos_aterrizajes)
  const [ciclos, setCiclos] = useState(aeronave.ciclos_acumulados ?? 0)
  const [aterrizajes, setAterrizajes] = useState(aeronave.aterrizajes_acumulados ?? 0)

  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")
  const [guardadoOk, setGuardadoOk] = useState(false)

  async function handleGuardar() {
    if (!puedeEditar) return

    setCargando(true)
    setError("")
    setGuardadoOk(false)

    const body = {
      horas_vuelo_totales_minutos: horasYMinutosAMinutos(horasH, horasM),
      trackea_ciclos_aterrizajes: trackea,
      ciclos_acumulados: Number(ciclos) || 0,
      aterrizajes_acumulados: Number(aterrizajes) || 0,
    }

    const res = await fetch(`/api/sicem/aeronaves/${aeronave.id}/datos-generales`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const datos = await res.json()
    setCargando(false)

    if (!res.ok) {
      setError(datos.error || "Ocurrió un error inesperado")
      return
    }

    setGuardadoOk(true)
    onGuardado?.(datos)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
        Datos generales — {aeronave.matricula}
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        {puedeEditar
          ? "Se carga una sola vez al migrar esta aeronave — las horas de motor y hélice suben solas con cada vuelo cerrado en Post-Vuelo."
          : "Solo lectura — tu rol no tiene permiso para editar SICEM."}
      </p>

      {error && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Horas totales de vuelo</label>
          <div className="flex gap-2">
            <input type="number" min="0" value={horasH} onChange={(e) => setHorasH(e.target.value)}
              disabled={!puedeEditar}
              placeholder="Horas"
              className="w-1/2 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400" />
            <input type="number" min="0" max="59" value={horasM} onChange={(e) => setHorasM(e.target.value)}
              disabled={!puedeEditar}
              placeholder="Min"
              className="w-1/2 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400" />
          </div>
        </div>
        <div className={trackea ? "" : "opacity-40 pointer-events-none"}>
          <label className="block text-xs font-medium text-gray-700 mb-1">Ciclos acumulados</label>
          <input type="number" min="0" value={ciclos} onChange={(e) => setCiclos(e.target.value)}
            disabled={!puedeEditar}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400" />
        </div>
        <div className={trackea ? "" : "opacity-40 pointer-events-none"}>
          <label className="block text-xs font-medium text-gray-700 mb-1">Aterrizajes acumulados</label>
          <input type="number" min="0" value={aterrizajes} onChange={(e) => setAterrizajes(e.target.value)}
            disabled={!puedeEditar}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400" />
        </div>
      </div>

      <label className={`flex items-start gap-2 text-sm text-gray-700 mb-3 ${puedeEditar ? "cursor-pointer" : ""}`}>
        <input
          type="checkbox"
          checked={trackea}
          disabled={!puedeEditar}
          onChange={(e) => setTrackea(e.target.checked)}
          className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
        <span>
          Esta aeronave trackea ciclos y aterrizajes
          <span className="block text-gray-400 font-normal sm:inline sm:ml-1">(algunas, como el BE90, no los usan)</span>
        </span>
      </label>

      {puedeEditar && (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleGuardar} disabled={cargando}
            className="px-3.5 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {cargando ? "Guardando..." : "Guardar datos generales"}
          </button>
          {guardadoOk && <span className="text-xs text-green-600">Guardado</span>}
        </div>
      )}
    </div>
  )
}