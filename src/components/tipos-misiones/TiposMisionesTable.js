"use client"
// src/components/tipos-misiones/TiposMisionesTable.js

import { useState } from "react"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import TiposMisionesForm from "./TiposMisionesForm"
import AccionIcono from "@/components/shared/AccionIcono"

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
    <div className="p-4">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Misión</h1>
            <p className="text-sm text-gray-500 mt-1">
              Catálogo operacional según OG COMFAER 2026
            </p>
          </div>
          {permisos?.puede_crear && (
            <button
              onClick={handleNuevo}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Nuevo tipo
            </button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código o nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filtroClasificacion}
          onChange={(e) => setFiltroClasificacion(e.target.value)}
          className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODAS">Todas las clasificaciones</option>
          <option value="OPERACIONAL">Operacional</option>
          <option value="TIPO_VUELO">Tipo de Vuelo</option>
          <option value="LOGISTICA">Logística</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                    <td className="px-6 py-4 text-sm">
                      <div className="flex justify-end items-center gap-0.5">
                        {permisos?.puede_editar && (
                          <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(tipo)} color="primario" />
                        )}
                        {permisos?.puede_eliminar && (
                          <AccionIcono
                            icono={Trash2}
                            etiqueta="Desactivar"
                            onClick={() => handleEliminar(tipo.id)}
                            disabled={eliminando === tipo.id}
                            color="peligro"
                          />
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