"use client"
import { useState, useEffect, useMemo } from "react"
import { fechaSoloDiaAInputValue } from "@/lib/fechaSoloDia"

const COMPONENTES_AUTO_ACTUALIZABLES = ["MOTOR", "HELICE"]

function horasYMinutosAMinutos(h, m) {
  const hh = h === "" ? 0 : Number(h)
  const mm = m === "" ? 0 : Number(m)
  return hh * 60 + mm
}
function minutosAHorasYMinutos(totalMinutos) {
  if (totalMinutos === null || totalMinutos === undefined) return { horas: "", minutos: "" }
  return { horas: Math.floor(totalMinutos / 60), minutos: totalMinutos % 60 }
}
function formatearMinutos(min) {
  if (min === null || min === undefined || isNaN(min)) return "—"
  const negativo = min < 0
  const abs = Math.abs(min)
  return `${negativo ? "-" : ""}${Math.floor(abs / 60)}h ${abs % 60}min`
}

// Los 3 modos son las 3 formas en que el GTAP ya expresa sus horas en
// el Excel — no son un dato que se guarde, son solo una calculadora
// para no tener que restar a mano antes de tipear. Al guardar, siempre
// se manda horas_acumuladas_minutos + umbral_horas_minutos, igual que
// antes.
export default function SicemComponentesForm({ componente, aeronaves, onGuardado, onCerrar }) {

  const modoEdicion = !!componente

  const [form, setForm] = useState({
    aeronave_id: componente?.aeronave_id ? String(componente.aeronave_id) : "",
    tipo: componente?.tipo || "MOTOR",
    fecha_proxima_inspeccion: fechaSoloDiaAInputValue(componente?.fecha_proxima_inspeccion),
  })

  const [modo, setModo] = useState("directo")

  const acumInicial = minutosAHorasYMinutos(componente?.horas_acumuladas_minutos ?? 0)
  const umbInicial = minutosAHorasYMinutos(componente?.umbral_horas_minutos ?? null)

  const [directo, setDirecto] = useState({
    acumH: acumInicial.horas, acumM: acumInicial.minutos,
    umbH: umbInicial.horas, umbM: umbInicial.minutos,
  })
  const [cambio, setCambio] = useState({
    tboH: "", tboM: "", umbralModo: "absoluto", refH: "", refM: "",
  })
  const [manual, setManual] = useState({
    acumH: acumInicial.horas, acumM: acumInicial.minutos,
    baseH: "", baseM: "", mult: 1,
  })

  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const manejarTecla = (e) => { if (e.key === "Escape") onCerrar() }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [])

  const esAutoActualizable = COMPONENTES_AUTO_ACTUALIZABLES.includes(form.tipo)

  const aeronaveSeleccionada = aeronaves.find((a) => String(a.id) === form.aeronave_id)
  const odometroMin = aeronaveSeleccionada?.horas_vuelo_totales_minutos ?? 0

  const resultado = useMemo(() => {
    let acumuladas, umbral
    if (modo === "directo") {
      acumuladas = horasYMinutosAMinutos(directo.acumH, directo.acumM)
      umbral = horasYMinutosAMinutos(directo.umbH, directo.umbM)
    } else if (modo === "cambio") {
      const ref = horasYMinutosAMinutos(cambio.refH, cambio.refM)
      const tbo = horasYMinutosAMinutos(cambio.tboH, cambio.tboM)
      acumuladas = odometroMin - ref
      umbral = cambio.umbralModo === "absoluto" ? tbo - ref : tbo
    } else {
      acumuladas = horasYMinutosAMinutos(manual.acumH, manual.acumM)
      const base = horasYMinutosAMinutos(manual.baseH, manual.baseM)
      const mult = Number(manual.mult) || 1
      umbral = base * mult
    }
    return { acumuladas, umbral, disponibles: umbral - acumuladas }
  }, [modo, directo, cambio, manual, odometroMin])

  async function handleGuardar() {
    if (cargando) return
    setCargando(true)
    setError("")

    if (!modoEdicion && !form.aeronave_id) {
      setError("Seleccioná la aeronave")
      setCargando(false)
      return
    }
    if (modo === "cambio" && !aeronaveSeleccionada) {
      setError("Elegí la aeronave antes de usar el modo Cambio de componente — necesita su odómetro")
      setCargando(false)
      return
    }
    if (resultado.acumuladas < 0) {
      setError("Las horas acumuladas dieron negativas — revisá los números que cargaste (¿referencia mayor que el odómetro de la aeronave, o algún dígito de más/de menos?)")
      setCargando(false)
      return
    }
    if (resultado.umbral !== null && resultado.umbral < 0) {
      setError("El umbral calculado dio negativo — revisá los números que cargaste")
      setCargando(false)
      return
    }

    const body = {
      aeronave_id: form.aeronave_id ? Number(form.aeronave_id) : undefined,
      tipo: form.tipo,
      horas_acumuladas_minutos: resultado.acumuladas,
      umbral_horas_minutos: resultado.umbral,
      fecha_proxima_inspeccion: form.fecha_proxima_inspeccion || null,
    }

    const metodo = modoEdicion ? "PUT" : "POST"
    const url = modoEdicion ? `/api/sicem/componentes/${componente.id}` : "/api/sicem/componentes"

    const respuesta = await fetch(url, {
      method: metodo,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {modoEdicion ? "Editar componente" : "Nuevo componente"}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
        )}

        <div className="px-6 py-4 space-y-6">

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Identificación</h3>
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
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Horas — elegí cómo lo tenés en el Excel</h3>

            {esAutoActualizable && (
              <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Motor y hélice se actualizan solos al cerrar tramos en Post-Vuelo. Usá esto solo para la carga inicial o para corregir un error puntual.
              </div>
            )}

            <div className="flex gap-2 mb-3">
              {[
                { valor: "directo", etiqueta: "Directo" },
                { valor: "cambio", etiqueta: "Cambio de componente" },
                { valor: "manual", etiqueta: "Manual" },
              ].map((m) => (
                <button key={m.valor} type="button" onClick={() => setModo(m.valor)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    modo === m.valor ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}>
                  {m.etiqueta}
                </button>
              ))}
            </div>

            {modo === "directo" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Horas acumuladas</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" value={directo.acumH} onChange={(e) => setDirecto({ ...directo, acumH: e.target.value })} placeholder="Horas" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                    <input type="number" min="0" max="59" value={directo.acumM} onChange={(e) => setDirecto({ ...directo, acumM: e.target.value })} placeholder="Min" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Umbral (intervalo)</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" value={directo.umbH} onChange={(e) => setDirecto({ ...directo, umbH: e.target.value })} placeholder="Horas" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                    <input type="number" min="0" max="59" value={directo.umbM} onChange={(e) => setDirecto({ ...directo, umbM: e.target.value })} placeholder="Min" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                </div>
              </div>
            )}

            {modo === "cambio" && (
              <div>
                {!aeronaveSeleccionada && (
                  <p className="text-xs text-amber-600 mb-2">Elegí la aeronave arriba — este modo necesita su odómetro (horas totales) para calcular.</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Umbral / TBO</label>
                    <div className="flex gap-2 mb-1">
                      <input type="number" min="0" value={cambio.tboH} onChange={(e) => setCambio({ ...cambio, tboH: e.target.value })} placeholder="Horas" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                      <input type="number" min="0" max="59" value={cambio.tboM} onChange={(e) => setCambio({ ...cambio, tboM: e.target.value })} placeholder="Min" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setCambio({ ...cambio, umbralModo: "absoluto" })}
                        className={`px-2 py-0.5 rounded text-[11px] border ${cambio.umbralModo === "absoluto" ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 text-gray-500"}`}>
                        Total absoluto
                      </button>
                      <button type="button" onClick={() => setCambio({ ...cambio, umbralModo: "intervalo" })}
                        className={`px-2 py-0.5 rounded text-[11px] border ${cambio.umbralModo === "intervalo" ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 text-gray-500"}`}>
                        Intervalo
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Horas de la aeronave al instalar</label>
                    <div className="flex gap-2">
                      <input type="number" min="0" value={cambio.refH} onChange={(e) => setCambio({ ...cambio, refH: e.target.value })} placeholder="Horas" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                      <input type="number" min="0" max="59" value={cambio.refM} onChange={(e) => setCambio({ ...cambio, refM: e.target.value })} placeholder="Min" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modo === "manual" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Horas acumuladas</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" value={manual.acumH} onChange={(e) => setManual({ ...manual, acumH: e.target.value })} placeholder="Horas" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                    <input type="number" min="0" max="59" value={manual.acumM} onChange={(e) => setManual({ ...manual, acumM: e.target.value })} placeholder="Min" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Umbral base</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" value={manual.baseH} onChange={(e) => setManual({ ...manual, baseH: e.target.value })} placeholder="Horas" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                    <input type="number" min="0" max="59" value={manual.baseM} onChange={(e) => setManual({ ...manual, baseM: e.target.value })} placeholder="Min" className="w-1/2 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Multiplicador</label>
                  <input type="number" min="1" value={manual.mult} onChange={(e) => setManual({ ...manual, mult: e.target.value })} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                </div>
              </div>
            )}

            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Acumuladas {formatearMinutos(resultado.acumuladas)} · Umbral {formatearMinutos(resultado.umbral)} · Disponibles {formatearMinutos(resultado.disponibles)}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Calendario</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próxima inspección por fecha</label>
              <input type="date" value={form.fecha_proxima_inspeccion}
                min="2000-01-01" max="2100-12-31"
                onChange={(e) => setForm({ ...form, fecha_proxima_inspeccion: e.target.value })}
                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Solo aplica a componentes con control por calendario (ej. hélice) — dejalo vacío si no corresponde</p>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onCerrar} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
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