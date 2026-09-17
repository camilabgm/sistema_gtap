"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, RotateCcw, PowerOff } from "lucide-react"
import SicemComponentesForm from "./SicemComponentesForm"
import SicemDatosGeneralesAeronave from "./SicemDatosGeneralesAeronave"
import AccionIcono from "@/components/shared/AccionIcono"

const ETIQUETAS_TIPO = {
  MOTOR: "Motor",
  HELICE: "Hélice",
  APU: "APU",
}

function formatearMinutos(min) {
  if (min === null || min === undefined) return "—"
  const negativo = min < 0
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${negativo ? "-" : ""}${h}h ${m}min`
}

function formatearFecha(fecha) {
  if (!fecha) return "—"
  return new Date(fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

// Colores de la barra y del texto grande — mismo criterio que el
// badge de la tabla, solo que acá pintan la tarjeta entera en vez de
// una pastilla chica.
function estadoComponente(c) {
  if (c.umbral_horas_minutos == null) return { color: "gray", barra: "bg-gray-300", texto: "text-gray-400" }
  if (c.horas_disponibles_minutos < 0) return { color: "red", barra: "bg-red-500", texto: "text-red-700" }
  if (c.necesita_alerta) return { color: "amber", barra: "bg-amber-500", texto: "text-amber-700" }
  return { color: "green", barra: "bg-green-500", texto: "text-green-700" }
}

function badgeAlerta(componente) {
  if (componente.umbral_horas_minutos == null) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Sin umbral cargado</span>
  }
  if (componente.horas_disponibles_minutos < 0) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Umbral superado</span>
  }
  if (componente.necesita_alerta) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">⚠ Por vencer</span>
  }
  return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ OK</span>
}

export default function SicemComponentesTable({ componentes: datosIniciales, aeronaves: aeronavesIniciales, permisos }) {

  const [componentes, setComponentes] = useState(datosIniciales)
  const [aeronaves, setAeronaves] = useState(aeronavesIniciales)
  const [vista, setVista] = useState("TABLA")
  const [aeronaveElegidaId, setAeronaveElegidaId] = useState(aeronavesIniciales[0]?.id ?? null)
  const [filtroAeronaveTabla, setFiltroAeronaveTabla] = useState("TODAS")
  const [filtroTipo, setFiltroTipo] = useState("TODOS")
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [componenteSeleccionado, setComponenteSeleccionado] = useState(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)

  const aeronaveElegida = aeronaves.find((a) => a.id === aeronaveElegidaId)

  const componentesTabla = componentes.filter((c) => {
    const pasaAeronave = filtroAeronaveTabla === "TODAS" || c.aeronave_id === Number(filtroAeronaveTabla)
    const pasaTipo = filtroTipo === "TODOS" || c.tipo === filtroTipo
    const pasaActivo = mostrarInactivos || c.activo !== false
    return pasaAeronave && pasaTipo && pasaActivo
  })

  const componentesDeAeronave = componentes.filter((c) => {
    const pasaAeronave = c.aeronave_id === aeronaveElegidaId
    const pasaActivo = mostrarInactivos || c.activo !== false
    return pasaAeronave && pasaActivo
  })

  function handleNuevo() { setComponenteSeleccionado(null); setModalAbierto(true) }
  function handleEditar(c) { setComponenteSeleccionado(c); setModalAbierto(true) }
  function handleCerrar() { setModalAbierto(false); setComponenteSeleccionado(null) }

  async function recargarDatos(incluirInactivos = mostrarInactivos) {
    const url = incluirInactivos ? "/api/sicem/componentes?incluirInactivos=true" : "/api/sicem/componentes"
    const res = await fetch(url, { credentials: "include" })
    setComponentes(await res.json())
  }

  function toggleMostrarInactivos() {
    setMostrarInactivos((prev) => {
      const nuevoValor = !prev
      recargarDatos(nuevoValor)
      return nuevoValor
    })
  }

  async function handleGuardado() { handleCerrar(); await recargarDatos() }

  function handleGuardadoDatosGenerales(aeronaveActualizada) {
    setAeronaves((prev) => prev.map((a) => (a.id === aeronaveActualizada.id ? aeronaveActualizada : a)))
  }

  async function handleDesactivar(componente) {
    if (!window.confirm(`¿Desactivar el ${ETIQUETAS_TIPO[componente.tipo]} de ${componente.aeronave.matricula}? No se borra — queda oculto y sin contar para las alertas hasta que lo reactivés. No se puede eliminar de verdad porque ya tiene historial o eventos registrados.`)) return
    setCambiandoEstado(componente.id)
    await fetch(`/api/sicem/componentes/${componente.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: false }),
    })
    await recargarDatos()
    setCambiandoEstado(null)
  }

  async function handleEliminar(componente) {
    if (!window.confirm(`¿Eliminar el ${ETIQUETAS_TIPO[componente.tipo]} de ${componente.aeronave.matricula}? Esto SÍ borra el registro para siempre — no se puede deshacer. Como todavía no tiene ningún evento de mantenimiento real, no hay nada operacional que se pierda (si tenía correcciones manuales en su historial, se borran junto con él).`)) return
    setCambiandoEstado(componente.id)
    const res = await fetch(`/api/sicem/componentes/${componente.id}`, {
      method: "DELETE",
      credentials: "include",
    })
    if (!res.ok) {
      const datos = await res.json()
      alert(datos.error || "Error al eliminar")
    }
    await recargarDatos()
    setCambiandoEstado(null)
  }

  async function handleReactivar(componente) {
    setCambiandoEstado(componente.id)
    await fetch(`/api/sicem/componentes/${componente.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: true }),
    })
    await recargarDatos()
    setCambiandoEstado(null)
  }

  return (
    <div className="p-4">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Componentes de mantenimiento</h1>
            <p className="text-sm text-gray-500 mt-1">Umbrales y horas acumuladas por motor, hélice y APU de cada aeronave</p>
          </div>
          {permisos?.puede_crear && (
            <button onClick={handleNuevo}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9 shrink-0">
              <Plus className="h-4 w-4" />
              Nuevo componente
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button onClick={() => setVista("TABLA")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${vista === "TABLA" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Tabla
            </button>
            <button onClick={() => setVista("AERONAVE")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${vista === "AERONAVE" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Por aeronave
            </button>
          </div>

          {vista === "TABLA" && (
            <select value={filtroAeronaveTabla}
              onChange={(e) => setFiltroAeronaveTabla(e.target.value)}
              className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="TODAS">Todas las aeronaves</option>
              {aeronaves.map((a) => (
                <option key={a.id} value={a.id}>{a.matricula}</option>
              ))}
            </select>
          )}

          {vista === "AERONAVE" && (
            <select value={aeronaveElegidaId ?? ""}
              onChange={(e) => setAeronaveElegidaId(Number(e.target.value))}
              className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {aeronaves.map((a) => (
                <option key={a.id} value={a.id}>{a.matricula}</option>
              ))}
            </select>
          )}

          {vista === "TABLA" && (
            <select value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="TODOS">Todos los tipos</option>
              <option value="MOTOR">Motor</option>
              <option value="HELICE">Hélice</option>
              <option value="APU">APU</option>
            </select>
          )}

          <div className="w-px h-7 bg-gray-200" />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={mostrarInactivos} onChange={toggleMostrarInactivos}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Mostrar inactivos
          </label>
        </div>
      </div>

      {vista === "TABLA" ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aeronave</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Componente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas acumuladas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Umbral</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponibles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próx. inspección</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {componentesTabla.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">No se encontraron componentes</td>
                </tr>
              ) : (
                componentesTabla.map((c) => (
                  <tr key={c.id} className={`transition-colors ${c.activo === false ? "bg-gray-50 opacity-70" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.aeronave.matricula}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{ETIQUETAS_TIPO[c.tipo] || c.tipo}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatearMinutos(c.horas_acumuladas_minutos)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatearMinutos(c.umbral_horas_minutos)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatearMinutos(c.horas_disponibles_minutos)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatearFecha(c.fecha_proxima_inspeccion)}</td>
                    <td className="px-6 py-4 text-sm">{badgeAlerta(c)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex justify-end items-center gap-0.5">
                        {c.activo === false ? (
                          permisos?.puede_editar && (
                            <AccionIcono icono={RotateCcw} etiqueta="Reactivar" onClick={() => handleReactivar(c)} disabled={cambiandoEstado === c.id} color="primario" />
                          )
                        ) : (
                          <>
                            {permisos?.puede_editar && (
                              <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(c)} color="primario" />
                            )}
                            {c.puede_eliminarse ? (
                              permisos?.puede_eliminar && (
                                <AccionIcono icono={Trash2} etiqueta="Eliminar" onClick={() => handleEliminar(c)} disabled={cambiandoEstado === c.id} color="peligro" />
                              )
                            ) : (
                              permisos?.puede_editar && (
                                <AccionIcono icono={PowerOff} etiqueta="Desactivar" onClick={() => handleDesactivar(c)} disabled={cambiandoEstado === c.id} />
                              )
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">{componentesTabla.length} de {componentes.length} componentes{mostrarInactivos && " (incluye inactivos)"}</p>
          </div>
        </div>
      ) : (
        <div>
          {aeronaveElegida && (
            <SicemDatosGeneralesAeronave key={aeronaveElegida.id} aeronave={aeronaveElegida} onGuardado={handleGuardadoDatosGenerales} />
          )}

          {componentesDeAeronave.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
              Esta aeronave todavía no tiene componentes configurados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {componentesDeAeronave.map((c) => {
                const estado = estadoComponente(c)
                const pct = c.umbral_horas_minutos
                  ? Math.min(100, Math.max(0, (c.horas_acumuladas_minutos / c.umbral_horas_minutos) * 100))
                  : 0
                return (
                  <div key={c.id} className={`bg-white rounded-lg border border-gray-200 p-5 ${c.activo === false ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">{ETIQUETAS_TIPO[c.tipo] || c.tipo}</span>
                      {badgeAlerta(c)}
                    </div>

                    <p className={`text-3xl font-bold ${estado.texto}`}>{formatearMinutos(c.horas_disponibles_minutos)}</p>
                    <p className="text-xs text-gray-400 mb-3">disponibles</p>

                    <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                      <div className={`h-2 rounded-full ${estado.barra}`} style={{ width: `${pct}%` }} />
                    </div>

                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <p>Acumuladas: {formatearMinutos(c.horas_acumuladas_minutos)}</p>
                      <p>Umbral: {formatearMinutos(c.umbral_horas_minutos)}</p>
                      {c.fecha_proxima_inspeccion && <p>Próx. inspección: {formatearFecha(c.fecha_proxima_inspeccion)}</p>}
                    </div>

                    <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
                      {c.activo === false ? (
                        permisos?.puede_editar && (
                          <AccionIcono icono={RotateCcw} etiqueta="Reactivar" onClick={() => handleReactivar(c)} disabled={cambiandoEstado === c.id} color="primario" />
                        )
                      ) : (
                        <>
                          {permisos?.puede_editar && (
                            <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(c)} color="primario" />
                          )}
                          {c.puede_eliminarse ? (
                            permisos?.puede_eliminar && (
                              <AccionIcono icono={Trash2} etiqueta="Eliminar" onClick={() => handleEliminar(c)} disabled={cambiandoEstado === c.id} color="peligro" />
                            )
                          ) : (
                            permisos?.puede_editar && (
                              <AccionIcono icono={PowerOff} etiqueta="Desactivar" onClick={() => handleDesactivar(c)} disabled={cambiandoEstado === c.id} />
                            )
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {modalAbierto && (
        <SicemComponentesForm
          componente={componenteSeleccionado}
          aeronaves={aeronaves}
          onGuardado={handleGuardado}
          onCerrar={handleCerrar}
        />
      )}
    </div>
  )
}