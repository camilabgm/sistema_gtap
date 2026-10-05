"use client"

// src/components/sicem/SicemEventosTable.js
//
// Tabla→tarjetas (8 columnas), mismo patrón que HistorialEscalas/
// PersonasTable — acciones extraídas a un componente compartido. La
// tabla de escritorio usa table-fixed con anchos explícitos, para que
// la columna de Acciones nunca se pierda.
//
// CAMBIO (rama fix/responsive-listados):
//   - Encabezado con el componente compartido EncabezadoPagina. No usa
//     volverAInicio: en celular, SubNavSicem ya trae el "Volver".
//   - Tabla desde 1024px (antes desde 768px); tarjetas por debajo.
//   - Entre 1024 y 1279px, "Componente" y "Lugar" no tienen columna
//     propia: se muestran en chico debajo de la matrícula. Desde 1280px
//     vuelven a sus columnas. Sin esto, en 1024 los encabezados de 8
//     columnas angostas se pisaban entre sí ("AERONAVETIPO",
//     "COMPONENTELUGAR") y los badges de Tipo se salían de su celda.
//   - Los anchos pasan del colgroup a cada <th>: con columnas que
//     aparecen y desaparecen según el ancho, un colgroup fijo no sirve.

import { useState } from "react"
import { Plus, CheckCircle2, Pencil, Trash2, Eye } from "lucide-react"
import SicemEventosForm from "./SicemEventosForm"
import PanelVerEvento from "./PanelVerEvento"
import AccionIcono from "@/components/shared/AccionIcono"
import EncabezadoPagina from "@/components/shared/EncabezadoPagina"
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

const CLASE_TH = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"

function badgeTipo(tipo) {
  const colores = {
    PROGRAMADO: "bg-blue-100 text-blue-700",
    NO_PROGRAMADO: "bg-red-100 text-red-700",
    CALENDARIO: "bg-purple-100 text-purple-700",
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${colores[tipo] || "bg-gray-100 text-gray-500"}`}>
      {ETIQUETAS_TIPO[tipo] || tipo}
    </span>
  )
}

function badgeEstado(cerrado) {
  return cerrado
    ? <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-700">✓ Cerrado</span>
    : <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-amber-100 text-amber-700">● Abierto</span>
}

export default function SicemEventosTable({ eventos: datosIniciales, aeronaves, componentes, permisos }) {

  const [eventos,          setEventos]          = useState(datosIniciales)
  const [filtroAeronave,   setFiltroAeronave]   = useState("TODAS")
  const [filtroEstado,     setFiltroEstado]     = useState("TODOS")
  const [modalAbierto,     setModalAbierto]     = useState(false)
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null)
  const [cerrandoId,       setCerrandoId]       = useState(null)
  const [eliminandoId,     setEliminandoId]     = useState(null)
  const [eventoVer,        setEventoVer]        = useState(null)

  const eventosFiltrados = eventos.filter((ev) => {
    const pasaAeronave = filtroAeronave === "TODAS" || ev.aeronave_id === Number(filtroAeronave)
    const pasaEstado =
      filtroEstado === "TODOS" ||
      (filtroEstado === "ABIERTOS" && !ev.cerrado) ||
      (filtroEstado === "CERRADOS" && ev.cerrado)
    return pasaAeronave && pasaEstado
  })

  function handleNuevo()  { setEventoSeleccionado(null); setModalAbierto(true) }
  function handleEditar(ev) { setEventoSeleccionado(ev); setModalAbierto(true) }
  function handleCerrarModal() { setModalAbierto(false); setEventoSeleccionado(null) }

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

  async function handleEliminarEvento(evento) {
    const avisoReset = evento.es_cambio_componente
      ? " Este evento reseteó un componente — al eliminarlo, ese componente vuelve a las horas que tenía antes del reseteo."
      : ""
    const avisoAeronave = !evento.cerrado
      ? " Si es el único evento abierto de esta aeronave, vuelve a quedar Disponible."
      : ""
    if (!window.confirm(`¿Eliminar este evento de ${evento.aeronave.matricula}? Esto SÍ borra el registro para siempre.${avisoReset}${avisoAeronave}`)) return
    setEliminandoId(evento.id)
    const res = await fetch(`/api/sicem/eventos/${evento.id}`, { method: "DELETE", credentials: "include" })
    if (!res.ok) {
      const datos = await res.json()
      alert(datos.error || "Error al eliminar el evento")
    }
    await recargarDatos()
    setEliminandoId(null)
  }

  // Acciones — extraídas para no repetir la lógica de permisos entre
  // la fila de tabla (escritorio) y la tarjeta (celular y tablet).
  function AccionesEvento({ ev }) {
    return (
      <div className="flex flex-wrap justify-end items-center gap-1 lg:gap-0.5">
        <AccionIcono icono={Eye} etiqueta="Ver" onClick={() => setEventoVer(ev)} />
        {permisos?.puede_editar && (
          <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(ev)} color="primario" />
        )}
        {!ev.cerrado && permisos?.puede_editar && (
          <AccionIcono
            icono={CheckCircle2}
            etiqueta="Cerrar evento"
            onClick={() => handleCerrarEvento(ev)}
            disabled={cerrandoId === ev.id}
          />
        )}
        {permisos?.puede_eliminar && (
          <AccionIcono
            icono={Trash2}
            etiqueta="Eliminar"
            onClick={() => handleEliminarEvento(ev)}
            disabled={eliminandoId === ev.id}
            color="peligro"
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-4">

      <EncabezadoPagina
        titulo="Eventos de mantenimiento"
        subtitulo="Programados, no programados y por calendario — historial completo, nada se oculta al cerrarse"
        acciones={permisos?.puede_crear && (
          <button onClick={handleNuevo}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9">
            <Plus className="h-4 w-4" />
            Nuevo evento
          </button>
        )}
      >
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
      </EncabezadoPagina>

      {/* ── Escritorio: tabla, visible desde 1024px. Componente y Lugar
          tienen columna propia recién desde 1280px. ── */}
      <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className={`${CLASE_TH} w-[10%]`}>Aeronave</th>
              <th className={`${CLASE_TH} w-[12%]`}>Tipo</th>
              <th className={`${CLASE_TH} w-[9%] hidden xl:table-cell`}>Componente</th>
              <th className={`${CLASE_TH} w-[9%] hidden xl:table-cell`}>Lugar</th>
              <th className={`${CLASE_TH} w-[22%]`}>Observación</th>
              <th className={`${CLASE_TH} w-[12%]`}>Abierto el</th>
              <th className={`${CLASE_TH} w-[11%]`}>Estado</th>
              <th className={`${CLASE_TH} w-[15%] text-right`}>Acciones</th>
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
                  <td className="px-3 py-4 text-sm">
                    <p className="font-medium text-gray-900">{ev.aeronave.matricula}</p>
                    {/* Entre 1024 y 1279px estas dos columnas no existen:
                        se muestran acá, en chico, debajo de la matrícula. */}
                    <p className="xl:hidden text-xs text-gray-500 mt-0.5">
                      {ev.componente ? ETIQUETAS_COMPONENTE[ev.componente.tipo] : "Sin componente"}
                      {ev.lugar ? ` · ${ETIQUETAS_LUGAR[ev.lugar]}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-4 text-sm">{badgeTipo(ev.tipo)}</td>
                  <td className="hidden xl:table-cell px-3 py-4 text-sm text-gray-700">
                    {ev.componente ? ETIQUETAS_COMPONENTE[ev.componente.tipo] : "—"}
                  </td>
                  <td className="hidden xl:table-cell px-3 py-4 text-sm text-gray-700">{ev.lugar ? ETIQUETAS_LUGAR[ev.lugar] : "—"}</td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    <span className="block truncate" title={ev.observacion || ""}>
                      {ev.observacion || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">{formatearFechaHoraCompacta(ev.created_at)}</td>
                  <td className="px-3 py-4 text-sm">{badgeEstado(ev.cerrado)}</td>
                  <td className="px-3 py-4 text-sm">
                    <AccionesEvento ev={ev} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">{eventosFiltrados.length} de {eventos.length} eventos</p>
        </div>
      </div>

      {/* ── Celular y tablet: tarjetas, ocultas desde 1024px ── */}
      <div className="lg:hidden space-y-2">
        {eventosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No se encontraron eventos
          </div>
        ) : (
          eventosFiltrados.map((ev) => (
            <div key={ev.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{ev.aeronave.matricula}</p>
                  <p className="text-xs text-gray-500">
                    {ev.componente ? ETIQUETAS_COMPONENTE[ev.componente.tipo] : "Sin componente"}
                    {ev.lugar ? ` · ${ETIQUETAS_LUGAR[ev.lugar]}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {badgeTipo(ev.tipo)}
                  {badgeEstado(ev.cerrado)}
                </div>
              </div>

              {ev.observacion && (
                <p className="mt-2 text-xs text-gray-600 line-clamp-2">{ev.observacion}</p>
              )}

              <p className="mt-2 text-xs text-gray-400">
                Abierto el {formatearFechaHoraCompacta(ev.created_at)}
              </p>

              <div className="mt-2 pt-2 border-t border-gray-100">
                <AccionesEvento ev={ev} />
              </div>
            </div>
          ))
        )}
        <p className="text-xs text-gray-500 text-center py-2">{eventosFiltrados.length} de {eventos.length} eventos</p>
      </div>

      {modalAbierto && (
        <SicemEventosForm
          evento={eventoSeleccionado}
          aeronaves={aeronaves}
          componentes={componentes}
          onGuardado={handleGuardado}
          onCerrar={handleCerrarModal}
        />
      )}

      {eventoVer && (
        <PanelVerEvento evento={eventoVer} onCerrar={() => setEventoVer(null)} />
      )}
    </div>
  )
}