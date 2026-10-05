"use client"

// src/components/personas/PersonasTable.js
//
// Tabla→tarjetas, mismo patrón que AeronavesTable/TiposMisionesTable/
// HistorialEscalas — acciones extraídas a un componente compartido.
// La tabla de escritorio usa table-fixed con anchos explícitos: el
// texto largo se envuelve DENTRO de su columna en vez de estirarla.
//
// CAMBIO (rama fix/responsive-listados):
//   - Encabezado con el componente compartido EncabezadoPagina (antes
//     título y botón en la misma fila: en celular el botón se salía).
//   - Tabla desde 1024px (antes desde 768px); tarjetas por debajo. En
//     tablet la tabla de 9 columnas no entraba y se superponían
//     encabezados y badges.
//   - Entre 1024 y 1279px, "Especialidades" y "Escuadrón" no tienen
//     columna propia: se muestran en chico debajo del nombre, como el
//     documento. Desde 1280px vuelven a sus columnas. Sin esto, en una
//     notebook de 1024 las 9 columnas quedaban tan angostas que
//     "ESPECIALIDADES" (una sola palabra, no se puede partir) se pisaba
//     con la columna de al lado.
//   - Los anchos pasan del colgroup a cada <th>: con columnas que
//     aparecen y desaparecen según el ancho, un colgroup fijo no sirve.

import { useState } from "react"
import { Plus, Search, Pencil, ShieldCheck, KeyRound, Lock, UserX, UserCheck, Trash2, RotateCcw } from "lucide-react"
import PersonasForm from "./PersonasForm"
import UsuarioModal from "./UsuarioModal"
import PermisosUsuarioModal from "./PermisosUsuarioModal"
import HabilitacionesModal from "./HabilitacionesModal"
import AccionIcono from "@/components/shared/AccionIcono"
import EncabezadoPagina from "@/components/shared/EncabezadoPagina"
import { normalizarParaBusqueda as normalizarTexto } from "@/lib/texto"

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

const CLASE_TH = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"

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

  const puedeVerInactivas = !!permisos?.puede_editar

  const personasFiltradas = personas.filter((p) => {
    const texto = normalizarTexto(busqueda)
    const pasaBusqueda =
      busqueda === "" ||
      normalizarTexto(p.nombre).includes(texto)        ||
      normalizarTexto(p.apellido).includes(texto)      ||
      normalizarTexto(p.nro_documento).includes(texto)
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

  // Mismo criterio de 30 días que badgeVencimiento() en
  // HabilitacionesModal.js, para no tener dos definiciones de "por
  // vencer" dando vueltas por el sistema.
  //
  // Entre las habilitaciones TODAVÍA vigentes, se elige la que vence
  // MÁS PRONTO (no la que vence más lejos) — es lo que determina si hay
  // que preocuparse ya.
  function badgeMedica(persona) {
    const habs = persona.habilitaciones_medicas || []
    const hoy  = new Date()

    const vigentes = habs
      .filter((h) => !h.deleted_at && new Date(h.vence) >= hoy)
      .sort((a, b) => new Date(a.vence) - new Date(b.vence))

    const vigente = vigentes[0]

    if (vigente) {
      const dias = Math.ceil((new Date(vigente.vence) - hoy) / (1000 * 60 * 60 * 24))
      const porVencer = dias <= 30
      const color = porVencer ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
      const icono = porVencer ? "⚠" : "✓"
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
          {icono} {vigente.periodo}/{vigente.anio}
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
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
          {masReciente.periodo}/{masReciente.anio} — vencida
        </span>
      )
    }

    if (persona.hab_anual_habilitada) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700">
          ✓ Anual
        </span>
      )
    }

    return <span className="text-gray-300 text-xs">Sin habilitación</span>
  }

  function badgeOperacional(habilitado) {
    return habilitado
      ? <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-700">✓ Habilitado</span>
      : <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-red-100 text-red-700">✗ No habilitado</span>
  }

  function badgeAcceso(persona) {
    if (!persona.usuario) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-500">Sin acceso</span>
    }
    if (!persona.usuario.activo) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-amber-100 text-amber-700">Acceso desactivado</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-700">✓ Con acceso</span>
  }

  function textoEspecialidades(persona) {
    const lista = persona.especialidades || []
    if (lista.length === 0) return "—"
    return lista.map((e) => ETIQUETAS_ESPECIALIDAD[e] || e).join(", ")
  }

  // Acciones — extraídas para no repetir la lógica de permisos entre
  // la fila de tabla (escritorio) y la tarjeta (celular y tablet).
  function AccionesPersona({ persona }) {
    if (persona.activo === false) {
      return permisos?.puede_editar ? (
        <AccionIcono
          icono={RotateCcw}
          etiqueta="Reactivar"
          onClick={() => handleReactivarPersona(persona)}
          disabled={eliminando === persona.id}
          color="primario"
        />
      ) : null
    }
    return (
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
    )
  }

  return (
    <div className="p-4">
      <EncabezadoPagina
        volverAInicio
        titulo="Personas"
        subtitulo="Personal de la FAP registrado en el sistema"
        acciones={permisos?.puede_crear && (
          <button onClick={handleNuevo}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9">
            <Plus className="h-4 w-4" />
            Nueva persona
          </button>
        )}
      >
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
              <div className="hidden md:block w-px h-7 bg-gray-200" />
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
      </EncabezadoPagina>

      {/* ── Escritorio: tabla, visible desde 1024px. Especialidades y
          Escuadrón tienen columna propia recién desde 1280px. ── */}
      <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className={`${CLASE_TH} w-[13%]`}>Nombre</th>
              <th className={`${CLASE_TH} w-[7%]`}>Grado</th>
              <th className={`${CLASE_TH} w-[12%] hidden xl:table-cell`}>Especialidades</th>
              <th className={`${CLASE_TH} w-[11%] hidden xl:table-cell`}>Escuadrón</th>
              <th className={`${CLASE_TH} w-[13%]`}>Rol en el sistema</th>
              <th className={`${CLASE_TH} w-[11%]`}>Hab. médica</th>
              <th className={`${CLASE_TH} w-[11%]`}>Hab. operacional</th>
              <th className={`${CLASE_TH} w-[10%]`}>Acceso</th>
              <th className={`${CLASE_TH} w-[12%] text-right`}>Acciones</th>
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
                  <td className="px-3 py-3 text-sm">
                    <p className="font-medium text-gray-900">
                      {persona.apellido}, {persona.nombre}
                      {persona.activo === false && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600 align-middle">
                          Inactiva
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{persona.nro_documento}</p>
                    {/* Entre 1024 y 1279px estas dos columnas no existen:
                        se muestran acá, en chico, debajo del nombre. */}
                    <p className="xl:hidden text-xs text-gray-500 mt-0.5">
                      {ETIQUETAS_ESCUADRON[persona.escuadron] || persona.escuadron}
                      {textoEspecialidades(persona) !== "—" && ` · ${textoEspecialidades(persona)}`}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">{persona.grado}</td>
                  <td className="hidden xl:table-cell px-3 py-3 text-sm text-gray-700">{textoEspecialidades(persona)}</td>
                  <td className="hidden xl:table-cell px-3 py-3 text-sm text-gray-700">
                    {ETIQUETAS_ESCUADRON[persona.escuadron] || persona.escuadron}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">
                    {persona.usuario?.rol?.nombre || "—"}
                    {persona.usuario?.rol_secundario && (
                      <span className="block mt-0.5 text-xs font-medium text-purple-600">
                        + {persona.usuario.rol_secundario.nombre}
                        {!persona.usuario.rol_secundario_combina && (
                          <span className="text-gray-400 font-normal"> (reemplaza)</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm">{badgeMedica(persona)}</td>
                  <td className="px-3 py-3 text-sm">{badgeOperacional(persona.nivel_operacional_habilitado)}</td>
                  <td className="px-3 py-3 text-sm">{badgeAcceso(persona)}</td>
                  <td className="px-3 py-3 text-sm">
                    <div className="flex flex-wrap justify-end items-center gap-0.5">
                      <AccionesPersona persona={persona} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {personasFiltradas.length} de {personas.length} personas
            {mostrarInactivas && puedeVerInactivas && " (incluye inactivas)"}
          </p>
        </div>
      </div>

      {/* ── Celular y tablet: tarjetas, ocultas desde 1024px ── */}
      <div className="lg:hidden space-y-2">
        {personasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No se encontraron personas
          </div>
        ) : (
          personasFiltradas.map((persona) => (
            <div
              key={persona.id}
              className={`bg-white rounded-lg border border-gray-200 p-3 ${persona.activo === false ? "opacity-70" : ""}`}
            >
              <p className="text-sm font-medium text-gray-900">
                {persona.apellido}, {persona.nombre}
                {persona.activo === false && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600 align-middle">
                    Inactiva
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">{persona.nro_documento}</p>

              <p className="mt-1.5 text-xs text-gray-600">
                {persona.grado} · {ETIQUETAS_ESCUADRON[persona.escuadron] || persona.escuadron}
              </p>
              {textoEspecialidades(persona) !== "—" && (
                <p className="text-xs text-gray-500">{textoEspecialidades(persona)}</p>
              )}

              <p className="mt-1.5 text-xs text-gray-700">
                {persona.usuario?.rol?.nombre || "Sin rol en el sistema"}
                {persona.usuario?.rol_secundario && (
                  <span className="block text-xs font-medium text-purple-600">
                    + {persona.usuario.rol_secundario.nombre}
                    {!persona.usuario.rol_secundario_combina && (
                      <span className="text-gray-400 font-normal"> (reemplaza)</span>
                    )}
                  </span>
                )}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {badgeMedica(persona)}
                {badgeOperacional(persona.nivel_operacional_habilitado)}
                {badgeAcceso(persona)}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap justify-end items-center gap-1">
                <AccionesPersona persona={persona} />
              </div>
            </div>
          ))
        )}
        <p className="text-xs text-gray-500 text-center py-2">
          {personasFiltradas.length} de {personas.length} personas
          {mostrarInactivas && puedeVerInactivas && " (incluye inactivas)"}
        </p>
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