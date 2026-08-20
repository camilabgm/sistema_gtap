"use client"

import { useState, useEffect, Fragment } from "react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { Eye, Pencil, Trash2, Users, ClipboardCheck, Search, Download, ChevronDown, X } from "lucide-react"
import {
  estadoDetallado,
  ESTADO_DETALLADO_CLASES,
  TOOLTIP_ESTADO_DETALLADO,
  puedeEditarAhora,
  motivoNoEditable,
  formatearFechaHoraCompacta,
} from "@/lib/escalas"
import { formatearFechaSoloDia } from "@/lib/fechaSoloDia"
import PanelDetalleEscala from "./PanelDetalleEscala"
import AbortarEscalaAccion from "./AbortarEscalaAccion"
import AccionIcono from "@/components/shared/AccionIcono"

const ESTADOS_FILTRABLES = [
  { clave: "PENDIENTE", texto: "Programada · Pendiente" },
  { clave: "VENCIDA_SIN_AUTORIZAR", texto: "Vencida · Sin autorizar" },
  { clave: "PROGRAMADA_AUTORIZADA", texto: "Programada · Autorizada" },
  { clave: "EN_DESARROLLO", texto: "En vuelo" },
  { clave: "SIN_REGISTRAR", texto: "Sin registrar" },
  { clave: "CUMPLIDA", texto: "Cumplida" },
  { clave: "ABORTADA", texto: "Abortada" },
  { clave: "BORRADOR", texto: "Borrador" },
]

// Colores de los puntos de la barra de contadores — mismos matices que
// ya usa ESTADO_DETALLADO_CLASES, solo que acá se necesita el hex del
// punto sólido, no la clase de fondo pastel.
const COLOR_PUNTO_BALDE = {
  PROGRAMADA: "#378ADD",
  EN_DESARROLLO: "#EF9F27",
  CUMPLIDA: "#639922",
  ABORTADA: "#E24B4A",
}

// Agrupa el detalle fino de estadoDetallado() en los 4 baldes que
// muestra la barra de contadores. "Programada" es el balde por
// default — cubre Borrador, Pendiente, Vencida sin autorizar,
// Programada·Autorizada y Sin registrar, o sea todo lo que todavía
// no terminó (ni voló, ni se completó, ni se abortó).
function contarPorBalde(escalas) {
  const contadores = { PROGRAMADA: 0, EN_DESARROLLO: 0, CUMPLIDA: 0, ABORTADA: 0 }
  for (const e of escalas) {
    const clave = estadoDetallado(e).clave
    if (clave === "EN_DESARROLLO") contadores.EN_DESARROLLO++
    else if (clave === "CUMPLIDA") contadores.CUMPLIDA++
    else if (clave === "ABORTADA") contadores.ABORTADA++
    else contadores.PROGRAMADA++
  }
  return contadores
}

function textoTripulacion(tripulacion) {
  if (!tripulacion || tripulacion.length === 0) return "—"
  return tripulacion.map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", ")
}

function textoRuta(itinerarios) {
  const primero = itinerarios?.[0]
  const ultimo = itinerarios?.[itinerarios.length - 1]
  return primero && ultimo ? `${primero.origen} → ${ultimo.destino}` : "—"
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
      `¿Eliminar la escala ${referencia}? Esto también borra su itinerario, tripulación, solicitud, autorizaciones y post-vuelo si tiene. Esta acción no se puede deshacer desde la interfaz.`
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
  const contadores = contarPorBalde(escalas)

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
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

  function descargarPDF() {
    const doc = new jsPDF({ orientation: "landscape" })
    doc.setFontSize(14)
    doc.text("Gestión de Escalas — Sistema GTAP", 14, 15)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Generado: ${new Date().toLocaleString("es-PY")}`, 14, 21)

    // El PDF sigue completo (para el reporte impreso), aunque la tabla
    // en pantalla se recortó a lo esencial — acá sí interesa tener
    // Tripulación y Tipo de misión visibles sin tener que abrir nada.
    autoTable(doc, {
      startY: 26,
      head: [["Solicitante", "Fecha del vuelo", "Aeronave", "Ruta", "Salida", "N. Orden", "Tripulación", "Tipo de misión", "Estado"]],
      body: filtradas.map((e) => [
        e.solicitante || "—",
        formatearFechaSoloDia(e.fecha),
        e.aeronave?.matricula || "—",
        textoRuta(e.itinerarios),
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
    <div className="p-4">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Escalas</h1>
            <p className="text-sm text-gray-500 mt-1">
              Todas las escalas del sistema — ver detalle, editar, eliminar o abortar según corresponda
            </p>
          </div>
          <button
            onClick={descargarPDF}
            disabled={filtradas.length === 0}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 h-9 shrink-0"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </button>
        </div>

        {/* Contadores generales — sobre el total, sin importar filtros */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pb-4 border-b border-gray-100 text-sm">
          {Object.entries({ PROGRAMADA: "Programada", EN_DESARROLLO: "En vuelo", CUMPLIDA: "Completada", ABORTADA: "Abortada" }).map(
            ([clave, etiqueta]) => (
              <span key={clave} className="flex items-center gap-1.5 text-gray-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_PUNTO_BALDE[clave] }} />
                {etiqueta} · {contadores[clave]}
              </span>
            )
          )}
          <span className="text-gray-400">Total {escalas.length}</span>
        </div>

        {/* Buscador con ícono */}
        <div className="relative mt-4 mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por solicitante, N. de orden o tipo de misión"
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtros — agrupados, con separador y misma altura entre todos */}
        <div className="flex flex-wrap items-center gap-4">

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setEstadoAbierto((v) => !v)}
                className={`h-9 flex items-center gap-1.5 px-3 rounded-md border text-sm font-medium transition-colors ${
                  filtroEstados.length > 0
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Estado {filtroEstados.length > 0 && `(${filtroEstados.length})`}
                <ChevronDown className="h-3.5 w-3.5" />
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
              className={`h-9 px-3 rounded-md border text-sm font-medium ${
                filtroAeronave ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-600"
              }`}
            >
              <option value="">Aeronave — todas</option>
              {aeronaveOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block w-px h-7 bg-gray-300" />

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Desde</span>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="h-9 px-2.5 rounded-md border border-gray-300 text-sm"
            />
            <span>Hasta</span>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="h-9 px-2.5 rounded-md border border-gray-300 text-sm"
            />
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="h-9 flex items-center gap-1.5 px-3 rounded-md border border-gray-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
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
         <table className="w-full table-fixed divide-y divide-gray-200">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[26%]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vuelo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salida</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtradas.map((e) => {
                const estado = estadoDetallado(e)
                const editable = puedeEditarAhora(e)
                const motivo = motivoNoEditable(e)
                const expandida = filaExpandidaId === e.id
                const tooltipEstado = TOOLTIP_ESTADO_DETALLADO[estado.clave]
                const abortada = e.estado === "ABORTADA"

                return (
                  <Fragment key={e.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm truncate">
                        <p className="text-gray-900 font-medium truncate">{e.solicitante || "—"}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {formatearFechaSoloDia(e.fecha)}{e.nro_orden ? ` · Orden #${e.nro_orden}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm truncate">
                        <p className="text-gray-900 font-medium truncate">{e.aeronave?.matricula || "Sin aeronave"}</p>
                        <p className="text-xs text-gray-500 truncate">{textoRuta(e.itinerarios)}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatearFechaHoraCompacta(e.hora_despegue_estimada)}</td>
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
                        <div className="flex items-center justify-end gap-3">
                          <div className="flex items-center gap-0.5">
                            <AccionIcono
                              icono={Eye}
                              etiqueta={expandida ? "Ocultar" : "Ver"}
                              onClick={() => setFilaExpandidaId(expandida ? null : e.id)}
                            />

                            {puedeEditar && (
                              editable ? (
                                <AccionIcono
                                  icono={Pencil}
                                  etiqueta={e.es_borrador ? "Completar" : "Editar"}
                                  href={`/dashboard/escalas/${e.id}/editar`}
                                  color="primario"
                                />
                              ) : (
                                <AccionIcono icono={Pencil} etiqueta={motivo || "No editable"} disabled />
                              )
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 border-l border-gray-100 pl-3">
                            <AccionIcono
                              icono={Users}
                              etiqueta={abortada ? "No disponible: la escala fue abortada" : "Manifiesto"}
                              href={abortada ? undefined : `/dashboard/manifiesto?escala=${e.id}`}
                              disabled={abortada}
                            />

                            <AccionIcono
                              icono={ClipboardCheck}
                              etiqueta={abortada ? "No disponible: la escala fue abortada" : "Post-vuelo"}
                              href={abortada ? undefined : `/dashboard/post-vuelo?escala=${e.id}`}
                              disabled={abortada}
                            />
                          </div>

                          <div className="flex items-center gap-0.5 border-l border-gray-100 pl-3">
                            {puedeEditar && <AbortarEscalaAccion escala={e} onAbortada={cargarEscalas} />}

                            {/* Eliminar depende únicamente del permiso
                                ESCALAS.puede_eliminar — sin importar el
                                estado de la escala. */}
                            {puedeEliminar && (
                              <AccionIcono
                                icono={Trash2}
                                etiqueta="Eliminar"
                                onClick={() => handleEliminar(e)}
                                disabled={eliminandoId === e.id}
                                color="peligro"
                              />
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandida && (
                      <tr>
                        <td colSpan={5} className="px-4 pb-4 bg-gray-50">
                          <PanelDetalleEscala
                            escala={e}
                            puedeEditar={puedeEditar}
                            mostrarPostVuelo={true}
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