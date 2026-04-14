"use client"

import { useState } from "react"
import TiposMisionesForm from "./TiposMisionesForm"

export default function TiposMisionesTable({ tiposMisiones: datosIniciales, permisos }) {

  const [tiposMisiones, setTiposMisiones] = useState(datosIniciales)
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS")
  const [busqueda, setBusqueda] = useState("")
  const [modalAbierto, setModalAbierto] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  const tiposFiltrados = tiposMisiones.filter((tipo) => {
    const pasaCategoria =
      filtroCategoria === "TODOS" || tipo.categoria === filtroCategoria

    const textoBusqueda = busqueda.toLowerCase()
    const pasaBusqueda =
      busqueda === "" ||
      tipo.codigo.toLowerCase().includes(textoBusqueda) ||
      tipo.nombre.toLowerCase().includes(textoBusqueda)

    return pasaCategoria && pasaBusqueda
  })

  const handleNuevo = () => {
    setTipoSeleccionado(null)
    setModalAbierto(true)
  }

  const handleEditar = (tipo) => {
    setTipoSeleccionado(tipo)
    setModalAbierto(true)
  }

  const handleCerrar = () => {
    setModalAbierto(false)
    setTipoSeleccionado(null)
  }

  const handleGuardado = async () => {
    handleCerrar()
    await recargarDatos()
  }

  const recargarDatos = async () => {
    const respuesta = await fetch("/api/tipos-misiones")
    const datos = await respuesta.json()
    setTiposMisiones(datos)
  }

  const handleEliminar = async (id) => {
    const confirmar = window.confirm(
      "¿Estás segura de que querés desactivar este tipo de misión?"
    )
    if (!confirmar) return

    setEliminando(id)
    await fetch(`/api/tipos-misiones/${id}`, { method: "DELETE" })
    await recargarDatos()
    setEliminando(null)
  }

  return (
    <div className="p-8">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tipos de Misiones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de tipos de misiones del GTAP
          </p>
        </div>
        {permisos?.puede_crear && (
          <button
            onClick={handleNuevo}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nuevo tipo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por código o nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODOS">Todas las categorías</option>
          <option value="MILITAR">Militar</option>
          <option value="INSTITUCIONAL">Institucional</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tiposFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No hay tipos de misiones registrados
                </td>
              </tr>
            ) : (
              tiposFiltrados.map((tipo) => (
                <tr key={tipo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">
                    {tipo.codigo}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {tipo.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tipo.categoria === "MILITAR"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {tipo.categoria === "MILITAR" ? "Militar" : "Institucional"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {tipo.descripcion || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {permisos?.puede_editar && (
                        <button
                          onClick={() => handleEditar(tipo)}
                          className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      {permisos?.puede_eliminar && (
                        <button
                          onClick={() => handleEliminar(tipo.id)}
                          disabled={eliminando === tipo.id}
                          className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {eliminando === tipo.id ? "..." : "Desactivar"}
                        </button>
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

        {/* Contador */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {tiposFiltrados.length} de {tiposMisiones.length} tipos registrados
          </p>
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <TiposMisionesForm
          tipoMision={tipoSeleccionado}
          onGuardado={handleGuardado}
          onCerrar={handleCerrar}
        />
      )}

    </div>
  )
}