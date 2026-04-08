"use client"

import { useState } from "react"
import TiposMisionesForm from "./TiposMisionesForm"

export default function TiposMisionesTable({ tiposMisiones: datosIniciales }) {

  const [tiposMisiones, setTiposMisiones] = useState(datosIniciales)
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS")
  const [busqueda, setBusqueda] = useState("")
  const [modalAbierto, setModalAbierto] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  // Filtra combinando categoría Y búsqueda de texto
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

    const respuesta = await fetch(`/api/tipos-misiones/${id}`, {
      method: "DELETE"
    })

    if (respuesta.ok) {
      await recargarDatos()
    }

    setEliminando(null)
  }

  return (
    <div>

      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Tipos de Misiones
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {tiposFiltrados.length} de {tiposMisiones.length} tipos registrados
          </p>
        </div>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          + Nuevo
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">

        {/* Input de búsqueda */}
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Filtros de categoría */}
        <div className="flex gap-2">
          {["TODOS", "MILITAR", "INSTITUCIONAL"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${filtroCategoria === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }
              `}
            >
              {cat === "TODOS"
                ? "Todos"
                : cat === "MILITAR"
                ? "Militar"
                : "Institucional"}
            </button>
          ))}
        </div>

      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Código
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Nombre
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Categoría
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Descripción
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tiposFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No se encontraron tipos de misiones
                </td>
              </tr>
            ) : (
              tiposFiltrados.map((tipo) => (
                <tr
                  key={tipo.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">
                    {tipo.codigo}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {tipo.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${tipo.categoria === "MILITAR"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                      }
                    `}>
                      {tipo.categoria === "MILITAR" ? "Militar" : "Institucional"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {tipo.descripcion || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditar(tipo)}
                        className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(tipo.id)}
                        disabled={eliminando === tipo.id}
                        className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {eliminando === tipo.id ? "..." : "Desactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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






