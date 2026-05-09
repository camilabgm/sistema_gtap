"use client"

import { useState } from "react"
import PersonasForm from "./PersonasForm"
import UsuarioModal from "./UsuarioModal"
import PermisosUsuarioModal from "./PermisosUsuarioModal"

export default function PersonasTable({ personas: datosIniciales, permisos, rolUsuario }) {

  const [personas, setPersonas]             = useState(datosIniciales)
  const [busqueda, setBusqueda]             = useState("")
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("TODAS")
  const [filtroEscuadron, setFiltroEscuadron]       = useState("TODOS")
  const [modalAbierto, setModalAbierto]     = useState(false)
  const [modalUsuario, setModalUsuario]     = useState(false)
  const [personaSeleccionada, setPersonaSeleccionada] = useState(null)
  const [eliminando, setEliminando]         = useState(null)
  const [modalPermisos, setModalPermisos] = useState(false)

  const personasFiltradas = personas.filter((p) => {
    const textoBusqueda = busqueda.toLowerCase()
    const pasaBusqueda  =
      busqueda === "" ||
      p.nombre.toLowerCase().includes(textoBusqueda)   ||
      p.apellido.toLowerCase().includes(textoBusqueda) ||
      p.nro_documento.toLowerCase().includes(textoBusqueda)

    const pasaEspecialidad =
      filtroEspecialidad === "TODAS" || p.especialidad === filtroEspecialidad

    const pasaEscuadron =
      filtroEscuadron === "TODOS" || p.escuadron === filtroEscuadron

    return pasaBusqueda && pasaEspecialidad && pasaEscuadron
  })

  function handleNuevo() {
    setPersonaSeleccionada(null)
    setModalAbierto(true)
  }

  function handleEditar(persona) {
    setPersonaSeleccionada(persona)
    setModalAbierto(true)
  }

  function handleCerrar() {
    setModalAbierto(false)
    setPersonaSeleccionada(null)
  }

  function handleAbrirUsuario(persona) {
    setPersonaSeleccionada(persona)
    setModalUsuario(true)
  }

  function handleCerrarUsuario() {
    setModalUsuario(false)
    setPersonaSeleccionada(null)
  }

  function handleAbrirPermisos(persona) {
  setPersonaSeleccionada(persona)
  setModalPermisos(true)
}

function handleCerrarPermisos() {
  setModalPermisos(false)
  setPersonaSeleccionada(null)
}

async function handleGuardadoPermisos() {
  handleCerrarPermisos()
  await recargarDatos()
}

  async function handleGuardado() {
    handleCerrar()
    await recargarDatos()
  }

  async function handleGuardadoUsuario() {
    handleCerrarUsuario()
    await recargarDatos()
  }

  async function recargarDatos() {
    const respuesta = await fetch("/api/personas")
    const datos     = await respuesta.json()
    setPersonas(datos)
  }

  async function handleEliminar(id) {
    const confirmar = window.confirm(
      "¿Estás segura de que querés desactivar esta persona?"
    )
    if (!confirmar) return

    setEliminando(id)
    await fetch(`/api/personas/${id}`, { method: "DELETE" })
    await recargarDatos()
    setEliminando(null)
  }

  function badgeVencimiento(fecha) {
    if (!fecha) return <span className="text-gray-300 text-xs">—</span>

    const hoy           = new Date()
    const vence         = new Date(fecha)
    const diasRestantes = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))

    let color = "bg-green-100 text-green-700"
    if (diasRestantes < 0)        color = "bg-red-100 text-red-700"
    else if (diasRestantes <= 30) color = "bg-yellow-100 text-yellow-700"

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {vence.toLocaleDateString("es-PY")}
      </span>
    )
  }

  function etiquetaEspecialidad(esp) {
    const etiquetas = {
      PILOTO:           "Piloto",
      COPILOTO:         "Copiloto",
      TECNICO_DE_VUELO: "Téc. de vuelo",
      MECANICO:         "Mecánico",
      ADMINISTRATIVO:   "Administrativo",
      OTRO:             "Otro",
    }
    return etiquetas[esp] || "—"
  }

  function etiquetaEscuadron(esc) {
    const etiquetas = {
      ESCUADRON_OPERACIONES_AEREAS: "Esc. Operaciones",
      ESCUADRON_MATERIAL:           "Esc. Material",
      ESCUADRON_BASE:               "Esc. Base",
      PLANA_MAYOR:                  "Plana Mayor",
    }
    return etiquetas[esc] || esc
  }

  return (
    <div className="p-8">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Personal de la FAP registrado en el sistema
          </p>
        </div>
        {permisos?.puede_crear && (
          <button
            onClick={handleNuevo}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nueva persona
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o documento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODAS">Todas las especialidades</option>
          <option value="PILOTO">Piloto</option>
          <option value="COPILOTO">Copiloto</option>
          <option value="TECNICO_DE_VUELO">Téc. de vuelo</option>
          <option value="MECANICO">Mecánico</option>
          <option value="ADMINISTRATIVO">Administrativo</option>
          <option value="OTRO">Otro</option>
        </select>
        <select
          value={filtroEscuadron}
          onChange={(e) => setFiltroEscuadron(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODOS">Todos los escuadrones</option>
          <option value="ESCUADRON_OPERACIONES_AEREAS">Esc. Operaciones</option>
          <option value="ESCUADRON_MATERIAL">Esc. Material</option>
          <option value="ESCUADRON_BASE">Esc. Base</option>
          <option value="PLANA_MAYOR">Plana Mayor</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escuadrón</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hab. médica</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceso</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {personasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  No se encontraron personas
                </td>
              </tr>
            ) : (
              personasFiltradas.map((persona) => (
                <tr key={persona.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    <p className="font-medium text-gray-900">
                      {persona.apellido}, {persona.nombre}
                    </p>
                    <p className="text-xs text-gray-400">{persona.nro_documento}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {persona.grado}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {etiquetaEspecialidad(persona.especialidad)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {etiquetaEscuadron(persona.escuadron)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {badgeVencimiento(persona.hab_medica_vence)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {persona.usuario ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        ✓ Con acceso
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Sin acceso
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      {permisos?.puede_editar && (
                        <button
                          onClick={() => handleEditar(persona)}
                          className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      {/* El botón de acceso solo lo ve quien puede editar */}
                      {permisos?.puede_editar && (
                        <button
                          onClick={() => handleAbrirUsuario(persona)}
                          className="px-3 py-1 text-xs text-purple-600 border border-purple-200 rounded hover:bg-purple-50 transition-colors"
                        >
                          {persona.usuario ? "Acceso" : "Dar acceso"}
                        </button>
                      )}
                      {rolUsuario === "Comandante" && persona.usuario && (
                        <button
                          onClick={() => handleAbrirPermisos(persona)}
                          className="px-3 py-1 text-xs text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors"
                        >
                          Permisos
                        </button>
                      )}
                      {permisos?.puede_eliminar && (
                        <button
                          onClick={() => handleEliminar(persona.id)}
                          disabled={eliminando === persona.id}
                          className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {eliminando === persona.id ? "..." : "Desactivar"}
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
            {personasFiltradas.length} de {personas.length} personas
          </p>
        </div>
      </div>

      {/* Modal editar/crear persona */}
      {modalAbierto && (
        <PersonasForm
          persona={personaSeleccionada}
          onGuardado={handleGuardado}
          onCerrar={handleCerrar}
        />
      )}

      {/* Modal gestión de acceso */}
      {modalUsuario && personaSeleccionada && (
        <UsuarioModal
          persona={personaSeleccionada}
          onGuardado={handleGuardadoUsuario}
          onCerrar={handleCerrarUsuario}
        />
      )}

      {modalPermisos && personaSeleccionada?.usuario && (
        <PermisosUsuarioModal
          persona={personaSeleccionada}
          onGuardado={handleGuardadoPermisos}
          onCerrar={handleCerrarPermisos}
        />
       )}

    </div>
  )
}