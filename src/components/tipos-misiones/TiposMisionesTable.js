"use client"
// src/components/tipos-misiones/TiposMisionesTable.js

import { useState } from "react"
import TiposMisionesForm from "./TiposMisionesForm"

const ETIQUETAS_CLASIFICACION = {
  OPERACIONAL: { label: "Operacional", color: "bg-blue-100 text-blue-700" },
  TIPO_VUELO:  { label: "Tipo de Vuelo", color: "bg-purple-100 text-purple-700" },
  LOGISTICA:   { label: "Logística", color: "bg-amber-100 text-amber-700" },
}

export default function TiposMisionesTable({ tiposMisiones: datosIniciales, permisos }) {

  const [tiposMisiones,      setTiposMisiones]      = useState(datosIniciales)
  const [busqueda,           setBusqueda]           = useState("")
  const [filtroClasificacion, setFiltroClasificacion] = useState("TODAS")
  const [modalAbierto,       setModalAbierto]       = useState(false)
  const [tipoSeleccionado,   setTipoSeleccionado]   = useState(null)
  const [eliminando,         setEliminando]         = useState(null)

  const tiposFiltrados = tiposMisiones.filter((t) => {
    const texto = busqueda.toLowerCase()
    const pasaBusqueda =
      busqueda === "" ||
      t.codigo.toLowerCase().includes(texto) ||
      t.nombre.toLowerCase().includes(texto)

    const pasaClasificacion =
      filtroClasificacion === "TODAS" || t.clasificacion === filtroClasificacion

    return pasaBusqueda && pasaClasificacion
  })

  function handleNuevo() {
    setTipoSeleccionado(null)
    setModalAbierto(true)
  }

  function handleEditar(tipo) {
    setTipoSeleccionado(tipo)
    setModalAbierto(true)
  }

  function handleCerrar() {
    setModalAbierto(false)
    setTipoSeleccionado(null)
  }

  async function handleGuardado() {
    handleCerrar()
    const res = await fetch("/api/tipos-misiones")
    setTiposMisiones(await res.json())
  }

  async function handleEliminar(id) {
    if (!window.confirm("¿Desactivar este tipo de misión?")) return
    setEliminando(id)
    await fetch(`/api/tipos-misiones/${id}`, { method: "DELETE" })
    const res = await fetch("/api/tipos-misiones")
    setTiposMisiones(await res.json())
    setEliminando(null)
  }

  return (
    <div className="p-8">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tipos de Misión</h1>
          <p className="text-sm text-gray-500 mt-1">
            Catálogo operacional según OG COMFAER 2026
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
          value={filtroClasificacion}
          onChange={(e) => setFiltroClasificacion(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODAS">Todas las clasificaciones</option>
          <option value="OPERACIONAL">Operacional</option>
          <option value="TIPO_VUELO">Tipo de Vuelo</option>
          <option value="LOGISTICA">Logística</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clasificación</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub-tipo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tiposFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No se encontraron tipos de misión
                </td>
              </tr>
            ) : (
              tiposFiltrados.map((tipo) => {
                const clasi = ETIQUETAS_CLASIFICACION[tipo.clasificacion] || { label: tipo.clasificacion, color: "bg-gray-100 text-gray-600" }
                return (
                  <tr key={tipo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-gray-900 text-sm">
                        {tipo.codigo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <p className="font-medium">{tipo.nombre}</p>
                      {tipo.descripcion && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tipo.descripcion}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${clasi.color}`}>
                        {clasi.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tipo.tiene_subtipo
                        ? <span className="text-xs text-purple-600">{tipo.subtipo || "Sí"}</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
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
                )
              })
            )}
          </tbody>
        </table>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {tiposFiltrados.length} de {tiposMisiones.length} tipos
          </p>
        </div>
      </div>

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
