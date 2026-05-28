"use client"
// src/components/personas/PersonasTable.js

import { useState } from "react"
import PersonasForm from "./PersonasForm"
import UsuarioModal from "./UsuarioModal"
import PermisosUsuarioModal from "./PermisosUsuarioModal"
import HabilitacionesModal from "./HabilitacionesModal"

const ETIQUETAS_ESCUADRON = {
  ESCUADRON_OPERACIONES_AEREAS: "Esc. Operaciones",
  ESCUADRON_MANTENIMIENTO:      "Esc. Mantenimiento",
  ESCUADRON_BASE:               "Esc. Base",
  PLANA_MAYOR:                  "Plana Mayor",
}

const ETIQUETAS_ESPECIALIDAD = {
  PILOTO:           "Piloto",
  COPILOTO:         "Copiloto",
  TECNICO_DE_VUELO: "Téc. de vuelo",
  MECANICO:         "Mecánico",
  ADMINISTRATIVO:   "Administrativo",
  OTRO:             "Otro",
}

export default function PersonasTable({ personas: datosIniciales, permisos, rolUsuario }) {

  const [personas,              setPersonas]              = useState(datosIniciales)
  const [busqueda,              setBusqueda]              = useState("")
  const [filtroEspecialidad,    setFiltroEspecialidad]    = useState("TODAS")
  const [filtroEscuadron,       setFiltroEscuadron]       = useState("TODOS")
  const [modalAbierto,          setModalAbierto]          = useState(false)
  const [modalUsuario,          setModalUsuario]          = useState(false)
  const [modalHabilitaciones,   setModalHabilitaciones]   = useState(false)
  const [personaSeleccionada,   setPersonaSeleccionada]   = useState(null)
  const [eliminando,            setEliminando]            = useState(null)
  const [modalPermisos,         setModalPermisos]         = useState(false)

  const personasFiltradas = personas.filter((p) => {
    const texto = busqueda.toLowerCase()
    const pasaBusqueda =
      busqueda === "" ||
      p.nombre.toLowerCase().includes(texto)        ||
      p.apellido.toLowerCase().includes(texto)      ||
      p.nro_documento.toLowerCase().includes(texto)
    const pasaEspecialidad =
      filtroEspecialidad === "TODAS" || p.especialidad === filtroEspecialidad
    const pasaEscuadron =
      filtroEscuadron === "TODOS" || p.escuadron === filtroEscuadron
    return pasaBusqueda && pasaEspecialidad && pasaEscuadron
  })

  function handleNuevo()                { setPersonaSeleccionada(null);  setModalAbierto(true) }
  function handleEditar(p)              { setPersonaSeleccionada(p);     setModalAbierto(true) }
  function handleCerrar()               { setModalAbierto(false);        setPersonaSeleccionada(null) }
  function handleAbrirUsuario(p)        { setPersonaSeleccionada(p);     setModalUsuario(true) }
  function handleCerrarUsuario()        { setModalUsuario(false);        setPersonaSeleccionada(null) }
  function handleAbrirPermisos(p)       { setPersonaSeleccionada(p);     setModalPermisos(true) }
  function handleCerrarPermisos()       { setModalPermisos(false);       setPersonaSeleccionada(null) }
  function handleAbrirHabilitaciones(p) { setPersonaSeleccionada(p);     setModalHabilitaciones(true) }
  function handleCerrarHabilitaciones() { setModalHabilitaciones(false); setPersonaSeleccionada(null) }

  async function recargarDatos() {
    const res = await fetch("/api/personas")
    setPersonas(await res.json())
  }

  async function handleGuardado()         { handleCerrar();                await recargarDatos() }
  async function handleGuardadoUsuario()  { handleCerrarUsuario();         await recargarDatos() }
  async function handleGuardadoPermisos() { handleCerrarPermisos();        await recargarDatos() }

  // Al cerrar el modal de habilitaciones recargamos para actualizar los badges
  async function handleCerradoHabilitaciones() {
    handleCerrarHabilitaciones()
    await recargarDatos()
  }

  async function handleEliminar(id) {
    if (!window.confirm("¿Estás segura de que querés desactivar esta persona?")) return
    setEliminando(id)
    await fetch(`/api/personas/${id}`, { method: "DELETE" })
    await recargarDatos()
    setEliminando(null)
  }

  // Badge para la habilitación médica (usa el historial semestral)
  function badgeMedica(persona) {
    const habs = persona.habilitaciones_medicas || []
    const hoy  = new Date()

    // Buscar la habilitación semestral vigente más reciente
    const vigente = habs
      .filter((h) => !h.deleted_at && new Date(h.vence) >= hoy)
      .sort((a, b) => new Date(b.vence) - new Date(a.vence))[0]

    if (vigente) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          ✓ {vigente.periodo}/{vigente.anio}
        </span>
      )
    }

    // Buscar la más reciente aunque esté vencida
    const masReciente = habs
      .filter((h) => !h.deleted_at)
      .sort((a, b) => new Date(b.vence) - new Date(a.vence))[0]

    if (masReciente) {
      const dias = Math.ceil((new Date(masReciente.vence) - hoy) / (1000 * 60 * 60 * 24))
      const color = dias <= 30 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
          {masReciente.periodo}/{masReciente.anio} — vencida
        </span>
      )
    }

    // También puede tener habilitación anual
    if (persona.hab_anual_habilitada) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          ✓ Anual
        </span>
      )
    }

    return <span className="text-gray-300 text-xs">Sin habilitación</span>
  }

  function badgeOperacional(habilitado) {
    return habilitado
      ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Habilitado</span>
      : <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ No habilitado</span>
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personas</h1>
          <p className="text-sm text-gray-500 mt-1">Personal de la FAP registrado en el sistema</p>
        </div>
        {permisos?.puede_crear && (
          <button onClick={handleNuevo}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nueva persona
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <input type="text"
          placeholder="Buscar por nombre, apellido o documento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODAS">Todas las especialidades</option>
          <option value="PILOTO">Piloto</option>
          <option value="COPILOTO">Copiloto</option>
          <option value="TECNICO_DE_VUELO">Téc. de vuelo</option>
          <option value="MECANICO">Mecánico</option>
          <option value="ADMINISTRATIVO">Administrativo</option>
          <option value="OTRO">Otro</option>
        </select>
        <select value={filtroEscuadron}
          onChange={(e) => setFiltroEscuadron(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODOS">Todos los escuadrones</option>
          <option value="ESCUADRON_OPERACIONES_AEREAS">Esc. Operaciones</option>
          <option value="ESCUADRON_MANTENIMIENTO">Esc. Mantenimiento</option>
          <option value="ESCUADRON_BASE">Esc. Base</option>
          <option value="PLANA_MAYOR">Plana Mayor</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escuadrón</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hab. médica</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hab. operacional</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceso</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {personasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">No se encontraron personas</td>
              </tr>
            ) : (
              personasFiltradas.map((persona) => (
                <tr key={persona.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    <p className="font-medium text-gray-900">{persona.apellido}, {persona.nombre}</p>
                    <p className="text-xs text-gray-400">{persona.nro_documento}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{persona.grado}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {ETIQUETAS_ESPECIALIDAD[persona.especialidad] || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {ETIQUETAS_ESCUADRON[persona.escuadron] || persona.escuadron}
                  </td>
                  <td className="px-6 py-4 text-sm">{badgeMedica(persona)}</td>
                  <td className="px-6 py-4 text-sm">{badgeOperacional(persona.nivel_operacional_habilitado)}</td>
                  <td className="px-6 py-4 text-sm">
                    {persona.usuario
                      ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Con acceso</span>
                      : <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Sin acceso</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      {permisos?.puede_editar && (
                        <button onClick={() => handleEditar(persona)}
                          className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors">
                          Editar
                        </button>
                      )}
                      {permisos?.puede_editar && (
                        <button onClick={() => handleAbrirHabilitaciones(persona)}
                          className="px-3 py-1 text-xs text-teal-600 border border-teal-200 rounded hover:bg-teal-50 transition-colors">
                          Habilitaciones
                        </button>
                      )}
                      {permisos?.puede_editar && (
                        <button onClick={() => handleAbrirUsuario(persona)}
                          className="px-3 py-1 text-xs text-purple-600 border border-purple-200 rounded hover:bg-purple-50 transition-colors">
                          {persona.usuario ? "Acceso" : "Dar acceso"}
                        </button>
                      )}
                      {rolUsuario === "Comandante" && persona.usuario && (
                        <button onClick={() => handleAbrirPermisos(persona)}
                          className="px-3 py-1 text-xs text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors">
                          Permisos
                        </button>
                      )}
                      {permisos?.puede_eliminar && (
                        <button onClick={() => handleEliminar(persona.id)}
                          disabled={eliminando === persona.id}
                          className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50">
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
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {personasFiltradas.length} de {personas.length} personas
          </p>
        </div>
      </div>

      {modalAbierto && (
        <PersonasForm persona={personaSeleccionada} onGuardado={handleGuardado} onCerrar={handleCerrar} />
      )}
      {modalHabilitaciones && personaSeleccionada && (
        <HabilitacionesModal persona={personaSeleccionada} onCerrar={handleCerradoHabilitaciones} />
      )}
      {modalUsuario && personaSeleccionada && (
        <UsuarioModal persona={personaSeleccionada} onGuardado={handleGuardadoUsuario} onCerrar={handleCerrarUsuario} />
      )}
      {modalPermisos && personaSeleccionada?.usuario && (
        <PermisosUsuarioModal persona={personaSeleccionada} onGuardado={handleGuardadoPermisos} onCerrar={handleCerrarPermisos} />
      )}
    </div>
  )
}
