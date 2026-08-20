"use client"
// src/components/aeronaves/AeronavesTable.js

import { useState } from "react"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import AeronavesForm from "./AeronavesForm"
import AccionIcono from "@/components/shared/AccionIcono"

const MOTIVOS = {
  ACCIDENTADA:      "Accidentada",
  EN_MANTENIMIENTO: "En mantenimiento",
  OTRO:             "Otro",
}

export default function AeronavesTable({ aeronaves: datosIniciales, permisos }) {

  const [aeronaves,            setAeronaves]            = useState(datosIniciales)
  const [busqueda,             setBusqueda]             = useState("")
  const [filtroCategoria,      setFiltroCategoria]      = useState("TODAS")
  const [filtroEstado,         setFiltroEstado]         = useState("TODOS")
  const [modalAbierto,         setModalAbierto]         = useState(false)
  const [aeronaveSeleccionada, setAeronaveSeleccionada] = useState(null)
  const [eliminando,           setEliminando]           = useState(null)

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

  function renderEstado(aeronave) {
    if (aeronave.estado === "DISPONIBLE") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Disponible
        </span>
      )
    }

    const motivo = aeronave.motivo_no_disponible
    const texto  = motivo === "OTRO"
      ? (aeronave.motivo_otro || "No disponible")
      : (MOTIVOS[motivo] || "No disponible")

    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        {texto}
      </span>
    )
  }

  return (
    <div className="p-4">

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

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                    {renderEstado(aeronave)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {aeronave.capacidad_pasajeros}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex justify-end items-center gap-0.5">
                      {permisos?.puede_editar && (
                        <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(aeronave)} color="primario" />
                      )}
                      {permisos?.puede_eliminar && (
                        <AccionIcono
                          icono={Trash2}
                          etiqueta="Desactivar"
                          onClick={() => handleEliminar(aeronave.id)}
                          disabled={eliminando === aeronave.id}
                          color="peligro"
                        />
                      )}
                      {!permisos?.puede_editar && !permisos?.puede_eliminar && (
                        <span className="text-xs text-gray-300">Sin acciones</span>
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
            {aeronavesFiltradas.length} de {aeronaves.length} aeronaves
          </p>
        </div>
      </div>

      {modalAbierto && (
        <AeronavesForm
          aeronave={aeronaveSeleccionada}
          onGuardado={handleGuardado}
          onCerrar={handleCerrar}
        />
      )}

    </div>
  )
}