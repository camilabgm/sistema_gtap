"use client"

import { useState } from "react"
import AeronavesForm from "./AeronavesForm"

export default function AeronavesTable({ aeronaves: datosIniciales }) {

  const [aeronaves, setAeronaves]         = useState(datosIniciales)
  const [busqueda, setBusqueda]           = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS")
  const [filtroEstado, setFiltroEstado]   = useState("TODOS")
  const [modalAbierto, setModalAbierto]   = useState(false)
  const [aeronaveSeleccionada, setAeronaveSeleccionada] = useState(null)
  const [eliminando, setEliminando]       = useState(null)

  // Aplica los tres filtros combinados
  const aeronavesFiltradas = aeronaves.filter((a) => {
    const textoBusqueda = busqueda.toLowerCase()
    const pasaBusqueda  =
      busqueda === "" ||
      a.matricula.toLowerCase().includes(textoBusqueda) ||
      a.tipo.toLowerCase().includes(textoBusqueda)

    const pasaCategoria =
      filtroCategoria === "TODAS" || a.categoria === filtroCategoria

    const pasaEstado =
      filtroEstado === "TODOS" || a.estado === filtroEstado

    return pasaBusqueda && pasaCategoria && pasaEstado
  })

  function handleNuevo() {
    setAeronaveSeleccionada(null)
    setModalAbierto(true)
  }

  function handleEditar(aeronave) {
    setAeronaveSeleccionada(aeronave)
    setModalAbierto(true)
  }

  function handleCerrar() {
    setModalAbierto(false)
    setAeronaveSeleccionada(null)
  }

  async function handleGuardado() {
    handleCerrar()
    await recargarDatos()
  }

  async function recargarDatos() {
    const respuesta = await fetch("/api/aeronaves")
    const datos     = await respuesta.json()
    setAeronaves(datos)
  }

  async function handleEliminar(id) {
    const confirmar = window.confirm(
      "¿Estás segura de que querés desactivar esta aeronave?"
    )
    if (!confirmar) return

    setEliminando(id)
    await fetch(`/api/aeronaves/${id}`, { method: "DELETE" })
    await recargarDatos()
    setEliminando(null)
  }

  return (
    <div className="p-8">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aeronaves</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de aeronaves del GTAP
          </p>
        </div>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nueva aeronave
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por matrícula o tipo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODAS">Todas las categorías</option>
          <option value="PROPIA">Propias</option>
          <option value="INCAUTADA">Incautadas</option>
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="DISPONIBLE">Disponibles</option>
          <option value="NO_DISPONIBLE">No disponibles</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {aeronave.tipo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {aeronave.fabricante}
                  </td>
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      aeronave.estado === "DISPONIBLE"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {aeronave.estado === "DISPONIBLE" ? "Disponible" : "No disponible"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {aeronave.capacidad_pasajeros}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditar(aeronave)}
                        className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(aeronave.id)}
                        disabled={eliminando === aeronave.id}
                        className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {eliminando === aeronave.id ? "..." : "Desactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Contador */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {aeronavesFiltradas.length} de {aeronaves.length} aeronaves
          </p>
        </div>
      </div>

      {/* Modal — solo se muestra cuando modalAbierto es true */}
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