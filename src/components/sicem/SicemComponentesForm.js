"use client"
import { useState, useEffect } from "react"
import { fechaSoloDiaAInputValue } from "@/lib/fechaSoloDia"

const COMPONENTES_AUTO_ACTUALIZABLES = ["MOTOR", "HELICE"]

// Convierte minutos totales <-> horas y minutos por separado, para que
// el formulario se cargue igual que el Excel de origen (Xh Ymin), en
// vez de pedir minutos totales sueltos.
function minutosAHorasYMinutos(totalMinutos) {
  if (totalMinutos === null || totalMinutos === undefined) return { horas: "", minutos: "" }
  return { horas: Math.floor(totalMinutos / 60), minutos: totalMinutos % 60 }
}
function horasYMinutosAMinutos(horas, minutos) {
  const h = horas === "" ? 0 : Number(horas)
  const m = minutos === "" ? 0 : Number(minutos)
  return h * 60 + m
}

export default function SicemComponentesForm({ componente, aeronaves, onGuardado, onCerrar }) {

  const modoEdicion = !!componente
  const acumuladas = minutosAHorasYMinutos(componente?.horas_acumuladas_minutos ?? 0)
  const umbral = minutosAHorasYMinutos(componente?.umbral_horas_minutos ?? null)

  const [form, setForm] = useState({
    aeronave_id: componente?.aeronave_id ? String(componente.aeronave_id) : "",
    tipo: componente?.tipo || "MOTOR",
    horas_acum_h: acumuladas.horas,
    horas_acum_m: acumuladas.minutos,
    umbral_h: umbral.horas,
    umbral_m: umbral.minutos,
    fecha_proxima_inspeccion: fechaSoloDiaAInputValue(componente?.fecha_proxima_inspeccion),
  })

  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    const manejarTecla = (e) => { if (e.key === "Escape") onCerrar() }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [])

  const esAutoActualizable = COMPONENTES_AUTO_ACTUALIZABLES.includes(form.tipo)

  async function handleGuardar() {
    if (cargando) return
    setCargando(true)
    setError("")

    if (!modoEdicion && !form.aeronave_id) {
      setError("Seleccioná la aeronave")
      setCargando(false)
      return
    }

    const body = {
      aeronave_id: form.aeronave_id ? Number(form.aeronave_id) : undefined,
      tipo: form.tipo,
      horas_acumuladas_minutos: horasYMinutosAMinutos(form.horas_acum_h, form.horas_acum_m),
      umbral_horas_minutos:
        form.umbral_h === "" && form.umbral_m === "" ? null : horasYMinutosAMinutos(form.umbral_h, form.umbral_m),
      fecha_proxima_inspeccion: form.fecha_proxima_inspeccion || null,
    }

    const metodo = modoEdicion ? "PUT" : "POST"
    const url    = modoEdicion ? `/api/sicem/componentes/${componente.id}` : "/api/sicem/componentes"

    const respuesta = await fetch(url, {
      method:  metodo,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {modoEdicion ? "Editar componente" : "Nuevo componente"}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="px-6 py-4 space-y-6">

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Identificación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aeronave <span className="text-red-500">*</span>
                </label>
                <select value={form.aeronave_id}
                  onChange={(e) => setForm({ ...form, aeronave_id: e.target.value })}
                  disabled={modoEdicion}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Seleccionar...</option>
                  {aeronaves.map((a) => (
                    <option key={a.id} value={a.id}>{a.matricula}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de componente <span className="text-red-500">*</span>
                </label>
                <select value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  disabled={modoEdicion}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="MOTOR">Motor</option>
                  <option value="HELICE">Hélice</option>
                  <option value="APU">APU</option>
                </select>
              </div>
            </div>
            {modoEdicion && (
              <p className="text-xs text-gray-400 mt-1.5">La aeronave y el tipo no se pueden cambiar una vez creado — si hace falta, desactivá este y creá uno nuevo.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Horas
            </h3>

            {esAutoActualizable && (
              <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Motor y hélice se actualizan solos al cerrar tramos en Post-Vuelo. Editá las horas acá solo para
                la carga inicial (migrando el Excel) o para corregir un error puntual.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horas acumuladas</label>
                <div className="flex gap-2">
                  <input type="number" min="0" value={form.horas_acum_h}
                    onChange={(e) => setForm({ ...form, horas_acum_h: e.target.value })}
                    placeholder="Horas"
                    className="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" min="0" max="59" value={form.horas_acum_m}
                    onChange={(e) => setForm({ ...form, horas_acum_m: e.target.value })}
                    placeholder="Min"
                    className="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Desde el último cambio/overhaul de este componente</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Umbral (intervalo)</label>
                <div className="flex gap-2">
                  <input type="number" min="0" value={form.umbral_h}
                    onChange={(e) => setForm({ ...form, umbral_h: e.target.value })}
                    placeholder="Horas"
                    className="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" min="0" max="59" value={form.umbral_m}
                    onChange={(e) => setForm({ ...form, umbral_m: e.target.value })}
                    placeholder="Min"
                    className="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Vacío = sin umbral cargado todavía</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Calendario
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próxima inspección por fecha</label>
              <input type="date" value={form.fecha_proxima_inspeccion}
                onChange={(e) => setForm({ ...form, fecha_proxima_inspeccion: e.target.value })}
                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Solo aplica a componentes con control por calendario (ej. hélice) — dejalo vacío si no corresponde</p>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear componente"}
          </button>
        </div>
      </div>
    </div>
  )
}