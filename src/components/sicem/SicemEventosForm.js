"use client"
import { useState, useEffect, useMemo } from "react"

const ETIQUETAS_COMPONENTE = {
  MOTOR: "Motor",
  HELICE: "Hélice",
  APU: "APU",
}

// Sirve para crear (evento=null) y para editar (evento=el existente).
// Cerrar sigue siendo una acción aparte (botón en la tabla, PATCH
// .../cerrar) — esto es solo para corregir/completar los datos de un
// evento, no para cerrarlo.
export default function SicemEventosForm({ evento, aeronaves, componentes, onGuardado, onCerrar }) {

  const modoEdicion = !!evento
  // Si ya reseteó un componente de verdad, ese dato queda fijo — no
  // se puede reescribir qué componente fue ni deshacer el reseteo.
  const resetoYaAplicado = modoEdicion && evento.es_cambio_componente

  const [form, setForm] = useState({
    aeronave_id: evento?.aeronave_id ? String(evento.aeronave_id) : "",
    componente_id: evento?.componente_id ? String(evento.componente_id) : "",
    tipo: evento?.tipo || "PROGRAMADO",
    es_cambio_componente: evento?.es_cambio_componente || false,
    lugar: evento?.lugar || "",
    es_accidente: false,
    observacion: evento?.observacion || "",
  })

  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    const manejarTecla = (e) => { if (e.key === "Escape") onCerrar() }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [])

  const componentesDeAeronave = useMemo(
    () => componentes.filter((c) => String(c.aeronave_id) === form.aeronave_id && c.activo !== false),
    [componentes, form.aeronave_id]
  )

  const aeronaveSeleccionada = aeronaves.find((a) => String(a.id) === form.aeronave_id)

  function handleCambiarAeronave(valor) {
    setForm((prev) => ({ ...prev, aeronave_id: valor, componente_id: "" }))
  }

  async function handleGuardar() {
    if (cargando) return
    setError("")

    if (!form.aeronave_id) {
      setError("Seleccioná la aeronave")
      return
    }
    if (form.tipo === "NO_PROGRAMADO" && !form.observacion.trim()) {
      setError("Para un mantenimiento no programado, la observación es obligatoria")
      return
    }
    if (form.es_cambio_componente && !form.componente_id) {
      setError("Un cambio de componente necesita indicar cuál componente")
      return
    }

    setCargando(true)

    const body = {
      aeronave_id: Number(form.aeronave_id),
      componente_id: form.componente_id ? Number(form.componente_id) : null,
      tipo: form.tipo,
      es_cambio_componente: form.es_cambio_componente,
      lugar: form.lugar || null,
      es_accidente: form.es_accidente,
      observacion: form.observacion.trim() || null,
    }

    const url = modoEdicion ? `/api/sicem/eventos/${evento.id}` : "/api/sicem/eventos"

    try {
      const respuesta = await fetch(url, {
        method: modoEdicion ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        setError(datos.error || "Ocurrió un error inesperado")
        return
      }

      onGuardado()
    } catch (err) {
      setError("No se pudo conectar con el servidor — revisá tu conexión o probá de nuevo. Si sigue pasando, avisale a Cami con esto: " + err.message)
    } finally {
      setCargando(false)
    }
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
            {modoEdicion ? "Editar evento de mantenimiento" : "Nuevo evento de mantenimiento"}
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
              Qué y dónde
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aeronave <span className="text-red-500">*</span>
                </label>
                {modoEdicion ? (
                  <div className="w-full border border-gray-200 bg-gray-100 rounded-md px-3 py-2 text-sm text-gray-600">
                    {aeronaveSeleccionada?.matricula}
                  </div>
                ) : (
                  <select value={form.aeronave_id}
                    onChange={(e) => handleCambiarAeronave(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar...</option>
                    {aeronaves.map((a) => {
                      const bloqueadaPorOtro = a.estado === "NO_DISPONIBLE" && a.motivo_no_disponible === "OTRO"
                      return (
                        <option key={a.id} value={a.id} disabled={bloqueadaPorOtro}>
                          {a.matricula}{bloqueadaPorOtro ? ` — No disponible (${a.motivo_otro || "Otro"})` : ""}
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="PROGRAMADO">Programado</option>
                  <option value="NO_PROGRAMADO">No programado</option>
                  <option value="CALENDARIO">Calendario</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Componente afectado <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <select value={form.componente_id}
                  onChange={(e) => setForm({ ...form, componente_id: e.target.value })}
                  disabled={!form.aeronave_id || resetoYaAplicado}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Ninguno en particular</option>
                  {componentesDeAeronave.map((c) => (
                    <option key={c.id} value={c.id}>{ETIQUETAS_COMPONENTE[c.tipo] || c.tipo}</option>
                  ))}
                </select>
                {resetoYaAplicado && (
                  <p className="text-xs text-gray-400 mt-1">Ya reseteó este componente — no se puede cambiar desde acá</p>
                )}
                {!resetoYaAplicado && form.aeronave_id && componentesDeAeronave.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Esta aeronave todavía no tiene componentes configurados</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lugar <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <select value={form.lugar}
                  onChange={(e) => setForm({ ...form, lugar: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin definir todavía</option>
                  <option value="INTERNO">Interno</option>
                  <option value="TERCERIZADO">Tercerizado</option>
                </select>
              </div>
            </div>
          </div>

          {form.componente_id && (
            <div>
              <label className={`flex items-center gap-2 text-sm text-gray-700 ${resetoYaAplicado ? "" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={form.es_cambio_componente}
                  disabled={resetoYaAplicado}
                  onChange={(e) => setForm({ ...form, es_cambio_componente: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                />
                Es un cambio/overhaul real de este componente
              </label>
              {form.es_cambio_componente && !resetoYaAplicado && (
                <p className="text-xs text-amber-600 mt-1 ml-6">
                  Al guardar, las horas acumuladas de este componente se resetean a 0.
                </p>
              )}
              {resetoYaAplicado && (
                <p className="text-xs text-gray-400 mt-1 ml-6">Este reseteo ya se aplicó — no se puede deshacer desde acá.</p>
              )}
            </div>
          )}

          {!modoEdicion && form.tipo === "NO_PROGRAMADO" && (
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.es_accidente}
                  onChange={(e) => setForm({ ...form, es_accidente: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                La aeronave sufrió un accidente (no solo un incidente menor)
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-6">
                Define si en Aeronaves queda como "Accidentada" o "En mantenimiento".
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observación
              {form.tipo === "NO_PROGRAMADO" && <span className="text-red-500"> *</span>}
              {form.tipo !== "NO_PROGRAMADO" && <span className="text-gray-400 font-normal"> (opcional)</span>}
            </label>
            <textarea
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              rows={3}
              placeholder="Qué pasó, qué se va a hacer, o cualquier detalle relevante"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!modoEdicion && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Al guardar, la aeronave pasa a No disponible automáticamente.
            </div>
          )}

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Abrir evento"}
          </button>
        </div>
      </div>
    </div>
  )
}