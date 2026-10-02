"use client"
// src/components/aeronaves/AeronavesTable.js
//
// CAMBIO: tabla→tarjetas en mobile, mismo patrón que HistorialEscalas
// — las acciones se extraen a un componente compartido entre las dos
// vistas, para no repetir la lógica de permisos. Se agrega
// BotonVolverInicio arriba, oculto en desktop — Aeronaves es un
// módulo de una sola pantalla, sin sub-menú, así que en mobile no
// tenía ningún camino de vuelta al Dashboard.
//
// CAMBIO (rama fix/accion-icono-mobile): AccionIcono ahora muestra la
// etiqueta como texto en mobile, así que:
//   - Las acciones de disponibilidad pasan a una etiqueta corta, y la
//     explicación larga va en la prop "tooltip" (lo que se sigue
//     viendo al pasar el mouse en escritorio).
//   - La fila de acciones puede saltar de renglón en mobile
//     (flex-wrap). Sin esto, con justify-end, los botones que no
//     entran se empujan hacia la izquierda fuera de la tarjeta, donde
//     no hay scroll — mismo bug que tenía Gestión de Escalas. Desde
//     md vuelve a flex-nowrap, igual que antes.

import { useState } from "react"
import { Plus, Search, Pencil, Trash2, Eye, Ban, CircleCheck } from "lucide-react"
import AeronavesForm from "./AeronavesForm"
import AeronaveDisponibilidadModal from "./AeronaveDisponibilidadModal"
import PanelVerAeronave from "./PanelVerAeronave"
import AccionIcono from "@/components/shared/AccionIcono"
import BotonVolverInicio from "@/components/shared/BotonVolverInicio"

const MOTIVOS = {
  ACCIDENTADA:      "Accidentada",
  EN_MANTENIMIENTO: "En mantenimiento",
  OTRO:             "Otro",
}

function BadgeEstado({ aeronave }) {
  if (aeronave.estado === "DISPONIBLE") {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">
        Disponible
      </span>
    )
  }
  const motivo = aeronave.motivo_no_disponible
  const texto  = motivo === "OTRO"
    ? (aeronave.motivo_otro || "No disponible")
    : (MOTIVOS[motivo] || "No disponible")
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 whitespace-nowrap">
      {texto}
    </span>
  )
}

export default function AeronavesTable({ aeronaves: datosIniciales, permisos }) {

  const [aeronaves,            setAeronaves]            = useState(datosIniciales)
  const [busqueda,             setBusqueda]             = useState("")
  const [filtroCategoria,      setFiltroCategoria]      = useState("TODAS")
  const [filtroEstado,         setFiltroEstado]         = useState("TODOS")
  const [modalAbierto,         setModalAbierto]         = useState(false)
  const [aeronaveSeleccionada, setAeronaveSeleccionada] = useState(null)
  const [modalDisponibilidad,  setModalDisponibilidad]  = useState(null)
  const [aeronaveVer,          setAeronaveVer]          = useState(null)
  const [eliminando,           setEliminando]           = useState(null)
  const [cambiandoDisp,        setCambiandoDisp]        = useState(null)

  const aeronavesFiltradas = aeronaves.filter((a) => {
    const texto = busqueda.toLowerCase()
    const pasaBusqueda =
      busqueda === "" ||
      a.matricula.toLowerCase().includes(texto) ||
      a.tipo.toLowerCase().includes(texto)
    const pasaCategoria =
      filtroCategoria === "TODAS" || a.categoria === filtroCategoria
    const pasaEstado =
      filtroEstado === "TODOS" || a.estado === filtroEstado
    return pasaBusqueda && pasaCategoria && pasaEstado
  })

  function handleNuevo()          { setAeronaveSeleccionada(null);     setModalAbierto(true) }
  function handleEditar(aeronave) { setAeronaveSeleccionada(aeronave); setModalAbierto(true) }
  function handleCerrar()         { setModalAbierto(false);            setAeronaveSeleccionada(null) }

  async function handleGuardado() {
    handleCerrar()
    await recargarDatos()
  }

  async function recargarDatos() {
    const res = await fetch("/api/aeronaves")
    setAeronaves(await res.json())
  }

  async function handleEliminar(id) {
    const confirmar = window.confirm("¿Confirmás desactivar esta aeronave?")
    if (!confirmar) return
    setEliminando(id)
    await fetch(`/api/aeronaves/${id}`, { method: "DELETE" })
    await recargarDatos()
    setEliminando(null)
  }

  async function handleVolverDisponible(aeronave) {
    if (!window.confirm(`¿Volver a marcar ${aeronave.matricula} como Disponible?`)) return
    setCambiandoDisp(aeronave.id)
    const res = await fetch(`/api/aeronaves/${aeronave.id}/disponibilidad`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "DISPONIBLE" }),
    })
    if (!res.ok) {
      const datos = await res.json()
      alert(datos.error || "Error al cambiar la disponibilidad")
    }
    await recargarDatos()
    setCambiandoDisp(null)
  }

  async function handleGuardadoDisponibilidad() {
    setModalDisponibilidad(null)
    await recargarDatos()
  }

  // Acción de disponibilidad — contextual según el estado actual.
  // Bloqueada del todo si SICEM tiene un Evento abierto: ahí la
  // disponibilidad se gestiona desde ese módulo, no desde acá.
  //
  // etiqueta = nombre corto (lo que se lee en mobile).
  // tooltip  = explicación completa (lo que se ve al pasar el mouse
  //            en escritorio, igual que antes).
  function accionDisponibilidad(aeronave) {
    if (aeronave.tiene_evento_abierto) {
      return (
        <AccionIcono
          icono={Ban}
          etiqueta="Disponibilidad"
          tooltip="Gestionado por SICEM — cerrá el evento desde ahí"
          onClick={() => {}}
          disabled
        />
      )
    }
    if (aeronave.estado === "DISPONIBLE") {
      return (
        <AccionIcono
          icono={Ban}
          etiqueta="Marcar no disponible"
          tooltip="Marcar como no disponible (Otro)"
          onClick={() => setModalDisponibilidad(aeronave)}
        />
      )
    }
    return (
      <AccionIcono
        icono={CircleCheck}
        etiqueta="Volver a Disponible"
        onClick={() => handleVolverDisponible(aeronave)}
        disabled={cambiandoDisp === aeronave.id}
        color="primario"
      />
    )
  }

  // Acciones — extraídas para no repetir la lógica de permisos entre
  // la fila de tabla (desktop) y la tarjeta (mobile).
  function AccionesAeronave({ aeronave }) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1 md:flex-nowrap md:gap-0.5">
        <AccionIcono icono={Eye} etiqueta="Ver" onClick={() => setAeronaveVer(aeronave)} />
        {permisos?.puede_editar && (
          <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(aeronave)} color="primario" />
        )}
        {permisos?.puede_editar && accionDisponibilidad(aeronave)}
        {permisos?.puede_eliminar && (
          <AccionIcono
            icono={Trash2}
            etiqueta="Desactivar"
            onClick={() => handleEliminar(aeronave.id)}
            disabled={eliminando === aeronave.id}
            color="peligro"
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="md:hidden mb-2">
        <BotonVolverInicio />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aeronaves</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de aeronaves del GTAP</p>
          </div>
          {permisos?.puede_crear && (
            <button
              onClick={handleNuevo}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Nueva aeronave
            </button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por matrícula o tipo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">Todas las categorías</option>
            <option value="PROPIA">Propias</option>
            <option value="INCAUTADA">Incautadas</option>
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="NO_DISPONIBLE">No disponibles</option>
          </select>
        </div>
      </div>

      {/* ── Desktop: tabla, visible desde 768px ── */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrícula</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fabricante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pasajeros</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {aeronavesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  No se encontraron aeronaves
                </td>
              </tr>
            ) : (
              aeronavesFiltradas.map((aeronave) => (
                <tr key={aeronave.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {aeronave.matricula}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{aeronave.tipo}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{aeronave.fabricante}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      aeronave.categoria === "PROPIA"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {aeronave.categoria === "PROPIA" ? "Propia" : "Incautada"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <BadgeEstado aeronave={aeronave} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {aeronave.capacidad_pasajeros}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <AccionesAeronave aeronave={aeronave} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {aeronavesFiltradas.length} de {aeronaves.length} aeronaves
          </p>
        </div>
      </div>

      {/* ── Mobile: tarjetas, ocultas desde 768px ── */}
      <div className="md:hidden space-y-2">
        {aeronavesFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No se encontraron aeronaves
          </div>
        ) : (
          aeronavesFiltradas.map((aeronave) => (
            <div key={aeronave.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{aeronave.matricula}</p>
                  <p className="text-xs text-gray-500">{aeronave.tipo} · {aeronave.fabricante}</p>
                </div>
                <BadgeEstado aeronave={aeronave} />
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  aeronave.categoria === "PROPIA"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {aeronave.categoria === "PROPIA" ? "Propia" : "Incautada"}
                </span>
                <span>{aeronave.capacidad_pasajeros} pasajeros</span>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100">
                <AccionesAeronave aeronave={aeronave} />
              </div>
            </div>
          ))
        )}
        <p className="text-xs text-gray-500 text-center py-2">
          {aeronavesFiltradas.length} de {aeronaves.length} aeronaves
        </p>
      </div>

      {modalAbierto && (
        <AeronavesForm
          aeronave={aeronaveSeleccionada}
          onGuardado={handleGuardado}
          onCerrar={handleCerrar}
        />
      )}

      {modalDisponibilidad && (
        <AeronaveDisponibilidadModal
          aeronave={modalDisponibilidad}
          onGuardado={handleGuardadoDisponibilidad}
          onCerrar={() => setModalDisponibilidad(null)}
        />
      )}

      {aeronaveVer && (
        <PanelVerAeronave aeronave={aeronaveVer} onCerrar={() => setAeronaveVer(null)} />
      )}

    </div>
  )
}