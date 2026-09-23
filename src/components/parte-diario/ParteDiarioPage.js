"use client"
// src/components/parte-diario/ParteDiarioPage.js

import { useState } from "react"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import AccionIcono from "@/components/shared/AccionIcono"
import { normalizarParaBusqueda as normalizarTexto } from "@/lib/texto"

const ETIQUETAS_ESCUADRON = {
  ESCUADRON_OPERACIONES_AEREAS: "Esc. Operaciones",
  ESCUADRON_MANTENIMIENTO:      "Esc. Mantenimiento",
  ESCUADRON_BASE:               "Esc. Base",
  PLANA_MAYOR:                  "Plana Mayor",
}

function nombreCompleto(p) {
  return `${p.grado} ${p.apellido}, ${p.nombre}`
}

export default function ParteDiarioPage({ novedadesIniciales, personas, permisos }) {

  const [novedades,       setNovedades]       = useState(novedadesIniciales)
  const [modalAbierto,    setModalAbierto]    = useState(false)
  const [novedadEditando, setNovedadEditando] = useState(null)
  const [personaId,       setPersonaId]       = useState("")
  const [textoPersona,    setTextoPersona]    = useState("")   // lo que se ve escrito en el input
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const [observacion,     setObservacion]     = useState("")
  const [cargando,        setCargando]        = useState(false)
  const [error,           setError]           = useState("")
  const [quitando,        setQuitando]        = useState(null)

  const idsConNovedad        = new Set(novedades.map((n) => n.persona_id))
  const personasDisponibles  = personas.filter((p) => !idsConNovedad.has(p.id))
  const personasParaSelector = personas.filter((p) => !idsConNovedad.has(p.id))

  const personasFiltradas = personasParaSelector.filter((p) => {
    const texto = normalizarTexto(textoPersona)
    return (
      textoPersona === "" ||
      normalizarTexto(p.nombre).includes(texto) ||
      normalizarTexto(p.apellido).includes(texto)
    )
  })

  const fechaHoy = new Date().toLocaleDateString("es-PY", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  function handleAbrirCrear() {
    setNovedadEditando(null)
    setPersonaId("")
    setTextoPersona("")
    setObservacion("")
    setError("")
    setModalAbierto(true)
  }

  function handleAbrirEditar(novedad) {
    setNovedadEditando(novedad)
    setPersonaId(novedad.persona_id)
    setObservacion(novedad.observacion || "")
    setError("")
    setModalAbierto(true)
  }

  function handleCerrarModal() {
    setModalAbierto(false)
    setDropdownAbierto(false)
  }

  function handleSeleccionarPersona(p) {
    setPersonaId(p.id)
    setTextoPersona(nombreCompleto(p))
    setDropdownAbierto(false)
  }

  function handleCambiarTexto(valor) {
    setTextoPersona(valor)
    setPersonaId("")       // si sigue escribiendo, la selección anterior queda sin efecto
    setDropdownAbierto(true)
  }

  async function handleGuardar() {
    if (!novedadEditando && !personaId) { setError("Seleccioná una persona de la lista"); return }
    setCargando(true)
    setError("")

    const esEdicion = !!novedadEditando

    const res = await fetch("/api/parte-diario", {
      method:  esEdicion ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(
        esEdicion
          ? { novedadId: novedadEditando.id, observacion }
          : { persona_id: personaId, observacion }
      ),
    })

    const datos = await res.json()

    if (!res.ok) {
      setError(datos.error || "Error al guardar")
      setCargando(false)
      return
    }

    await recargarNovedades()
    handleCerrarModal()
    setCargando(false)
  }

  async function handleQuitarNovedad(novedadId) {
    setQuitando(novedadId)
    await fetch(`/api/parte-diario?novedadId=${novedadId}`, { method: "DELETE" })
    await recargarNovedades()
    setQuitando(null)
  }

  async function recargarNovedades() {
    const res   = await fetch("/api/parte-diario")
    const datos = await res.json()
    setNovedades(datos.novedades)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parte de Novedades</h1>
            <p className="text-sm text-gray-500 mt-1 capitalize">{fechaHoy}</p>
          </div>
          {permisos?.puede_crear && (
            <button
              onClick={handleAbrirCrear}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Agregar novedad
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-8 pb-1">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{personas.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total personal</p>
          </div>
          <div className="w-px h-9 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-green-700">{personasDisponibles.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Disponibles hoy</p>
          </div>
          <div className="w-px h-9 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-red-700">{novedades.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Con novedad</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Novedades registradas hoy
        </h2>
        {novedades.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
            Sin novedades. Todo el personal se considera disponible.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {novedades.map((nov) => (
              <div key={nov.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {nov.persona.grado} {nov.persona.apellido}, {nov.persona.nombre}
                  </p>
                  {nov.observacion && (
                    <p className="text-xs text-gray-500 mt-0.5">{nov.observacion}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium mr-2">
                    No disponible
                  </span>
                  {permisos?.puede_editar && (
                    <AccionIcono
                      icono={Pencil}
                      etiqueta="Editar novedad"
                      onClick={() => handleAbrirEditar(nov)}
                      color="primario"
                    />
                  )}
                  {permisos?.puede_eliminar && (
                    <AccionIcono
                      icono={Trash2}
                      etiqueta="Quitar novedad"
                      onClick={() => handleQuitarNovedad(nov.id)}
                      disabled={quitando === nov.id}
                      color="peligro"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Personal disponible hoy
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {personasDisponibles.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Sin personal disponible.</p>
          ) : (
            personasDisponibles.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {p.grado} {p.apellido}, {p.nombre}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ETIQUETAS_ESCUADRON[p.escuadron] || p.escuadron}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                  Disponible
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCerrarModal}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-800">
                {novedadEditando ? "Editar novedad" : "Agregar novedad"}
              </h3>
              <button onClick={handleCerrarModal}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persona <span className="text-red-500">*</span>
              </label>
              {novedadEditando ? (
                <p className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-700">
                  {novedadEditando.persona.grado} {novedadEditando.persona.apellido}, {novedadEditando.persona.nombre}
                </p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={textoPersona}
                      onChange={(e) => handleCambiarTexto(e.target.value)}
                      onFocus={() => setDropdownAbierto(true)}
                      placeholder="Buscar persona por nombre o apellido..."
                      className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {dropdownAbierto && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {personasFiltradas.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-gray-400 text-center">Sin resultados</p>
                      ) : (
                        personasFiltradas.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => handleSeleccionarPersona(p)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            {nombreCompleto(p)}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observación <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Ej: permiso médico, comisión IBA..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={handleCerrarModal}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={cargando}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {cargando ? "Guardando..." : "Guardar novedad"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}