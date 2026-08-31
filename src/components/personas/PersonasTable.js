"use client"

import { useState } from "react"
import { Plus, Search, Pencil, ShieldCheck, KeyRound, Lock, UserX, UserCheck, Trash2, RotateCcw } from "lucide-react"
import PersonasForm from "./PersonasForm"
import UsuarioModal from "./UsuarioModal"
import PermisosUsuarioModal from "./PermisosUsuarioModal"
import HabilitacionesModal from "./HabilitacionesModal"
import AccionIcono from "@/components/shared/AccionIcono"

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

export default function PersonasTable({ personas: datosIniciales, permisos, esAdministrador }) {

  const [personas,              setPersonas]              = useState(datosIniciales)
  const [busqueda,              setBusqueda]              = useState("")
  const [filtroEspecialidad,    setFiltroEspecialidad]    = useState("TODAS")
  const [filtroEscuadron,       setFiltroEscuadron]       = useState("TODOS")
  const [mostrarInactivas,      setMostrarInactivas]      = useState(false)
  const [cargandoLista,         setCargandoLista]         = useState(false)
  const [modalAbierto,          setModalAbierto]          = useState(false)
  const [modalUsuario,          setModalUsuario]          = useState(false)
  const [modalHabilitaciones,   setModalHabilitaciones]   = useState(false)
  const [personaSeleccionada,   setPersonaSeleccionada]   = useState(null)
  const [eliminando,            setEliminando]            = useState(null)
  const [modalPermisos,         setModalPermisos]         = useState(false)

  // Puede ver el filtro de inactivas quien puede editar — no tiene
  // sentido mostrarle la lista de inactivas a quien no puede hacer
  // nada con ellas (ni reactivar, ni editar).
  const puedeVerInactivas = !!permisos?.puede_editar

  const personasFiltradas = personas.filter((p) => {
    const texto = busqueda.toLowerCase()
    const pasaBusqueda =
      busqueda === "" ||
      p.nombre.toLowerCase().includes(texto)        ||
      p.apellido.toLowerCase().includes(texto)      ||
      p.nro_documento.toLowerCase().includes(texto)
    const pasaEspecialidad =
      filtroEspecialidad === "TODAS" || (p.especialidades || []).includes(filtroEspecialidad)
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
    setCargandoLista(true)
    const url = mostrarInactivas && puedeVerInactivas
      ? "/api/personas?incluirInactivas=true"
      : "/api/personas"
    const res = await fetch(url, { credentials: "include" })
    setPersonas(await res.json())
    setCargandoLista(false)
  }

  function toggleMostrarInactivas() {
    setMostrarInactivas((prev) => {
      const nuevoValor = !prev
      // Recarga con el valor NUEVO — no el que todavía tiene el estado
      // en este render.
      setCargandoLista(true)
      const url = nuevoValor ? "/api/personas?incluirInactivas=true" : "/api/personas"
      fetch(url, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => { setPersonas(data); setCargandoLista(false) })
      return nuevoValor
    })
  }

  async function handleGuardado()         { handleCerrar();                await recargarDatos() }
  async function handleGuardadoUsuario()  { handleCerrarUsuario();         await recargarDatos() }
  async function handleGuardadoPermisos() { handleCerrarPermisos();        await recargarDatos() }

  async function handleCerradoHabilitaciones() {
    handleCerrarHabilitaciones()
    await recargarDatos()
  }

  async function handleDesactivar(id) {
    if (!window.confirm("¿Estás segura de que querés desactivar esta persona? Si tiene acceso al sistema, también se le desactiva.")) return
    setEliminando(id)
    await fetch(`/api/personas/${id}`, { method: "DELETE", credentials: "include" })
    await recargarDatos()
    setEliminando(null)
  }

  async function handleReactivarPersona(persona) {
    if (!window.confirm(`¿Reactivar a ${persona.apellido}, ${persona.nombre}?`)) return
    setEliminando(persona.id)
    const res = await fetch(`/api/personas/${persona.id}/reactivar`, { method: "PUT", credentials: "include" })
    if (!res.ok) {
      const datos = await res.json()
      alert(datos.error || "Error al reactivar")
    }
    await recargarDatos()
    setEliminando(null)
  }

  async function handleDesactivarUsuario(persona) {
    if (!window.confirm(`¿Desactivar el acceso al sistema de ${persona.apellido}, ${persona.nombre}? La persona sigue activa, solo pierde el login.`)) return
    setEliminando(persona.id)
    await fetch(`/api/usuarios/${persona.usuario.id}`, { method: "DELETE", credentials: "include" })
    await recargarDatos()
    setEliminando(null)
  }

  async function handleReactivarUsuario(persona) {
    if (!window.confirm(`¿Reactivar el acceso al sistema de ${persona.apellido}, ${persona.nombre}?`)) return
    setEliminando(persona.id)
    const res = await fetch(`/api/usuarios/${persona.usuario.id}/reactivar`, { method: "PUT", credentials: "include" })
    if (!res.ok) {
      const datos = await res.json()
      alert(datos.error || "Error al reactivar el acceso")
    }
    await recargarDatos()
    setEliminando(null)
  }

  function badgeMedica(persona) {
    const habs = persona.habilitaciones_medicas || []
    const hoy  = new Date()

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

  // Acceso: distingue tres estados, no dos — con acceso, sin acceso
  // (nunca se le creó Usuario), y acceso desactivado (tiene Usuario,
  // pero está inactivo).
  function badgeAcceso(persona) {
    if (!persona.usuario) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Sin acceso</span>
    }
    if (!persona.usuario.activo) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Acceso desactivado</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Con acceso</span>
  }

  // Varias especialidades por persona: se listan como texto separado por
  // coma. Si es solo una, se ve igual que antes.
  function textoEspecialidades(persona) {
    const lista = persona.especialidades || []
    if (lista.length === 0) return "—"
    return lista.map((e) => ETIQUETAS_ESPECIALIDAD[e] || e).join(", ")
  }

  return (
    <div className="p-4">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Personas</h1>
            <p className="text-sm text-gray-500 mt-1">Personal de la FAP registrado en el sistema</p>
          </div>
          {permisos?.puede_crear && (
            <button onClick={handleNuevo}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9 shrink-0">
              <Plus className="h-4 w-4" />
              Nueva persona
            </button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input type="text"
            placeholder="Buscar por nombre, apellido o documento"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={filtroEspecialidad}
            onChange={(e) => setFiltroEspecialidad(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="TODOS">Todos los escuadrones</option>
            <option value="ESCUADRON_OPERACIONES_AEREAS">Esc. Operaciones</option>
            <option value="ESCUADRON_MANTENIMIENTO">Esc. Mantenimiento</option>
            <option value="ESCUADRON_BASE">Esc. Base</option>
            <option value="PLANA_MAYOR">Plana Mayor</option>
          </select>

          {puedeVerInactivas && (
            <>
              <div className="w-px h-7 bg-gray-200" />
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarInactivas}
                  onChange={toggleMostrarInactivas}
                  disabled={cargandoLista}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Mostrar inactivas
                {cargandoLista && <span className="text-xs text-gray-400">Cargando...</span>}
              </label>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidades</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escuadrón</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol en el sistema</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hab. médica</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hab. operacional</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceso</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {personasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">No se encontraron personas</td>
              </tr>
            ) : (
              personasFiltradas.map((persona) => (
                <tr key={persona.id} className={`transition-colors ${persona.activo === false ? "bg-gray-50 opacity-70" : "hover:bg-gray-50"}`}>
                  <td className="px-6 py-4 text-sm">
                    <p className="font-medium text-gray-900">
                      {persona.apellido}, {persona.nombre}
                      {persona.activo === false && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600 align-middle">
                          Inactiva
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{persona.nro_documento}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{persona.grado}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{textoEspecialidades(persona)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {ETIQUETAS_ESCUADRON[persona.escuadron] || persona.escuadron}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {persona.usuario?.rol?.nombre || "—"}
                    {/* Rol secundario (ej. Supervisor de Semana) — solo
                        aparece si tiene uno activo. "(reemplaza)" avisa
                        cuando rol_secundario_combina es false, para no
                        confundirlo con el caso normal de "suma". */}
                    {persona.usuario?.rol_secundario && (
                      <span className="block mt-0.5 text-xs font-medium text-purple-600">
                        + {persona.usuario.rol_secundario.nombre}
                        {!persona.usuario.rol_secundario_combina && (
                          <span className="text-gray-400 font-normal"> (reemplaza)</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{badgeMedica(persona)}</td>
                  <td className="px-6 py-4 text-sm">{badgeOperacional(persona.nivel_operacional_habilitado)}</td>
                  <td className="px-6 py-4 text-sm">{badgeAcceso(persona)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex justify-end items-center gap-0.5">
                      {persona.activo === false ? (
                        permisos?.puede_editar && (
                          <AccionIcono
                            icono={RotateCcw}
                            etiqueta="Reactivar"
                            onClick={() => handleReactivarPersona(persona)}
                            disabled={eliminando === persona.id}
                            color="primario"
                          />
                        )
                      ) : (
                        <>
                          {permisos?.puede_editar && (
                            <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(persona)} color="primario" />
                          )}
                          {permisos?.puede_editar && (
                            <AccionIcono icono={ShieldCheck} etiqueta="Habilitaciones" onClick={() => handleAbrirHabilitaciones(persona)} />
                          )}
                          {permisos?.puede_editar && (
                            <AccionIcono
                              icono={KeyRound}
                              etiqueta={persona.usuario ? "Acceso" : "Dar acceso"}
                              onClick={() => handleAbrirUsuario(persona)}
                            />
                          )}
                          {esAdministrador && persona.usuario && (
                            <AccionIcono icono={Lock} etiqueta="Permisos" onClick={() => handleAbrirPermisos(persona)} />
                          )}
                          {permisos?.puede_editar && persona.usuario && (
                            persona.usuario.activo ? (
                              <AccionIcono
                                icono={UserX}
                                etiqueta="Quitar acceso"
                                onClick={() => handleDesactivarUsuario(persona)}
                                disabled={eliminando === persona.id}
                              />
                            ) : (
                              <AccionIcono
                                icono={UserCheck}
                                etiqueta="Restaurar acceso"
                                onClick={() => handleReactivarUsuario(persona)}
                                disabled={eliminando === persona.id}
                              />
                            )
                          )}
                          {permisos?.puede_eliminar && (
                            <AccionIcono
                              icono={Trash2}
                              etiqueta="Desactivar"
                              onClick={() => handleDesactivar(persona.id)}
                              disabled={eliminando === persona.id}
                              color="peligro"
                            />
                          )}
                          {!permisos?.puede_editar && !permisos?.puede_eliminar && (
                            <span className="text-xs text-gray-300">Sin acciones</span>
                          )}
                        </>
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
            {mostrarInactivas && puedeVerInactivas && " (incluye inactivas)"}
          </p>
        </div>
      </div>

      {modalAbierto && (
        <PersonasForm persona={personaSeleccionada} onGuardado={handleGuardado} onCerrar={handleCerrar} />
      )}
      {modalHabilitaciones && personaSeleccionada && (
        <HabilitacionesModal
          persona={personaSeleccionada}
          onCerrar={handleCerradoHabilitaciones}
          esAdministrador={esAdministrador}
        />
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