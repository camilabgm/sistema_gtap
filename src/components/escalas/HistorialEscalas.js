"use client"

import { useState, useEffect, Fragment } from "react"
import Link from "next/link"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  estadoDetallado,
  ESTADO_DETALLADO_CLASES,
  TOOLTIP_ESTADO_DETALLADO,
  puedeEditarAhora,
  motivoNoEditable,
  puedeEliminarse,
  formatearFechaHoraCompacta,
} from "@/lib/escalas"
import { formatearFechaSoloDia } from "@/lib/fechaSoloDia"
import PanelDetalleEscala from "./PanelDetalleEscala"

const ESTADOS_FILTRABLES = [
  { clave: "PENDIENTE", texto: "Programada · Pendiente" },
  { clave: "VENCIDA_SIN_AUTORIZAR", texto: "Vencida · Sin autorizar" },
  { clave: "PROGRAMADA_AUTORIZADA", texto: "Programada · Autorizada" },
  { clave: "EN_DESARROLLO", texto: "En vuelo" },
  { clave: "SIN_REGISTRAR", texto: "Sin registrar" },
  { clave: "CUMPLIDA", texto: "Cumplida" },
  { clave: "ABORTADA", texto: "Abortada" },
  { clave: "RECHAZADA", texto: "Rechazada" },
  { clave: "BORRADOR", texto: "Borrador" },
]

function textoTripulacion(tripulacion) {
  if (!tripulacion || tripulacion.length === 0) return "—"
  return tripulacion.map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", ")
}

export default function HistorialEscalas({ puedeEditar, puedeEliminar }) {
  const [escalas, setEscalas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState("")
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorEliminar, setErrorEliminar] = useState(null)
  const [filaExpandidaId, setFilaExpandidaId] = useState(null)

  const [filtroEstados, setFiltroEstados] = useState([])
  const [estadoAbierto, setEstadoAbierto] = useState(false)
  const [filtroAeronave, setFiltroAeronave] = useState("")
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("")
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("")

  useEffect(() => {
    cargarEscalas()
  }, [])

  function cargarEscalas() {
    setCargando(true)
    fetch("/api/escalas", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEscalas(data)
        else setError(data.error || "Error al cargar el listado")
      })
      .catch(() => setError("Error al cargar el listado"))
      .finally(() => setCargando(false))
  }

  async function handleEliminar(escala) {
    const referencia = escala.nro_orden ? `#${escala.nro_orden}` : `#${escala.id}`
    const confirmar = window.confirm(
      `¿Eliminar la escala ${referencia}? Esta acción no se puede deshacer desde la interfaz.`
    )
    if (!confirmar) return

    setErrorEliminar(null)
    setEliminandoId(escala.id)
    try {
      const res = await fetch(`/api/escalas/${escala.id}`, { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al eliminar la escala")

      setEscalas((prev) => prev.filter((e) => e.id !== escala.id))
    } catch (err) {
      setErrorEliminar(err.message)
    } finally {
      setEliminandoId(null)
    }
  }

  function toggleEstadoFiltro(clave) {
    setFiltroEstados((prev) =>
      prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]
    )
  }

  function limpiarFiltros() {
    setBusqueda("")
    setFiltroEstados([])
    setFiltroAeronave("")
    setFiltroFechaDesde("")
    setFiltroFechaHasta("")
  }

  const hayFiltrosActivos =
    busqueda.trim() || filtroEstados.length > 0 || filtroAeronave || filtroFechaDesde || filtroFechaHasta

  const aeronaveOptions = [...new Set(escalas.map((e) => e.aeronave?.matricula).filter(Boolean))].sort()

  const filtradas = escalas
    .filter((e) => {
      if (!busqueda.trim()) return true
      const texto = busqueda.toLowerCase()
      return (
        (e.solicitante || "").toLowerCase().includes(texto) ||
        (e.nro_orden || "").toLowerCase().includes(texto) ||
        (e.tipo_mision?.codigo || "").toLowerCase().includes(texto)
      )
    })
    .filter((e) => {
      if (filtroEstados.length === 0) return true
      return filtroEstados.includes(estadoDetallado(e).clave)
    })
    .filter((e) => {
      if (!filtroAeronave) return true
      return e.aeronave?.matricula === filtroAeronave
    })
    .filter((e) => {
      const fechaISO = `${e.fecha}`.slice(0, 10)
      if (filtroFechaDesde && fechaISO < filtroFechaDesde) return false
      if (filtroFechaHasta && fechaISO > filtroFechaHasta) return false
      return true
    })
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  function descargarPDF() {
    const doc = new jsPDF({ orientation: "landscape" })
    doc.setFontSize(14)
    doc.text("Gestión de Escalas — Sistema GTAP", 14, 15)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Generado: ${new Date().toLocaleString("es-PY")}`, 14, 21)

    autoTable(doc, {
      startY: 26,
      head: [["Solicitante", "Fecha solicitud", "Aeronave", "Salida", "N. Orden", "Tripulación", "Tipo de misión", "Estado"]],
      body: filtradas.map((e) => [
        e.solicitante || "—",
        formatearFechaSoloDia(e.fecha),
        e.aeronave?.matricula || "—",
        formatearFechaHoraCompacta(e.hora_despegue_estimada),
        e.nro_orden || "—",
        textoTripulacion(e.tripulacion),
        e.tipo_mision ? `${e.tipo_mision.codigo} — ${e.tipo_mision.nombre}` : "—",
        estadoDetallado(e).texto,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })

    doc.save(`gestion-escalas-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Escalas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Todas las escalas del sistema — ver detalle, editar, eliminar o abortar según corresponda
          </p>
        </div>
        <button
          onClick={descargarPDF}
          disabled={filtradas.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          ⬇ Descargar PDF
        </button>
      </div>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por solicitante, N. de orden o tipo de misión..."
        className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">

        <div className="relative">
          <button
            onClick={() => setEstadoAbierto((v) => !v)}
            className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
              filtroEstados.length > 0
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Estado {filtroEstados.length > 0 && `(${filtroEstados.length})`} ▾
          </button>
          {estadoAbierto && (
            <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-2">
              {ESTADOS_FILTRABLES.map((op) => (
                <label key={op.clave} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtroEstados.includes(op.clave)}
                    onChange={() => toggleEstadoFiltro(op.clave)}
                    className="rounded border-gray-300"
                  />
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_DETALLADO_CLASES[op.clave] || "bg-gray-100 text-gray-600"}`}
                  >
                    {op.texto}
                  </span>
                </label>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1 flex justify-between px-2">
                <button
                  onClick={() => setFiltroEstados([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => setEstadoAbierto(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>

        <select
          value={filtroAeronave}
          onChange={(e) => setFiltroAeronave(e.target.value)}
          className={`px-3 py-2 rounded-md border text-sm font-medium ${
            filtroAeronave ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-600"
          }`}
        >
          <option value="">Aeronave — todas</option>
          {aeronaveOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Desde</label>
          <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-gray-300 text-sm"
          />
          <label className="text-xs text-gray-500">Hasta</label>
          <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-gray-300 text-sm"
          />
        </div>

        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-red-600 hover:text-red-700 font-medium ml-1"
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {errorEliminar && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {errorEliminar}
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          No se encontraron escalas{hayFiltrosActivos ? " con estos filtros" : ""}.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aeronave</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salida</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N. Orden</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tripulación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de misión</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtradas.map((e) => {
                const estado = estadoDetallado(e)
                const editable = puedeEditarAhora(e)
                const motivo = motivoNoEditable(e)
                const eliminable = puedeEliminarse(e)
                const expandida = filaExpandidaId === e.id
                const tooltipEstado = TOOLTIP_ESTADO_DETALLADO[estado.clave]

                return (
                  <Fragment key={e.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <p className="text-gray-900 font-medium">{e.solicitante || "—"}</p>
                        <p className="text-xs text-gray-400">{formatearFechaSoloDia(e.fecha)}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{e.aeronave?.matricula || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatearFechaHoraCompacta(e.hora_despegue_estimada)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{e.nro_orden || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{textoTripulacion(e.tripulacion)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{e.tipo_mision?.codigo || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          title={tooltipEstado}
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            ESTADO_DETALLADO_CLASES[estado.clave] || "bg-gray-100 text-gray-600"
                          } ${tooltipEstado ? "cursor-help" : ""}`}
                        >
                          {estado.texto}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFilaExpandidaId(expandida ? null : e.id)}
                            className="px-3 py-1 rounded-full border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            {expandida ? "Ocultar" : "Ver"}
                          </button>
                          {puedeEditar && (
                            editable ? (
                              <Link
                                href={`/dashboard/escalas/${e.id}/editar`}
                                className="px-3 py-1 rounded-full border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors"
                              >
                                {e.es_borrador ? "Completar" : "Editar"}
                              </Link>
                            ) : (
                              <span
                                title={motivo}
                                className="px-3 py-1 rounded-full border border-gray-200 text-gray-300 text-xs font-medium cursor-not-allowed"
                              >
                                Editar
                              </span>
                            )
                          )}
                          {puedeEliminar && eliminable && (
                            <button
                              onClick={() => handleEliminar(e)}
                              disabled={eliminandoId === e.id}
                              className="px-3 py-1 rounded-full border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {eliminandoId === e.id ? "..." : "Eliminar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandida && (
                      <tr>
                        <td colSpan={8} className="px-4 pb-4 bg-gray-50">
                          {/* Acá SÍ se pasa el permiso real — este es el único
                              lugar del sistema donde "Ver" también puede
                              mostrar "Abortar escala" si corresponde. */}
                          <PanelDetalleEscala
                            escala={e}
                            puedeEditar={puedeEditar}
                            onCerrar={() => setFilaExpandidaId(null)}
                            onActualizada={cargarEscalas}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">{filtradas.length} de {escalas.length} escalas</p>
          </div>
        </div>
      )}
    </div>
  )
}