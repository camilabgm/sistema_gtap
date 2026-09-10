"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react"
import SicemComponentesForm from "./SicemComponentesForm"
import AccionIcono from "@/components/shared/AccionIcono"

const ETIQUETAS_TIPO = {
  MOTOR:  "Motor",
  HELICE: "Hélice",
  APU:    "APU",
}

// Igual que PanelPostVuelo.js — local a este archivo, no compartido
// desde un lib, siguiendo la misma convención ya establecida.
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
  return new Date(fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function SicemComponentesTable({ componentes: datosIniciales, aeronaves, permisos }) {

  const [componentes,          setComponentes]          = useState(datosIniciales)
  const [filtroAeronave,       setFiltroAeronave]       = useState("TODAS")
  const [filtroTipo,           setFiltroTipo]           = useState("TODOS")
  const [mostrarInactivos,     setMostrarInactivos]     = useState(false)
  const [modalAbierto,         setModalAbierto]         = useState(false)
  const [componenteSeleccionado, setComponenteSeleccionado] = useState(null)
  const [cambiandoEstado,      setCambiandoEstado]      = useState(null)

  const componentesFiltrados = componentes.filter((c) => {
    const pasaAeronave = filtroAeronave === "TODAS" || c.aeronave_id === Number(filtroAeronave)
    const pasaTipo = filtroTipo === "TODOS" || c.tipo === filtroTipo
    const pasaActivo = mostrarInactivos || c.activo !== false
    return pasaAeronave && pasaTipo && pasaActivo
  })

  function handleNuevo()  { setComponenteSeleccionado(null); setModalAbierto(true) }
  function handleEditar(c) { setComponenteSeleccionado(c);    setModalAbierto(true) }
  function handleCerrar()  { setModalAbierto(false);          setComponenteSeleccionado(null) }

  async function recargarDatos() {
    const res = await fetch("/api/sicem/componentes", { credentials: "include" })
    setComponentes(await res.json())
  }

  async function handleGuardado() { handleCerrar(); await recargarDatos() }

  async function handleDesactivar(componente) {
    if (!window.confirm(`¿Desactivar el ${ETIQUETAS_TIPO[componente.tipo]} de ${componente.aeronave.matricula}? Deja de contar para las alertas hasta que lo reactivés.`)) return
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
          <select value={filtroAeronave}
            onChange={(e) => setFiltroAeronave(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="TODAS">Todas las aeronaves</option>
            {aeronaves.map((a) => (
              <option key={a.id} value={a.id}>{a.matricula}</option>
            ))}
          </select>
          <select value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="TODOS">Todos los tipos</option>
            <option value="MOTOR">Motor</option>
            <option value="HELICE">Hélice</option>
            <option value="APU">APU</option>
          </select>

          <div className="w-px h-7 bg-gray-200" />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarInactivos}
              onChange={() => setMostrarInactivos((v) => !v)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Mostrar inactivos
          </label>
        </div>
      </div>

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
            {componentesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">No se encontraron componentes</td>
              </tr>
            ) : (
              componentesFiltrados.map((c) => (
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
                          <AccionIcono
                            icono={RotateCcw}
                            etiqueta="Reactivar"
                            onClick={() => handleReactivar(c)}
                            disabled={cambiandoEstado === c.id}
                            color="primario"
                          />
                        )
                      ) : (
                        <>
                          {permisos?.puede_editar && (
                            <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(c)} color="primario" />
                          )}
                          {permisos?.puede_editar && (
                            <AccionIcono
                              icono={Trash2}
                              etiqueta="Desactivar"
                              onClick={() => handleDesactivar(c)}
                              disabled={cambiandoEstado === c.id}
                              color="peligro"
                            />
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
          <p className="text-xs text-gray-500">
            {componentesFiltrados.length} de {componentes.length} componentes
            {mostrarInactivos && " (incluye inactivos)"}
          </p>
        </div>
      </div>

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