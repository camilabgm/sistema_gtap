"use client"

import { useState } from "react"
import { Plus, CheckCircle2 } from "lucide-react"
import SicemEventosForm from "./SicemEventosForm"
import AccionIcono from "@/components/shared/AccionIcono"
import { formatearFechaHoraCompacta } from "@/lib/escalas"

const ETIQUETAS_TIPO = {
  PROGRAMADO: "Programado",
  NO_PROGRAMADO: "No programado",
  CALENDARIO: "Calendario",
}

const ETIQUETAS_COMPONENTE = {
  MOTOR: "Motor",
  HELICE: "Hélice",
  APU: "APU",
}

const ETIQUETAS_LUGAR = {
  INTERNO: "Interno",
  TERCERIZADO: "Tercerizado",
}

function badgeTipo(tipo) {
  const colores = {
    PROGRAMADO: "bg-blue-100 text-blue-700",
    NO_PROGRAMADO: "bg-red-100 text-red-700",
    CALENDARIO: "bg-purple-100 text-purple-700",
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colores[tipo] || "bg-gray-100 text-gray-500"}`}>
      {ETIQUETAS_TIPO[tipo] || tipo}
    </span>
  )
}

function badgeEstado(cerrado) {
  return cerrado
    ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Cerrado</span>
    : <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">● Abierto</span>
}

export default function SicemEventosTable({ eventos: datosIniciales, aeronaves, componentes, permisos }) {

  const [eventos,          setEventos]          = useState(datosIniciales)
  const [filtroAeronave,   setFiltroAeronave]   = useState("TODAS")
  const [filtroEstado,     setFiltroEstado]     = useState("TODOS")
  const [modalAbierto,     setModalAbierto]     = useState(false)
  const [cerrandoId,       setCerrandoId]       = useState(null)

  const eventosFiltrados = eventos.filter((ev) => {
    const pasaAeronave = filtroAeronave === "TODAS" || ev.aeronave_id === Number(filtroAeronave)
    const pasaEstado =
      filtroEstado === "TODOS" ||
      (filtroEstado === "ABIERTOS" && !ev.cerrado) ||
      (filtroEstado === "CERRADOS" && ev.cerrado)
    return pasaAeronave && pasaEstado
  })

  function handleNuevo()  { setModalAbierto(true) }
  function handleCerrarModal() { setModalAbierto(false) }

  async function recargarDatos() {
    const res = await fetch("/api/sicem/eventos", { credentials: "include" })
    setEventos(await res.json())
  }

  async function handleGuardado() { handleCerrarModal(); await recargarDatos() }

  async function handleCerrarEvento(evento) {
    if (!window.confirm(`¿Cerrar este evento de ${evento.aeronave.matricula}? Si no le queda ningún otro evento abierto, la aeronave vuelve a Disponible.`)) return
    setCerrandoId(evento.id)
    const res = await fetch(`/api/sicem/eventos/${evento.id}/cerrar`, {
      method: "PATCH",
      credentials: "include",
    })
    if (!res.ok) {
      const datos = await res.json()
      alert(datos.error || "Error al cerrar el evento")
    }
    await recargarDatos()
    setCerrandoId(null)
  }

  return (
    <div className="p-4">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Eventos de mantenimiento</h1>
            <p className="text-sm text-gray-500 mt-1">Programados, no programados y por calendario — historial completo, nada se oculta al cerrarse</p>
          </div>
          {permisos?.puede_crear && (
            <button onClick={handleNuevo}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9 shrink-0">
              <Plus className="h-4 w-4" />
              Nuevo evento
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
          <select value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="TODOS">Todos los estados</option>
            <option value="ABIERTOS">Solo abiertos</option>
            <option value="CERRADOS">Solo cerrados</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aeronave</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Componente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lugar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observación</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abierto el</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {eventosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">No se encontraron eventos</td>
              </tr>
            ) : (
              eventosFiltrados.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{ev.aeronave.matricula}</td>
                  <td className="px-6 py-4 text-sm">{badgeTipo(ev.tipo)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {ev.componente ? ETIQUETAS_COMPONENTE[ev.componente.tipo] : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{ev.lugar ? ETIQUETAS_LUGAR[ev.lugar] : "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="block max-w-xs truncate" title={ev.observacion || ""}>
                      {ev.observacion || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatearFechaHoraCompacta(ev.created_at)}</td>
                  <td className="px-6 py-4 text-sm">{badgeEstado(ev.cerrado)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex justify-end items-center gap-0.5">
                      {!ev.cerrado && permisos?.puede_editar && (
                        <AccionIcono
                          icono={CheckCircle2}
                          etiqueta="Cerrar evento"
                          onClick={() => handleCerrarEvento(ev)}
                          disabled={cerrandoId === ev.id}
                          color="primario"
                        />
                      )}
                      {ev.cerrado && <span className="text-xs text-gray-300">Sin acciones</span>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">{eventosFiltrados.length} de {eventos.length} eventos</p>
        </div>
      </div>

      {modalAbierto && (
        <SicemEventosForm
          aeronaves={aeronaves}
          componentes={componentes}
          onGuardado={handleGuardado}
          onCerrar={handleCerrarModal}
        />
      )}
    </div>
  )
}